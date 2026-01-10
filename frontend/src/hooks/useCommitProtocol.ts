'use client';

import { useState, useCallback } from 'react';
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import {
  COMMIT_CONTRACT_ADDRESS,
  MNEE_TOKEN_ADDRESS,
  COMMIT_CONTRACT_ABI,
  ERC20_ABI,
  REGISTRATION_FEE,
} from '@/lib/contracts';

export type TransactionStep = 'idle' | 'approving' | 'confirming-approval' | 'registering' | 'confirming-registration' | 'depositing' | 'confirming-deposit' | 'success' | 'error';

interface UseRegisterServerResult {
  registerServer: (guildId: string, adminDiscordId: string) => Promise<void>;
  step: TransactionStep;
  error: string | null;
  txHash: string | null;
  reset: () => void;
}

/**
 * Hook for registering a Discord server with the Commit Protocol
 * Handles MNEE approval and registration in sequence
 */
export function useRegisterServer(): UseRegisterServerResult {
  const { address } = useAccount();
  const [step, setStep] = useState<TransactionStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync: approveToken } = useWriteContract();
  const { writeContractAsync: callRegister } = useWriteContract();

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
  }, []);

  const registerServer = useCallback(async (guildId: string, adminDiscordId: string) => {
    if (!address) {
      setError('Please connect your wallet');
      setStep('error');
      return;
    }

    if (!COMMIT_CONTRACT_ADDRESS) {
      setError('Contract address not configured');
      setStep('error');
      return;
    }

    try {
      setError(null);
      
      // Step 1: Approve MNEE spending
      setStep('approving');
      const approvalTx = await approveToken({
        address: MNEE_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [COMMIT_CONTRACT_ADDRESS, REGISTRATION_FEE],
      });

      setStep('confirming-approval');
      // Wait for approval confirmation is handled by wagmi internally
      
      // Step 2: Register server
      setStep('registering');
      const registerTx = await callRegister({
        address: COMMIT_CONTRACT_ADDRESS,
        abi: COMMIT_CONTRACT_ABI,
        functionName: 'registerServer',
        args: [BigInt(guildId), BigInt(adminDiscordId)],
      });

      setTxHash(registerTx);
      setStep('confirming-registration');
      
      // Success will be set after tx confirmation in the component
      setStep('success');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep('error');
    }
  }, [address, approveToken, callRegister]);

  return { registerServer, step, error, txHash, reset };
}

interface UseDepositToServerResult {
  deposit: (guildId: string, amount: bigint) => Promise<void>;
  step: TransactionStep;
  error: string | null;
  txHash: string | null;
  reset: () => void;
}

/**
 * Hook for depositing MNEE to a server's balance
 * Handles MNEE approval and deposit in sequence
 */
export function useDepositToServer(): UseDepositToServerResult {
  const { address } = useAccount();
  const [step, setStep] = useState<TransactionStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync: approveToken } = useWriteContract();
  const { writeContractAsync: callDeposit } = useWriteContract();

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
  }, []);

  const deposit = useCallback(async (guildId: string, amount: bigint) => {
    if (!address) {
      setError('Please connect your wallet');
      setStep('error');
      return;
    }

    if (!COMMIT_CONTRACT_ADDRESS) {
      setError('Contract address not configured');
      setStep('error');
      return;
    }

    try {
      setError(null);
      
      // Step 1: Approve MNEE spending
      setStep('approving');
      await approveToken({
        address: MNEE_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [COMMIT_CONTRACT_ADDRESS, amount],
      });

      setStep('confirming-approval');
      
      // Step 2: Deposit to server
      setStep('depositing');
      const depositTx = await callDeposit({
        address: COMMIT_CONTRACT_ADDRESS,
        abi: COMMIT_CONTRACT_ABI,
        functionName: 'depositToServer',
        args: [BigInt(guildId), amount],
      });

      setTxHash(depositTx);
      setStep('confirming-deposit');
      setStep('success');
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep('error');
    }
  }, [address, approveToken, callDeposit]);

  return { deposit, step, error, txHash, reset };
}

interface ServerInfo {
  guildId: bigint;
  adminDiscordId: bigint;
  isActive: boolean;
  registeredAt: bigint;
  totalDeposited: bigint;
  totalSpent: bigint;
  availableBalance: bigint;
}

interface UseServerInfoResult {
  data: ServerInfo | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for reading server information from the contract
 */
export function useServerInfo(guildId: string | undefined): UseServerInfoResult {
  const { data, isLoading, error, refetch } = useReadContract({
    address: COMMIT_CONTRACT_ADDRESS,
    abi: COMMIT_CONTRACT_ABI,
    functionName: 'servers',
    args: guildId ? [BigInt(guildId)] : undefined,
    query: {
      enabled: !!guildId && !!COMMIT_CONTRACT_ADDRESS,
    },
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
 * Hook for reading MNEE token balance
 */
export function useMneeBalance() {
  const { address } = useAccount();
  
  return useReadContract({
    address: MNEE_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}
