/**
 * Contract Service - Smart Contract Interactions via ethers.js
 */

import { Contract, Wallet, JsonRpcProvider } from 'ethers';
import { CONTRACT_ADDRESS, RPC_URL, RELAYER_PRIVATE_KEY } from '../config/index.js';
import type {
  ServerData,
  CommitmentData,
  DisputeData,
  ServerBalance,
  CommitmentState,
} from '../types/index.js';

// Contract ABI (relevant functions only)
const CONTRACT_ABI = [
  // Server Management
  'function registerServer(uint256 _guildId, uint256 _adminDiscordId) external',
  'function depositToServer(uint256 _guildId, uint256 _amount) external',
  'function withdrawFromServer(uint256 _guildId, address _to, uint256 _amount) external',
  'function getServerBalance(uint256 _guildId) external view returns (uint256 totalDeposited, uint256 totalSpent, uint256 availableBalance)',
  'function servers(uint256) external view returns (uint256 guildId, uint256 adminDiscordId, bool isActive, uint256 registeredAt, uint256 totalDeposited, uint256 totalSpent, uint256 availableBalance)',

  // Commitments
  'function createCommitment(uint256 _guildId, address _contributor, address _token, uint256 _amount, uint256 _deadline, uint256 _disputeWindow, string calldata _specCid) external returns (uint256 commitId)',
  'function submitWork(uint256 _guildId, uint256 _commitId, string calldata _evidenceCid) external',
  'function getCommitment(uint256 _commitId) external view returns (tuple(address creator, address contributor, address token, uint256 amount, uint256 deadline, uint256 disputeWindow, string specCid, string evidenceCid, uint8 state, uint256 createdAt, uint256 submittedAt))',
  'function commitmentCount() external view returns (uint256)',
  'function commitmentToServer(uint256) external view returns (uint256)',

  // Disputes
  'function openDispute(uint256 _guildId, uint256 _commitId) external payable',
  'function getDispute(uint256 _commitId) external view returns (tuple(address disputer, uint256 stakeAmount, uint256 createdAt, bool resolved, bool favorContributor))',
  'function calculateStake(uint256 _commitId) external view returns (uint256)',

  // Settlement
  'function settle(uint256 _commitId) external',
  'function batchSettle(uint256[] calldata _commitIds) external',
  'function canSettle(uint256 _commitId) external view returns (bool)',

  // Protocol Info
  'function registrationFee() external view returns (uint256)',
  'function baseStake() external view returns (uint256)',
  'function arbitrator() external view returns (address)',
  'function mneeToken() external view returns (address)',
  'function MAX_BATCH_SIZE() external view returns (uint256)',
];

// Contract interface for type safety
interface CommitContract {
  registerServer(guildId: string, adminDiscordId: string): Promise<any>;
  depositToServer(guildId: string, amount: string): Promise<any>;
  withdrawFromServer(guildId: string, to: string, amount: string): Promise<any>;
  getServerBalance(guildId: string): Promise<[bigint, bigint, bigint]>;
  servers(guildId: string): Promise<[bigint, bigint, boolean, bigint, bigint, bigint, bigint]>;
  createCommitment(
    guildId: string,
    contributor: string,
    token: string,
    amount: string,
    deadline: number,
    disputeWindow: number,
    specCid: string
  ): Promise<any>;
  submitWork(guildId: string, commitId: number, evidenceCid: string): Promise<any>;
  getCommitment(commitId: number): Promise<{
    creator: string;
    contributor: string;
    token: string;
    amount: bigint;
    deadline: bigint;
    disputeWindow: bigint;
    specCid: string;
    evidenceCid: string;
    state: number;
    createdAt: bigint;
    submittedAt: bigint;
  }>;
  commitmentCount(): Promise<bigint>;
  commitmentToServer(commitId: number): Promise<bigint>;
  openDispute(guildId: string, commitId: number, options?: { value: string }): Promise<any>;
  getDispute(commitId: number): Promise<{
    disputer: string;
    stakeAmount: bigint;
    createdAt: bigint;
    resolved: boolean;
    favorContributor: boolean;
  }>;
  calculateStake(commitId: number): Promise<bigint>;
  settle(commitId: number): Promise<any>;
  batchSettle(commitIds: number[]): Promise<any>;
  canSettle(commitId: number): Promise<boolean>;
  registrationFee(): Promise<bigint>;
  baseStake(): Promise<bigint>;
  arbitrator(): Promise<string>;
  mneeToken(): Promise<string>;
  MAX_BATCH_SIZE(): Promise<bigint>;
}

let provider: JsonRpcProvider | null = null;
let contract: (Contract & CommitContract) | null = null;
let signer: Wallet | null = null;

/**
 * Initialize contract connection
 */
