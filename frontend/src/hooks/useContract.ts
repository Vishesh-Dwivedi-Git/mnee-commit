'use client';

/**
 * Contract hooks for reading data directly from the Commit Protocol contract
 * Uses direct contract reads - no getLogs (avoids RPC free tier limits)
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { usePublicClient, useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { 
  COMMIT_CONTRACT_ADDRESS, 
  COMMIT_CONTRACT_ABI,
  MNEE_TOKEN_ADDRESS,
  ERC20_ABI,
  CommitmentState,
} from '@/lib/contracts';

// ============================================================================
// Types
// ============================================================================

export interface Commitment {
  id: bigint;
  guildId: bigint;
  creator: `0x${string}`;
  contributor: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  disputeWindow: bigint;
  specCid: string;
  evidenceCid: string;
  state: CommitmentState;
  createdAt: bigint;
  submittedAt: bigint;
}

export interface ServerInfo {
  guildId: bigint;
  adminDiscordId: bigint;
  isActive: boolean;
  registeredAt: bigint;
  totalDeposited: bigint;
  totalSpent: bigint;
  availableBalance: bigint;
}

// ============================================================================
// Commitment Hooks (Scan-based - no getLogs)
// ============================================================================

/**
 * Get all commitments for a contributor by scanning
 * Scans commitmentCount and filters by contributor address
 */
export function useContributorCommitments() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get total commitment count
  const { data: totalCount } = useReadContract({
    address: COMMIT_CONTRACT_ADDRESS,
    abi: COMMIT_CONTRACT_ABI,
    functionName: 'commitmentCount',
    query: { enabled: !!COMMIT_CONTRACT_ADDRESS },
  });

  useEffect(() => {
    if (!publicClient || !address || !totalCount || !COMMIT_CONTRACT_ADDRESS) {
      setCommitments([]);
      return;
    }

    const fetchCommitments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const count = Number(totalCount);
        const results: Commitment[] = [];
        
        // Scan all commitments (this is fine for small counts)
        for (let i = 1; i <= count; i++) {
          const [data, guildId] = await Promise.all([
            publicClient.readContract({
              address: COMMIT_CONTRACT_ADDRESS,
              abi: COMMIT_CONTRACT_ABI,
              functionName: 'commitments',
              args: [BigInt(i)],
            }) as Promise<readonly [
              `0x${string}`, `0x${string}`, `0x${string}`, 
              bigint, bigint, bigint, 
              string, string, 
              number, bigint, bigint
            ]>,
            publicClient.readContract({
              address: COMMIT_CONTRACT_ADDRESS,
              abi: COMMIT_CONTRACT_ABI,
              functionName: 'commitmentToServer',
              args: [BigInt(i)],
            }) as Promise<bigint>,
          ]);

          // Filter by contributor
          if (data[1].toLowerCase() === address.toLowerCase()) {
            results.push({
              id: BigInt(i),
              guildId,
              creator: data[0],
              contributor: data[1],
              token: data[2],
              amount: data[3],
              deadline: data[4],
              disputeWindow: data[5],
              specCid: data[6],
              evidenceCid: data[7],
              state: data[8] as CommitmentState,
              createdAt: data[9],
              submittedAt: data[10],
            });
          }
        }

        setCommitments(results);
      } catch (err) {
        console.error('Failed to fetch commitments:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommitments();
  }, [publicClient, address, totalCount]);

  return { commitments, isLoading, error };
}

/**
 * Get all commitments for a specific server (guild)
 */
