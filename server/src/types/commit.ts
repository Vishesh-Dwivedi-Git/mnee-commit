// ============================================================================
// Commitment Types
// ============================================================================

export type CommitmentState =
  | 'CREATED'     // Off-chain record created
  | 'FUNDED'      // On-chain escrow funded
  | 'SUBMITTED'   // Work submitted by contributor
  | 'DISPUTED'    // Dispute opened
  | 'SETTLED'     // Funds released to contributor
  | 'REFUNDED';   // Funds returned to creator

export interface Commitment {
  id: string;
  clientAddress: string;          // Creator address (Ethereum)
  contributorAddress: string;     // Contributor address (Ethereum)
  amount: number;                 // Amount in token's smallest unit
  tokenAddress: string;           // ERC-20 token contract address
  deliveryDeadline: number;       // Unix timestamp
  releaseAfter: number;           // Unix timestamp (deadline + dispute window)
  state: CommitmentState;
  metadataHash: string | null;    // Hash of off-chain metadata
  specCid: string | null;         // IPFS CID for specification
  deliverableHash: string | null; // Hash of submitted work
  evidenceCid: string | null;     // IPFS CID for agent evidence
  onChainCommitId: string | null; // Commit ID from smart contract
  createdAt: number;
  deliveredAt: number | null;
}

// ============================================================================
// Dispute Types
// ============================================================================

export type DisputeState =
  | 'PENDING'             // Created off-chain, awaiting on-chain stake
  | 'OPEN'                // Stake confirmed, dispute active
  | 'RESOLVED_CLIENT'     // Resolved in favor of creator
  | 'RESOLVED_CONTRIBUTOR'; // Resolved in favor of contributor

export interface Dispute {
  id: string;
  commitmentId: string;
  stakeAmount: string;               // Stake in wei (as string for BigInt)
  onChainStakeTicketId: string | null;
  state: DisputeState;
  reason: string | null;
  createdAt: number;
  resolvedAt: number | null;
}

// ============================================================================
// Reputation Types (for dynamic stake calculation)
// ============================================================================

export interface ReputationVector {
  address: string;
  totalValue: number;      // Vtotal: Total USD value settled
  numCommits: number;      // Ncommits: Number of completed commits
  settlementRate: number;  // Srate: Commits / Disputes ratio
  disputesLost: number;    // Dlost: Number of disputes lost
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateCommitmentRequest {
  clientAddress: string;
  contributorAddress: string;
  amount: number;
  tokenAddress?: string;           // ERC-20 token (default: USDC or protocol token)
  deliveryDeadline: number;
  disputeWindowSeconds: number;
  specCid?: string;                // IPFS CID for specification
  metadata?: Record<string, unknown>;
}

export interface CreateCommitmentResponse {
  commitId: string;
  metadataHash: string | null;
  amount: number;
  tokenAddress: string;
  message: string;
}

export interface DeliverRequest {
  commitId: string;
  deliverableHash: string;
  evidenceCid?: string;           // IPFS CID for submitted work evidence
}

export interface DeliverResponse {
  success: boolean;
  deliveredAt: number;
  message?: string;
}

export interface OpenDisputeRequest {
  commitId: string;
  clientAddress: string;
  reason?: string;
}

export interface OpenDisputeResponse {
  disputeId: string;
  stakeAmount: string;
  message: string;
}

export interface ResolveDisputeRequest {
  commitId: string;
  resolution: 'CLIENT' | 'CONTRIBUTOR';
  adminSecret?: string;
}

export interface ResolveDisputeResponse {
  success: boolean;
  finalState: CommitmentState;
  message: string;
}

// ============================================================================
// Contract Event Types
// ============================================================================

export interface ContractEventPayload {
  eventName: 'CommitCreated' | 'WorkSubmitted' | 'DisputeOpened' | 'CommitSettled';
  commitId: string;
  data: Record<string, unknown>;
  blockNumber: number;
  transactionHash: string;
}

// ============================================================================
// Agent Evidence Types
// ============================================================================

export interface AgentEvidence {
  commitId: string;
  agentId: string;
  timestamp: number;
  signature: string;
  analysis: {
    confidenceScore: number;
    passFail: boolean;
    metrics: {
      testCoverage?: number;
      securityIssues?: number;
      specMatch?: 'High' | 'Medium' | 'Low';
    };
  };
  artifacts: Array<{
    type: 'log' | 'diff' | 'screenshot';
    url: string;
    label: string;
  }>;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