export function initializeContract(): void {
  if (!CONTRACT_ADDRESS || !RPC_URL) {
    console.warn('[Contract] Missing CONTRACT_ADDRESS or RPC_URL - contract operations disabled');
    return;
  }

  provider = new JsonRpcProvider(RPC_URL);
  let baseContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  // Check if RELAYER_PRIVATE_KEY is valid (not a placeholder)
  const isValidPrivateKey = RELAYER_PRIVATE_KEY &&
    /^0x[a-fA-F0-9]{64}$/.test(RELAYER_PRIVATE_KEY);

  if (isValidPrivateKey) {
    try {
      signer = new Wallet(RELAYER_PRIVATE_KEY, provider);
      baseContract = baseContract.connect(signer) as Contract;
      console.log(`[Contract] Connected with relayer: ${signer.address}`);
    } catch (error) {
      console.warn('[Contract] Invalid RELAYER_PRIVATE_KEY - running in read-only mode');
    }
  } else {
    if (RELAYER_PRIVATE_KEY) {
      console.warn('[Contract] RELAYER_PRIVATE_KEY appears invalid - running in read-only mode');
    } else {
      console.log('[Contract] Read-only mode (no relayer key)');
    }
  }

  contract = baseContract as Contract & CommitContract;
  console.log(`[Contract] Initialized at ${CONTRACT_ADDRESS}`);
}

/**
 * Get contract instance (throws if not initialized)
 */
function getContractOrThrow(): Contract & CommitContract {
  if (!contract) {
    throw new Error('Contract not initialized. Call initializeContract() first.');
  }
  return contract;
}

/**
 * Check if contract is configured
 */
export function isContractConfigured(): boolean {
  return Boolean(CONTRACT_ADDRESS && RPC_URL);
}

/**
 * Check if write operations are available
 */
export function canWrite(): boolean {
  return Boolean(signer);
}

// ============================================================================
// Server Management
// ============================================================================