export function useServerCommitments(guildId: string | undefined) {
  const publicClient = usePublicClient();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get total commitment count
  const { data: totalCount } = useReadContract({
    address: COMMIT_CONTRACT_ADDRESS,
    abi: COMMIT_CONTRACT_ABI,
    functionName: 'commitmentCount',
    query: { enabled: !!guildId && !!COMMIT_CONTRACT_ADDRESS },
  });

  useEffect(() => {
    if (!publicClient || !guildId || !totalCount || !COMMIT_CONTRACT_ADDRESS) {
      setCommitments([]);
      return;
    }

    const fetchServerCommitments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const guildIdBigInt = BigInt(guildId);
        const count = Number(totalCount);
        const results: Commitment[] = [];
        
        for (let i = 1; i <= count; i++) {
          const commitGuildId = await publicClient.readContract({
            address: COMMIT_CONTRACT_ADDRESS,
            abi: COMMIT_CONTRACT_ABI,
            functionName: 'commitmentToServer',
            args: [BigInt(i)],
          }) as bigint;

          if (commitGuildId === guildIdBigInt) {
            const data = await publicClient.readContract({
              address: COMMIT_CONTRACT_ADDRESS,
              abi: COMMIT_CONTRACT_ABI,
              functionName: 'commitments',
              args: [BigInt(i)],
            }) as readonly [
              `0x${string}`, `0x${string}`, `0x${string}`, 
              bigint, bigint, bigint, 
              string, string, 
              number, bigint, bigint
            ];

            results.push({
              id: BigInt(i),
              guildId: commitGuildId,
              creator: data[0],
              contributor: data[1],
              token: data[2],
              amount: data[3],
              deadline: data[4],
              disputeWindow: data[5],
              specCid: data[6],
              evidenceCid: data[7],
              state: data[8] as CommitmentState,
              createdAt: data[9],
              submittedAt: data[10],
            });
          }
        }

        setCommitments(results);
      } catch (err) {
        console.error('Failed to fetch server commitments:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchServerCommitments();
  }, [publicClient, guildId, totalCount]);

  return { commitments, isLoading, error };
}

/**
 * Get all disputed commitments (for arbitrator)
 */
export function useDisputedCommitments() {
  const publicClient = usePublicClient();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get total commitment count
  const { data: totalCount } = useReadContract({
    address: COMMIT_CONTRACT_ADDRESS,
    abi: COMMIT_CONTRACT_ABI,
    functionName: 'commitmentCount',
    query: { enabled: !!COMMIT_CONTRACT_ADDRESS },
  });

  useEffect(() => {
    if (!publicClient || !totalCount || !COMMIT_CONTRACT_ADDRESS) {
      setCommitments([]);
      return;
    }

    const fetchDisputedCommitments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const count = Number(totalCount);
        const results: Commitment[] = [];
        
        for (let i = 1; i <= count; i++) {
          const [data, guildId] = await Promise.all([
            publicClient.readContract({
              address: COMMIT_CONTRACT_ADDRESS,
              abi: COMMIT_CONTRACT_ABI,
              functionName: 'commitments',
              args: [BigInt(i)],
            }) as Promise<readonly [
              `0x${string}`, `0x${string}`, `0x${string}`, 
              bigint, bigint, bigint, 
              string, string, 
              number, bigint, bigint
            ]>,
            publicClient.readContract({
              address: COMMIT_CONTRACT_ADDRESS,
              abi: COMMIT_CONTRACT_ABI,
              functionName: 'commitmentToServer',
              args: [BigInt(i)],
            }) as Promise<bigint>,
          ]);

          // Filter by DISPUTED state
          if (data[8] === CommitmentState.DISPUTED) {
            results.push({
              id: BigInt(i),
              guildId,
              creator: data[0],
              contributor: data[1],
              token: data[2],
              amount: data[3],
              deadline: data[4],
              disputeWindow: data[5],
              specCid: data[6],
              evidenceCid: data[7],
              state: data[8] as CommitmentState,
              createdAt: data[9],
              submittedAt: data[10],
            });
          }
        }

        setCommitments(results);
      } catch (err) {
        console.error('Failed to fetch disputed commitments:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisputedCommitments();
  }, [publicClient, totalCount]);

  return { commitments, isLoading, error };
}

// ============================================================================
// Server Info Hooks
// ============================================================================

/**
 * Read server info from contract
 */
export function useServerInfo(guildId: string | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: COMMIT_CONTRACT_ADDRESS,
    abi: COMMIT_CONTRACT_ABI,
    functionName: 'servers',
    args: guildId ? [BigInt(guildId)] : undefined,
    query: { enabled: !!guildId && !!COMMIT_CONTRACT_ADDRESS },
  });

  const serverInfo: ServerInfo | null = data ? {
    guildId: data[0],
    adminDiscordId: data[1],
    isActive: data[2],
    registeredAt: data[3],
    totalDeposited: data[4],
    totalSpent: data[5],
    availableBalance: data[6],
  } : null;

  return { data: serverInfo, isLoading, error, refetch };
}

/**
 * Check if a specific server is registered
 */
export function useIsServerRegistered(guildId: string | undefined) {
  const { data: serverInfo } = useServerInfo(guildId);
  return serverInfo?.isActive ?? false;
}

// ============================================================================
// Write Hooks - Dispute Resolution
// ============================================================================

/**
 * Resolve a dispute (arbitrator only)
 */
export function useResolveDispute() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const resolveDispute = useCallback(async (commitId: number, favorContributor: boolean) => {
    try {
      writeContract({
        address: COMMIT_CONTRACT_ADDRESS,
        abi: COMMIT_CONTRACT_ABI,
        functionName: 'resolveDispute',
        args: [BigInt(commitId), favorContributor],
      });
      return true;
    } catch (err) {
      console.error('Failed to resolve dispute:', err);
      return false;
    }
  }, [writeContract]);

  return {
    resolveDispute,
    isLoading: isPending || isConfirming,
    isSuccess,
    txHash: hash,
    error: writeError?.message,
  };
}

// ============================================================================
// Basic Read Hooks
// ============================================================================

/**
 * Get commitment count
 */
export function useCommitmentCount() {
  return useReadContract({
    address: COMMIT_CONTRACT_ADDRESS,
    abi: COMMIT_CONTRACT_ABI,
    functionName: 'commitmentCount',
    query: { enabled: !!COMMIT_CONTRACT_ADDRESS },
  });
}

/**
 * Get MNEE balance for connected wallet
 */
export function useMneeBalance() {
  const { address } = useAccount();
  
  return useReadContract({
    address: MNEE_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

/**
 * Check if a commitment can be settled
 */
export function useCanSettle(commitId: bigint | undefined) {
  return useReadContract({
    address: COMMIT_CONTRACT_ADDRESS,
    abi: COMMIT_CONTRACT_ABI,
    functionName: 'canSettle',
    args: commitId !== undefined ? [commitId] : undefined,
    query: { enabled: commitId !== undefined && !!COMMIT_CONTRACT_ADDRESS },
  });
}

/**
 * Get registration fee
 */
export function useRegistrationFee() {
  return useReadContract({
    address: COMMIT_CONTRACT_ADDRESS,
    abi: COMMIT_CONTRACT_ABI,
    functionName: 'registrationFee',
    query: { enabled: !!COMMIT_CONTRACT_ADDRESS },
  });
}
