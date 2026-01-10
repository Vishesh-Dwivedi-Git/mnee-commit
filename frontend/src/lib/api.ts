/**
 * API Client for MNEE Commit Protocol Backend
 */

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// Server / DAO Registration
// ============================================================================

export interface ServerInfo {
  guildId: string;
  adminDiscordId: string;
  isActive: boolean;
  totalDeposited: string;
  totalSpent: string;
  availableBalance: string;
}

/**
 * Register a Discord server (requires wallet transaction)
 */
export async function registerServer(
  guildId: string,
  adminDiscordId: string
): Promise<ApiResponse<{ txHash: string; guildId: string }>> {
  return fetchApi('/server/register', {
    method: 'POST',
    body: JSON.stringify({ guildId, adminDiscordId }),
  });
}

/**
 * Get server info and balance
 */
export async function getServerInfo(guildId: string): Promise<ApiResponse<ServerInfo>> {
  return fetchApi(`/server/${guildId}`);
}

/**
 * Deposit MNEE to server balance
 */
export async function depositToServer(
  guildId: string,
  amount: string
): Promise<ApiResponse<{ txHash: string; newBalance: string }>> {
  return fetchApi(`/server/${guildId}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

// ============================================================================
// Commitments
// ============================================================================

export interface Commitment {
  commitId: number;
  creator: string;
  contributor: string;
  amount: string;
  deadline: number;
  state: string;
  specCid: string;
  evidenceCid: string;
}

/**
 * Get commitments for a server
 */
export async function getServerCommitments(
  guildId: string,
  status?: string
): Promise<ApiResponse<{ commitments: Commitment[]; count: number }>> {
  const params = status ? `?status=${status}` : '';
  return fetchApi(`/commit/server/${guildId}${params}`);
}

/**
 * Get commitments for a contributor
 */
export async function getContributorCommitments(
  address: string
): Promise<ApiResponse<{ commitments: Commitment[]; count: number }>> {
  return fetchApi(`/commit/contributor/${address}`);
}

/**
 * Get single commitment
 */
export async function getCommitment(commitId: number): Promise<ApiResponse<Commitment>> {
  return fetchApi(`/commit/${commitId}`);
}

// ============================================================================
// User / Wallet
// ============================================================================

export interface UserInfo {
  username: string;
  walletAddress: string;
  discordId?: string;
}

/**
 * Link wallet to username
 */
export async function linkWallet(
  username: string,
  walletAddress: string,
  discordId?: string
): Promise<ApiResponse<UserInfo>> {
  return fetchApi('/user', {
    method: 'POST',
    body: JSON.stringify({ username, walletAddress, discordId }),
  });
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<ApiResponse<UserInfo>> {
  return fetchApi(`/user/${username}`);
}

/**
 * Get user by wallet
 */
export async function getUserByWallet(address: string): Promise<ApiResponse<UserInfo>> {
  return fetchApi(`/user/wallet/${address}`);
}

// ============================================================================
// Health
// ============================================================================

export async function getHealth(): Promise<ApiResponse<{
  status: string;
  contractConfigured: boolean;
  ipfsConfigured: boolean;
  mongoConnected: boolean;
}>> {
  return fetchApi('/health');
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format MNEE amount (wei to MNEE)
 */
export function formatMNEE(weiAmount: string): string {
  const mnee = parseFloat(weiAmount) / 1e18;
  return mnee.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Parse MNEE amount (MNEE to wei)
 */
export function parseMNEE(mneeAmount: number): string {
  return (BigInt(Math.floor(mneeAmount * 1e6)) * BigInt(1e12)).toString();
}