export async function registerServer(guildId: string, adminDiscordId: string): Promise<string> {
  if (!canWrite()) throw new Error('Write operations not available - no relayer key');
  const c = getContractOrThrow();
  const tx = await c.registerServer(guildId, adminDiscordId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function depositToServer(guildId: string, amount: string): Promise<string> {
  if (!canWrite()) throw new Error('Write operations not available - no relayer key');
  const c = getContractOrThrow();
  const tx = await c.depositToServer(guildId, amount);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function withdrawFromServer(guildId: string, to: string, amount: string): Promise<string> {
  if (!canWrite()) throw new Error('Write operations not available - no relayer key');
  const c = getContractOrThrow();
  const tx = await c.withdrawFromServer(guildId, to, amount);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getServerInfo(guildId: string): Promise<ServerData | null> {
  try {
    const c = getContractOrThrow();
    const result = await c.servers(guildId);
    return {
      guildId: result[0].toString(),
      adminDiscordId: result[1].toString(),
      isActive: result[2],
      registeredAt: Number(result[3]),
      totalDeposited: result[4].toString(),
      totalSpent: result[5].toString(),
      availableBalance: result[6].toString(),
    };
  } catch (error) {
    console.error(`[Contract] Error reading server ${guildId}:`, error);
    return null;
  }
}

export async function getServerBalance(guildId: string): Promise<ServerBalance | null> {
  try {
    const c = getContractOrThrow();
    const result = await c.getServerBalance(guildId);
    return {
      totalDeposited: result[0].toString(),
      totalSpent: result[1].toString(),
      availableBalance: result[2].toString(),
    };
  } catch (error) {
    console.error(`[Contract] Error reading balance for ${guildId}:`, error);
    return null;
  }
}

// ============================================================================
// Commitments
// ============================================================================

export async function createCommitment(
  guildId: string,
  contributor: string,
  token: string,
  amount: string,
  deadline: number,
  disputeWindow: number,
  specCid: string
): Promise<{ txHash: string; commitId: number }> {
  if (!canWrite()) throw new Error('Write operations not available - no relayer key');

  const c = getContractOrThrow();
  const tx = await c.createCommitment(
    guildId,
    contributor,
    token,
    amount,
    deadline,
    disputeWindow,
    specCid
  );
  const receipt = await tx.wait();

  // Parse commit ID from event logs
  const commitId = await c.commitmentCount();

  return {
    txHash: receipt.hash,
    commitId: Number(commitId) - 1, // The ID of the just-created commitment
  };
}

export async function submitWork(guildId: string, commitId: number, evidenceCid: string): Promise<string> {
  if (!canWrite()) throw new Error('Write operations not available - no relayer key');
  const c = getContractOrThrow();
  const tx = await c.submitWork(guildId, commitId, evidenceCid);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getCommitment(commitId: number): Promise<CommitmentData> {
  const c = getContractOrThrow();
  const result = await c.getCommitment(commitId);
  return {
    creator: result.creator,
    contributor: result.contributor,
    token: result.token,
    amount: result.amount.toString(),
    deadline: Number(result.deadline),
    disputeWindow: Number(result.disputeWindow),
    specCid: result.specCid,
    evidenceCid: result.evidenceCid,
    state: Number(result.state) as CommitmentState,
    createdAt: Number(result.createdAt),
    submittedAt: Number(result.submittedAt),
  };
}

export async function getCommitmentCount(): Promise<number> {
  try {
    const c = getContractOrThrow();
    const count = await c.commitmentCount();
    return Number(count);
  } catch (error) {
    console.error('[Contract] Error reading commitment count:', error);
    return 0;
  }
}

export async function getCommitmentServerId(commitId: number): Promise<string> {
  const c = getContractOrThrow();
  const guildId = await c.commitmentToServer(commitId);
  return guildId.toString();
}

// ============================================================================
// Disputes
// ============================================================================

export async function openDispute(guildId: string, commitId: number, stakeAmount: string): Promise<string> {
  if (!canWrite()) throw new Error('Write operations not available - no relayer key');
  const c = getContractOrThrow();
  const tx = await c.openDispute(guildId, commitId, { value: stakeAmount });
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getDispute(commitId: number): Promise<DisputeData> {
  const c = getContractOrThrow();
  const result = await c.getDispute(commitId);
  return {
    disputer: result.disputer,
    stakeAmount: result.stakeAmount.toString(),
    createdAt: Number(result.createdAt),
    resolved: result.resolved,
    favorContributor: result.favorContributor,
  };
}

export async function calculateStake(commitId: number): Promise<string> {
  const c = getContractOrThrow();
  const stake = await c.calculateStake(commitId);
  return stake.toString();
}

// ============================================================================
// Settlement
// ============================================================================

export async function settle(commitId: number): Promise<string> {
  if (!canWrite()) throw new Error('Write operations not available - no relayer key');
  const c = getContractOrThrow();
  const tx = await c.settle(commitId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function batchSettle(commitIds: number[]): Promise<string> {
  if (!canWrite()) throw new Error('Write operations not available - no relayer key');
  const c = getContractOrThrow();
  const tx = await c.batchSettle(commitIds);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function canSettleCommitment(commitId: number): Promise<boolean> {
  const c = getContractOrThrow();
  return await c.canSettle(commitId);
}

// ============================================================================
// Protocol Info
// ============================================================================

export async function getRegistrationFee(): Promise<string> {
  const c = getContractOrThrow();
  const fee = await c.registrationFee();
  return fee.toString();
}

export async function getBaseStake(): Promise<string> {
  const c = getContractOrThrow();
  const stake = await c.baseStake();
  return stake.toString();
}

export async function getArbitrator(): Promise<string> {
  const c = getContractOrThrow();
  return await c.arbitrator();
}

export async function getMneeToken(): Promise<string> {
  const c = getContractOrThrow();
  return await c.mneeToken();
}

export async function getMaxBatchSize(): Promise<number> {
  const c = getContractOrThrow();
  const size = await c.MAX_BATCH_SIZE();
  return Number(size);
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get all commitments for a server (by iterating through all commitments)
 */
export async function getCommitmentsByServer(guildId: string): Promise<Array<CommitmentData & { commitId: number }>> {
  const count = await getCommitmentCount();
  const commitments: Array<CommitmentData & { commitId: number }> = [];

  for (let i = 0; i < count; i++) {
    const serverId = await getCommitmentServerId(i);
    if (serverId === guildId) {
      const commitment = await getCommitment(i);
      commitments.push({ ...commitment, commitId: i });
    }
  }

  return commitments;
}

/**
 * Get all commitments for a contributor (by iterating through all commitments)
 */
export async function getCommitmentsByContributor(address: string): Promise<Array<CommitmentData & { commitId: number }>> {
  const count = await getCommitmentCount();
  const commitments: Array<CommitmentData & { commitId: number }> = [];

  for (let i = 0; i < count; i++) {
    const commitment = await getCommitment(i);
    if (commitment.contributor.toLowerCase() === address.toLowerCase()) {
      commitments.push({ ...commitment, commitId: i });
    }
  }

  return commitments;
}

/**
 * Get pending settlements (commitments that can be settled)
 */
export async function getPendingSettlements(): Promise<Array<{ commitId: number; commitment: CommitmentData }>> {
  const count = await getCommitmentCount();
  const pending: Array<{ commitId: number; commitment: CommitmentData }> = [];

  for (let i = 0; i < count; i++) {
    const canSettleNow = await canSettleCommitment(i);
    if (canSettleNow) {
      const commitment = await getCommitment(i);
      pending.push({ commitId: i, commitment });
    }
  }

  return pending;
}
