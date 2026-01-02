import {
  insertCommitment,
  getCommitmentById,
  getCommitmentsByAddress,
  updateCommitmentState,
  insertDispute,
  getDisputeByCommitmentId,
  updateDisputeState,
} from '../db/index.js';
import { transferToEscrow, releaseToContributor, refundToClient } from './mneeService.js';
import { hashMetadata, generateCommitmentId, generateDisputeId } from '../utils/hash.js';
import { DISPUTE_STAKE_PERCENT } from '../config/mnee.js';
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
// Commitment Operations
// ============================================================================

/**
 * Create a new commitment
 * 
 * 1. Hash metadata for integrity
 * 2. Transfer MNEE from client to escrow
 * 3. Persist commitment record
 */
export async function createCommitment(
  input: CreateCommitmentRequest
): Promise<CreateCommitmentResponse> {
  const commitId = generateCommitmentId();
  const metadataHash = input.metadata ? hashMetadata(input.metadata) : null;
  const now = Date.now();

  // Transfer MNEE to escrow
  const { ticketId } = await transferToEscrow(input.amount, input.clientWif);

  // Create commitment record
  const commitment: Commitment = {
    id: commitId,
    clientAddress: input.clientAddress,
    contributorAddress: input.contributorAddress,
    amount: input.amount,
    deliveryDeadline: input.deliveryDeadline,
    releaseAfter: input.deliveryDeadline + input.disputeWindowSeconds * 1000,
    state: 'CREATED',
    metadataHash,
    deliverableHash: null,
    transferTicketId: ticketId,
    createdAt: now,
    deliveredAt: null,
  };

  insertCommitment(commitment);

  console.log(`Commitment created: ${commitId}`);

  return {
    commitId,
    transferTicketId: ticketId,
    metadataHash,
  };
}

/**
 * Mark commitment as delivered
 */
export async function markDelivered(
  input: DeliverRequest
): Promise<DeliverResponse> {
  const commitment = getCommitmentById(input.commitId);

  if (!commitment) {
    throw new Error(`Commitment not found: ${input.commitId}`);
  }

  if (commitment.state !== 'CREATED') {
    throw new Error(`Cannot deliver commitment in state: ${commitment.state}`);
  }

  const now = Date.now();

  updateCommitmentState(
    input.commitId,
    'DELIVERED',
    now,
    input.deliverableHash
  );

  console.log(`Commitment delivered: ${input.commitId}`);

  return {
    success: true,
    deliveredAt: now,
  };
}

/**
 * Get commitment by ID
 */
export function getCommitment(id: string): Commitment | undefined {
  return getCommitmentById(id);
}

/**
 * List commitments by client or contributor address
 */
export function listCommitments(address: string): Commitment[] {
  return getCommitmentsByAddress(address);
}

// ============================================================================
// Dispute Operations
// ============================================================================

/**
 * Open a dispute for a commitment
 * 
 * Rules:
 * - Only the client can dispute
 * - Must be before release_after
 * - Must stake a percentage of the commitment amount
 */
export async function openDispute(
  input: OpenDisputeRequest
): Promise<OpenDisputeResponse> {
  const commitment = getCommitmentById(input.commitId);

  if (!commitment) {
    throw new Error(`Commitment not found: ${input.commitId}`);
  }

  if (commitment.state !== 'DELIVERED') {
    throw new Error(`Cannot dispute commitment in state: ${commitment.state}`);
  }

  if (commitment.clientAddress !== input.clientAddress) {
    throw new Error('Only the client can open a dispute');
  }

  const now = Date.now();
  if (now >= commitment.releaseAfter) {
    throw new Error('Dispute window has closed');
  }

  // Check if dispute already exists
  const existingDispute = getDisputeByCommitmentId(input.commitId);
  if (existingDispute) {
    throw new Error('Dispute already exists for this commitment');
  }

  // Calculate stake amount
  const stakeAmount = (commitment.amount * DISPUTE_STAKE_PERCENT) / 100;

  // Transfer stake to escrow
  const { ticketId } = await transferToEscrow(stakeAmount, input.clientWif);

  // Create dispute record
  const disputeId = generateDisputeId();
  const dispute: Dispute = {
    id: disputeId,
    commitmentId: input.commitId,
    stakeAmount,
    stakeTicketId: ticketId,
    state: 'OPEN',
    reason: input.reason ?? null,
    createdAt: now,
    resolvedAt: null,
  };

  insertDispute(dispute);

  // Update commitment state
  updateCommitmentState(input.commitId, 'DISPUTED');

  console.log(`Dispute opened: ${disputeId} for commitment ${input.commitId}`);

  return {
    disputeId,
    stakeAmount,
    stakeTicketId: ticketId,
  };
}

/**
 * Resolve a dispute
 * 
 * Resolution outcomes:
 * - CLIENT: Refund commitment amount + stake to client
 * - CONTRIBUTOR: Release to contributor, stake goes to protocol
 */
export async function resolveDispute(
  input: ResolveDisputeRequest
): Promise<ResolveDisputeResponse> {
  const commitment = getCommitmentById(input.commitId);
  if (!commitment) {
    throw new Error(`Commitment not found: ${input.commitId}`);
  }

  if (commitment.state !== 'DISPUTED') {
    throw new Error(`Commitment is not in disputed state: ${commitment.state}`);
  }

  const dispute = getDisputeByCommitmentId(input.commitId);
  if (!dispute) {
    throw new Error(`No dispute found for commitment: ${input.commitId}`);
  }

  if (dispute.state !== 'OPEN') {
    throw new Error(`Dispute already resolved: ${dispute.state}`);
  }

  const now = Date.now();
  let ticketId: string | null = null;
  let finalState: Commitment['state'];
  let disputeState: Dispute['state'];

  if (input.resolution === 'CLIENT') {
    // Refund commitment + stake to client
    const totalRefund = commitment.amount + dispute.stakeAmount;
    const result = await refundToClient(totalRefund, commitment.clientAddress);
    ticketId = result.ticketId;
    finalState = 'REFUNDED';
    disputeState = 'RESOLVED_CLIENT';
  } else {
    // Release to contributor (stake stays in escrow as protocol fee)
    const result = await releaseToContributor(commitment.amount, commitment.contributorAddress);
    ticketId = result.ticketId;
    finalState = 'RELEASED';
    disputeState = 'RESOLVED_CONTRIBUTOR';
  }

  // Update records
  updateCommitmentState(input.commitId, finalState);
  updateDisputeState(dispute.id, disputeState, now);

  console.log(`Dispute resolved: ${dispute.id} → ${disputeState}`);

  return {
    success: true,
    finalState,
    transferTicketId: ticketId,
  };
}

/**
 * Get dispute by commitment ID
 */
export function getDispute(commitmentId: string): Dispute | undefined {
  return getDisputeByCommitmentId(commitmentId);
}
