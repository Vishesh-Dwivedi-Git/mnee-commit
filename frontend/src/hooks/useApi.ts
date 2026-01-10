'use client';

import useSWR from 'swr';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Generic fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch');
  }
  const data = await res.json();
  return data.data;
};

// User info from server API
export interface UserInfo {
  username: string;
  walletAddress: string;
  discordId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch user by wallet address
 * Returns the user's linked discordId if they've registered
 */
export function useUserByWallet(address: string | undefined) {
  const { data, error, isLoading } = useSWR<UserInfo | null>(
    address ? `${API_BASE}/user/wallet/${address}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { user: data, isLoading, error };
}

/**
 * Fetch user by Discord ID
 */
export function useUserByDiscordId(discordId: string | undefined) {
  const { data, error, isLoading } = useSWR<UserInfo | null>(
    discordId ? `${API_BASE}/user/discord/${discordId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { user: data, isLoading, error };
}
