import {
  insertCommitment,
  getCommitmentById,
  getCommitmentsByAddress,
  updateCommitmentState,
  insertDispute,
  getDisputeByCommitmentId,
  updateDisputeState,
} from '../db/index.js';
import { hashMetadata, generateCommitmentId, generateDisputeId } from '../utils/hash.js';
import { DISPUTE_STAKE_BASE, REPUTATION_SCALING_CONSTANT } from '../config/index.js';
import type {
  Commitment,
  Dispute,
  CreateCommitmentRequest,
  CreateCommitmentResponse,
  DeliverRequest,
  DeliverResponse,
  OpenDisputeRequest,
  OpenDisputeResponse,
  ResolveDisputeRequest,
  ResolveDisputeResponse,
} from '../types/commit.js';

// ============================================================================
// Commitment Operations (Orchestrator-side)
// ============================================================================

/**
 * Create a new commitment record
 * 
 * NOTE: This creates the off-chain record. The on-chain commitment
 * is created by the user calling createCommit() on the smart contract.
 * The orchestrator listens for CommitCreated events to sync state.
 */
export async function createCommitment(
  input: CreateCommitmentRequest
): Promise<CreateCommitmentResponse> {
  const commitId = generateCommitmentId();
  const metadataHash = input.metadata ? hashMetadata(input.metadata) : null;
  const now = Date.now();

  // Create commitment record
  const commitment: Commitment = {
    id: commitId,
    clientAddress: input.clientAddress,       // Creator (on-chain)
    contributorAddress: input.contributorAddress,
    amount: input.amount,
    tokenAddress: input.tokenAddress ?? '',   // ERC-20 token address
    deliveryDeadline: input.deliveryDeadline,
    releaseAfter: input.deliveryDeadline + input.disputeWindowSeconds * 1000,
    state: 'CREATED',
    metadataHash,
    specCid: input.specCid ?? null,           // IPFS CID for spec
    deliverableHash: null,
    evidenceCid: null,                        // IPFS CID for evidence
    onChainCommitId: null,                    // Set when synced with contract
    createdAt: now,
    deliveredAt: null,
  };

  await insertCommitment(commitment);

  console.log(`Commitment created: ${commitId}`);

  return {
    commitId,
    metadataHash,
    amount: input.amount,
    tokenAddress: commitment.tokenAddress,
    message: 'Commitment created. User must call createCommit() on smart contract to fund escrow.',
  };
}

/**
 * Submit work for a commitment (mark as delivered)
 * 
 * The contributor calls submitWork() on the smart contract.
 * The orchestrator receives the event and triggers AI verification.
 */
export async function markDelivered(
  input: DeliverRequest
): Promise<DeliverResponse> {
  const commitment = await getCommitmentById(input.commitId);

  if (!commitment) {
    throw new Error(`Commitment not found: ${input.commitId}`);
  }

  if (commitment.state !== 'CREATED' && commitment.state !== 'FUNDED') {
    throw new Error(`Cannot deliver commitment in state: ${commitment.state}`);
  }

  const now = Date.now();

  await updateCommitmentState(
    input.commitId,
    'SUBMITTED',
    now,
    input.deliverableHash
  );

  console.log(`Work submitted: ${input.commitId}`);

  return {
    success: true,
    deliveredAt: now,
    message: 'Work submitted. AI verification will be triggered.',
  };
}

/**
 * Get commitment by ID
 */
export async function getCommitment(id: string): Promise<Commitment | undefined> {
  return await getCommitmentById(id);
}

/**
 * List commitments by client or contributor address
 */
export async function listCommitments(address: string): Promise<Commitment[]> {
  return await getCommitmentsByAddress(address);
}

// ============================================================================
// Dispute Operations
// ============================================================================

/**
 * Calculate required dispute stake using dynamic formula
 * 
 * Sreq = Sbase × Mtime × Mrep × MAI
 */
export function calculateDisputeStake(
  commitment: Commitment,
  timeRemaining: number,  // in days
  reputation: { totalValue: number },
  aiConfidence: number
): bigint {
  // Time multiplier: Mtime = 1 + 0.5 × e^(-λt)
  const lambda = 0.5;
  const Mtime = 1 + 0.5 * Math.exp(-lambda * timeRemaining);

  // Reputation multiplier: Mrep = 1 + log(Vtotal + 1) / K
  const Mrep = 1 + Math.log(reputation.totalValue + 1) / REPUTATION_SCALING_CONSTANT;

  // AI confidence multiplier
  let MAI = 1.0;
  if (aiConfidence >= 0.95) MAI = 2.0;
  else if (aiConfidence >= 0.80) MAI = 1.5;

  const multiplier = Mtime * Mrep * MAI;
  const stake = BigInt(Math.floor(Number(DISPUTE_STAKE_BASE) * multiplier));

  return stake;
}

