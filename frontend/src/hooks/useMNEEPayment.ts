'use client';

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract, useChainId } from 'wagmi';
import { parseUnits } from 'viem';
import { MNEE_TOKEN_ADDRESS, ERC20_ABI, COMMIT_CONTRACT_ADDRESS } from '@/lib/contracts';

export interface PaymentOptions {
  /** Amount in MNEE (will be converted to 18 decimals) */
  amountMNEE: string | number;
  /** Contract address to approve spending for (defaults to Commit Protocol contract) */
  spender?: `0x${string}`;
  /** Callback after approval succeeds */
  onApprovalSuccess?: (txHash: string) => void;
  /** Callback after payment succeeds */
  onPaymentSuccess?: (txHash: string) => void;
  /** Callback on any error */
  onError?: (error: Error) => void;
}

export interface PaymentState {
  isApproving: boolean;
  isPaying: boolean;
  isLoading: boolean;
  approvalTxHash?: string;
  paymentTxHash?: string;
  error?: string;
}

/**
 * Unified payment hook for MNEE token operations
 * Handles approval and payment in a single flow
 * 
 * @example
 * const { pay, state } = useMNEEPayment();
 * 
 * await pay({
 *   amountMNEE: 1000,
 *   spender: CONTRACT_ADDRESS,
 *   onPaymentSuccess: (txHash) => console.log('Paid!', txHash)
 * });
 */
export function useMNEEPayment() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();

  const [state, setState] = useState<PaymentState>({
    isApproving: false,
    isPaying: false,
    isLoading: false,
  });

  /**
   * Execute MNEE payment (approve + optional custom payment logic)
   * Returns approval transaction hash
   */
  const pay = useCallback(async (options: PaymentOptions): Promise<string | null> => {
    const {
      amountMNEE,
      spender = COMMIT_CONTRACT_ADDRESS,
      onApprovalSuccess,
      onPaymentSuccess,
      onError,
    } = options;

    if (!address || !publicClient) {
      const error = new Error('Wallet not connected');
      onError?.(error);
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }

    if (!spender) {
      const error = new Error('Spender address required');
      onError?.(error);
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }

    try {
      setState({
        isApproving: true,
        isPaying: false,
        isLoading: true,
        error: undefined,
      });

      // Convert MNEE amount to wei (18 decimals)
      const amountWei = parseUnits(amountMNEE.toString(), 18);

      // Step 1: Approve MNEE spending
      const approvalTx = await writeContractAsync({
        address: MNEE_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amountWei],
        chainId,
      });

      // Wait for approval confirmation
      await publicClient.waitForTransactionReceipt({ hash: approvalTx });

      setState({
        isApproving: false,
        isPaying: false,
        isLoading: false,
        approvalTxHash: approvalTx,
      });

      onApprovalSuccess?.(approvalTx);

      return approvalTx;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Payment failed');
      console.error('Payment error:', err);
      
      setState({
        isApproving: false,
        isPaying: false,
        isLoading: false,
        error: err.message,
      });

      onError?.(err);
      return null;
    }
  }, [address, publicClient, chainId, writeContractAsync]);

  /**
   * Approve MNEE spending without additional payment logic
   * Useful when payment is handled separately (e.g., by another contract call)
   */
  const approve = useCallback(async (
    amountMNEE: string | number,
    spender: `0x${string}` = COMMIT_CONTRACT_ADDRESS
  ): Promise<string | null> => {
    return pay({ amountMNEE, spender });
  }, [pay]);

  /**
   * Reset payment state
   */
  const reset = useCallback(() => {
    setState({
      isApproving: false,
      isPaying: false,
      isLoading: false,
      error: undefined,
    });
  }, []);

  return {
    pay,
    approve,
    reset,
    state,
    isLoading: state.isLoading,
    error: state.error,
  };
}

/**
 * Hook for checking MNEE allowance
 */
export function useMNEEAllowance(spender: `0x${string}` = COMMIT_CONTRACT_ADDRESS) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const checkAllowance = useCallback(async (): Promise<bigint> => {
    if (!address || !publicClient) return BigInt(0);

    try {
      const allowance = await publicClient.readContract({
        address: MNEE_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, spender],
      }) as bigint;

      return allowance;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return BigInt(0);
    }
  }, [address, publicClient, spender]);

  return { checkAllowance };
}
