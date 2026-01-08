// ============================================================================
// Commitment Types
// ============================================================================

export type CommitmentState =
  | 'CREATED'
  | 'DELIVERED'
  | 'RELEASED'
  | 'DISPUTED'
  | 'REFUNDED';

export interface Commitment {
  id: string;
  clientAddress: string;
  contributorAddress: string;
  amount: number;
  deliveryDeadline: number;
  releaseAfter: number;
  state: CommitmentState;
  metadataHash: string | null;
  deliverableHash: string | null;
  transferTicketId: string | null;
  createdAt: number;
  deliveredAt: number | null;
}

// ============================================================================
// Dispute Types
// ============================================================================

export type DisputeState =
  | 'OPEN'
  | 'RESOLVED_CLIENT'
  | 'RESOLVED_CONTRIBUTOR';

export interface Dispute {
  id: string;
  commitmentId: string;
  stakeAmount: number;
  stakeTicketId: string | null;
  state: DisputeState;
  reason: string | null;
  createdAt: number;
  resolvedAt: number | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateCommitmentRequest {
  clientAddress: string;
  contributorAddress: string;
  amount: number;
  deliveryDeadline: number;
  disputeWindowSeconds: number;
  metadata?: Record<string, unknown>;
}

export interface FundCommitmentRequest {
  commitId: string;
  confirmerAddress?: string;
  adminSecret?: string;
}

export interface CreateCommitmentResponse {
  commitId: string;
  metadataHash: string | null;
  amount: number;
  escrowAddress: string;
  fundingInstructions: string;
}

export interface FundCommitmentResponse {
  commitId: string;
  transferTicketId: string | null;
  funded: boolean;
}

export interface DeliverRequest {
  commitId: string;
  deliverableHash: string;
}

export interface DeliverResponse {
  success: boolean;
  deliveredAt: number;
}

export interface OpenDisputeRequest {
  commitId: string;
  clientAddress: string;
  reason?: string;
}

export interface FundDisputeRequest {
  disputeId: string;
  commitId: string;
  confirmerAddress?: string;
  adminSecret?: string;
}

export interface OpenDisputeResponse {
  disputeId: string;
  stakeAmount: number;
  escrowAddress: string;
  fundingInstructions: string;
}

export interface FundDisputeResponse {
  disputeId: string;
  stakeTicketId: string | null;
  funded: boolean;
}

export interface ResolveDisputeRequest {
  commitId: string;
  resolution: 'CLIENT' | 'CONTRIBUTOR';
  adminSecret?: string;
}

export interface ResolveDisputeResponse {
  success: boolean;
  finalState: CommitmentState;
  transferTicketId: string | null;
}

// ============================================================================
// MNEE Webhook Types
// ============================================================================

export interface MneeWebhookPayload {
  id: string;
  tx_id: string;
  tx_hex: string;
  action_requested: 'transfer';
  callback_url: string;
  status: 'BROADCASTING' | 'SUCCESS' | 'MINED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  errors: string | null;
}

// ============================================================================
// Funding Confirmation Types
// ============================================================================

export interface ConfirmationRecord {
  id: string;
  userId: string;
  action: 'fund_commitment' | 'fund_dispute';
  targetId: string;
  amount: number;
  createdAt: number;
  expiresAt: number;
  confirmed: boolean;
}

export interface FundingLog {
  id: string;
  action: 'fund_commitment' | 'fund_dispute';
  targetId: string;
  amount: number;
  confirmerAddress: string | null;
  adminOverride: boolean;
  transferTicketId: string | null;
  success: boolean;
  error: string | null;
  timestamp: number;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
