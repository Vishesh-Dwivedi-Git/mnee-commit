/**
 * Contract configuration for Commit Protocol
 * Contains ABIs and addresses for interacting with the smart contract
 */

// Contract addresses (from environment variables)
export const COMMIT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS as `0x${string}`;
export const MNEE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_MNEE_TOKEN_ADDRESS || '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF') as `0x${string}`;

// Registration fee: 15 MNEE (18 decimals)
export const REGISTRATION_FEE = BigInt(15) * BigInt(10 ** 18);

/**
 * Complete ABI for Commit Protocol contract
 * Includes all view functions and events needed for frontend
 */
export const COMMIT_CONTRACT_ABI = [
  // ========== Write Functions ==========
  
  // registerServer(uint256 _guildId, uint256 _adminDiscordId)
  {
    name: 'registerServer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_guildId', type: 'uint256' },
      { name: '_adminDiscordId', type: 'uint256' },
    ],
    outputs: [],
  },
  // depositToServer(uint256 _guildId, uint256 _amount)
  {
    name: 'depositToServer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_guildId', type: 'uint256' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },

  // ========== View Functions ==========
  
  // servers(uint256) - public mapping
  {
    name: 'servers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'guildId', type: 'uint256' },
      { name: 'adminDiscordId', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'totalDeposited', type: 'uint256' },
      { name: 'totalSpent', type: 'uint256' },
      { name: 'availableBalance', type: 'uint256' },
    ],
  },
  // getServerBalance(uint256 _guildId)
  {
    name: 'getServerBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_guildId', type: 'uint256' }],
    outputs: [
      { name: 'totalDeposited', type: 'uint256' },
      { name: 'totalSpent', type: 'uint256' },
      { name: 'availableBalance', type: 'uint256' },
    ],
  },
  // commitments(uint256) - public mapping
  {
    name: 'commitments',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'contributor', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'disputeWindow', type: 'uint256' },
      { name: 'specCid', type: 'string' },
      { name: 'evidenceCid', type: 'string' },
      { name: 'state', type: 'uint8' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'submittedAt', type: 'uint256' },
    ],
  },
  // getCommitment(uint256 _commitId)
  {
    name: 'getCommitment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_commitId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'creator', type: 'address' },
          { name: 'contributor', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'disputeWindow', type: 'uint256' },
          { name: 'specCid', type: 'string' },
          { name: 'evidenceCid', type: 'string' },
          { name: 'state', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'submittedAt', type: 'uint256' },
        ],
      },
    ],
  },
  // getDispute(uint256 _commitId)
  {
    name: 'getDispute',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_commitId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'disputer', type: 'address' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'resolved', type: 'bool' },
          { name: 'favorContributor', type: 'bool' },
        ],
      },
    ],
  },
  // commitmentCount() - public variable
  {
    name: 'commitmentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // commitmentToServer(uint256) - public mapping
  {
    name: 'commitmentToServer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // canSettle(uint256 _commitId)
  {
    name: 'canSettle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_commitId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // registrationFee()
  {
    name: 'registrationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // baseStake()
  {
    name: 'baseStake',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ========== Events ==========
  
  // CommitmentCreated - indexed by commitId, creator, contributor
  {
    type: 'event',
    name: 'CommitmentCreated',
    inputs: [
      { indexed: true, name: 'commitId', type: 'uint256' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: true, name: 'contributor', type: 'address' },
      { indexed: false, name: 'token', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'deadline', type: 'uint256' },
    ],
  },
  // ServerRegistered
  {
    type: 'event',
    name: 'ServerRegistered',
    inputs: [
      { indexed: true, name: 'guildId', type: 'uint256' },
      { indexed: true, name: 'adminDiscordId', type: 'uint256' },
    ],
  },
  // ServerDeposited
  {
    type: 'event',
    name: 'ServerDeposited',
    inputs: [
      { indexed: true, name: 'guildId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'newBalance', type: 'uint256' },
    ],
  },
  // WorkSubmitted
  {
    type: 'event',
    name: 'WorkSubmitted',
    inputs: [
      { indexed: true, name: 'commitId', type: 'uint256' },
      { indexed: false, name: 'evidenceCid', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  // CommitmentSettled
  {
    type: 'event',
    name: 'CommitmentSettled',
    inputs: [
      { indexed: true, name: 'commitId', type: 'uint256' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  // DisputeOpened
  {
    type: 'event',
    name: 'DisputeOpened',
    inputs: [
      { indexed: true, name: 'commitId', type: 'uint256' },
      { indexed: true, name: 'disputer', type: 'address' },
      { indexed: false, name: 'stakeAmount', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
] as const;

// Commitment states enum (matches contract)
export enum CommitmentState {
  FUNDED = 0,
  SUBMITTED = 1,
  APPROVED = 2,
  DISPUTED = 3,
  SETTLED = 4,
  REFUNDED = 5,
  CANCELLED = 6,
}

// State label mapping
export const STATE_LABELS: Record<CommitmentState, string> = {
  [CommitmentState.FUNDED]: 'Funded',
  [CommitmentState.SUBMITTED]: 'Submitted',
  [CommitmentState.APPROVED]: 'Approved',
  [CommitmentState.DISPUTED]: 'Disputed',
  [CommitmentState.SETTLED]: 'Settled',
  [CommitmentState.REFUNDED]: 'Refunded',
  [CommitmentState.CANCELLED]: 'Cancelled',
};

/**
 * Standard ERC20 ABI for MNEE token
 */
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
