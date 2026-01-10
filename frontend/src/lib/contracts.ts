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
 * Minimal ABI for Commit Protocol contract
 * Only includes functions used by frontend
 */
export const COMMIT_CONTRACT_ABI = [
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
  // servers(uint256) returns ServerData
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
  // getServerBalance(uint256 _guildId) returns (totalDeposited, totalSpent, availableBalance)
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
  // registrationFee() returns uint256
  {
    name: 'registrationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Standard ERC20 ABI for MNEE token approval
 */
export const ERC20_ABI = [
  // approve(address spender, uint256 amount)
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
  // allowance(address owner, address spender)
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
  // balanceOf(address account)
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
