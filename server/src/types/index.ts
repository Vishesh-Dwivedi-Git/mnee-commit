// ============================================================================
// Contract Types - Matching Smart Contract Data Structures
// ============================================================================

/**
 * Commitment states from the smart contract
 * MUST match Commit.sol State enum exactly!
 */
export enum CommitmentState {
    CREATED = 0,    // Commitment created but not funded (not used in current flow)
    FUNDED = 1,     // Tokens locked in escrow, awaiting work
    SUBMITTED = 2,  // Work submitted by contributor
    DISPUTED = 3,   // Dispute opened by creator
    SETTLED = 4,    // Funds released to contributor
    REFUNDED = 5    // Funds returned to creator
}

/**
 * Server data from the contract's `servers` mapping
 */
export interface ServerData {
    guildId: string;
    adminDiscordId: string;
    isActive: boolean;
    registeredAt: number;
    totalDeposited: string;
    totalSpent: string;
    availableBalance: string;
}

/**
 * Commitment data from `getCommitment()`
 */
export interface CommitmentData {
    creator: string;
    contributor: string;
    token: string;
    amount: string;
    deadline: number;
    disputeWindow: number;
    specCid: string;
    evidenceCid: string;
    state: CommitmentState;
    createdAt: number;
    submittedAt: number;
}

/**
 * Dispute data from `getDispute()`
 */
export interface DisputeData {
    disputer: string;
    stakeAmount: string;
    createdAt: number;
    resolved: boolean;
    favorContributor: boolean;
}

/**
 * Server balance from `getServerBalance()`
 */
export interface ServerBalance {
    totalDeposited: string;
    totalSpent: string;
    availableBalance: string;
}

// ============================================================================
// API Request Types
// ============================================================================

// Server Management
export interface RegisterServerRequest {
    guildId: string;
    adminDiscordId: string;
}

export interface DepositRequest {
    amount: string;
}

export interface WithdrawRequest {
    to: string;
    amount: string;
}

// Commitments
export interface CreateCommitmentRequest {
    guildId: string;
    contributor: string;
    token: string;
    amount: string;
    deadline: number;
    disputeWindow: number;
    specCid: string;
}

export interface SubmitWorkRequest {
    guildId: string;
    evidenceCid: string;
}

// Disputes
export interface OpenDisputeRequest {
    guildId: string;
    commitId: number;
    stakeAmount?: string; // Optional: if not provided, calculate from contract
}

// Settlement
export interface BatchSettleRequest {
    commitIds: number[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface TransactionResponse {
    txHash: string;
    message: string;
}

export interface RegisterServerResponse extends TransactionResponse {
    guildId: string;
}

export interface DepositResponse extends TransactionResponse {
    amount: string;
    newBalance: string;
}

export interface WithdrawResponse extends TransactionResponse {
    amount: string;
    to: string;
}

export interface CreateCommitmentResponse extends TransactionResponse {
    commitId: number;
}

export interface SubmitWorkResponse extends TransactionResponse {
    commitId: number;
    evidenceCid: string;
}

export interface OpenDisputeResponse extends TransactionResponse {
    commitId: number;
    stakeAmount: string;
}

export interface BatchSettleResponse {
    settledCount: number;
    txHash: string;
    commitIds: number[];
}

export interface PendingSettlement {
    commitId: number;
    contributor: string;
    amount: string;
    deadline: number;
    disputeWindow: number;
}

export interface ProtocolStats {
    totalCommitments: number;
    contractAddress: string;
    mneeTokenAddress: string;
    registrationFee: string;
    baseStake: string;
    arbitrator: string;
}