/**
 * Open a dispute for a commitment
 * 
 * User must call openDispute() on the smart contract with required stake.
 */
export async function openDispute(
  input: OpenDisputeRequest
): Promise<OpenDisputeResponse> {
  const commitment = await getCommitmentById(input.commitId);

  if (!commitment) {
    throw new Error(`Commitment not found: ${input.commitId}`);
  }

  if (commitment.state !== 'SUBMITTED') {
    throw new Error(`Cannot dispute commitment in state: ${commitment.state}`);
  }

  if (commitment.clientAddress !== input.clientAddress) {
    throw new Error('Only the creator can open a dispute');
  }

  const now = Date.now();
  if (now >= commitment.releaseAfter) {
    throw new Error('Dispute window has closed');
  }

  // Check if dispute already exists
  const existingDispute = await getDisputeByCommitmentId(input.commitId);
  if (existingDispute) {
    throw new Error('Dispute already exists for this commitment');
  }

  // Calculate stake (simplified - full formula uses reputation + AI confidence)
  const timeRemainingDays = (commitment.releaseAfter - now) / (24 * 60 * 60 * 1000);
  const stakeAmount = calculateDisputeStake(
    commitment,
    timeRemainingDays,
    { totalValue: 0 },  // TODO: Get from reputation oracle
    0.5                  // TODO: Get from AI agent
  );

  // Create dispute record
  const disputeId = generateDisputeId();
  const dispute: Dispute = {
    id: disputeId,
    commitmentId: input.commitId,
    stakeAmount: stakeAmount.toString(),
    onChainStakeTicketId: null,
    state: 'PENDING',  // Pending until on-chain stake is confirmed
    reason: input.reason ?? null,
    createdAt: now,
    resolvedAt: null,
  };

  await insertDispute(dispute);

  console.log(`Dispute opened: ${disputeId} for commitment ${input.commitId}`);

  return {
    disputeId,
    stakeAmount: stakeAmount.toString(),
    message: `Dispute created. User must call openDispute() on smart contract with ${stakeAmount} wei stake.`,
  };
}

/**
 * Resolve a dispute
 * 
 * Only callable by arbitrator (admin or Kleros court in future)
 */
export async function resolveDispute(
  input: ResolveDisputeRequest
): Promise<ResolveDisputeResponse> {
  const commitment = await getCommitmentById(input.commitId);
  if (!commitment) {
    throw new Error(`Commitment not found: ${input.commitId}`);
  }

  if (commitment.state !== 'DISPUTED') {
    throw new Error(`Commitment is not in disputed state: ${commitment.state}`);
  }

  const dispute = await getDisputeByCommitmentId(input.commitId);
  if (!dispute) {
    throw new Error(`No dispute found for commitment: ${input.commitId}`);
  }

  if (dispute.state !== 'OPEN') {
    throw new Error(`Dispute already resolved: ${dispute.state}`);
  }

  const now = Date.now();
  let finalState: Commitment['state'];
  let disputeState: Dispute['state'];

  if (input.resolution === 'CLIENT') {
    // Creator wins - refund commitment + stake
    finalState = 'REFUNDED';
    disputeState = 'RESOLVED_CLIENT';
  } else {
    // Contributor wins - release payment, stake distributed per protocol
    finalState = 'SETTLED';
    disputeState = 'RESOLVED_CONTRIBUTOR';
  }

  // Update records
  await updateCommitmentState(input.commitId, finalState);
  await updateDisputeState(dispute.id, disputeState, now);

  console.log(`Dispute resolved: ${dispute.id} → ${disputeState}`);

  return {
    success: true,
    finalState,
    message: `Dispute resolved in favor of ${input.resolution}. On-chain settlement will be triggered.`,
  };
}

/**
 * Get dispute by commitment ID
 */
export async function getDispute(commitmentId: string): Promise<Dispute | undefined> {
  return await getDisputeByCommitmentId(commitmentId);
}
