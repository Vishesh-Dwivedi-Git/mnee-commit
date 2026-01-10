"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Loader2, AlertCircle, Check, X } from "lucide-react";
import { useAccount } from "wagmi";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatMNEE, parseMneeToWei } from "@/lib/utils";
import { useDepositToServer, useMneeBalance } from "@/hooks/useCommitProtocol";

interface BalanceCardProps {
  guildId: string;
  totalDeposited: bigint | string;
  totalSpent: bigint | string;
  availableBalance: bigint | string;
  onWithdraw?: () => void;
  onBalanceUpdate?: () => void;
}

export function BalanceCard({
  guildId,
  totalDeposited,
  totalSpent,
  availableBalance,
  onWithdraw,
  onBalanceUpdate,
}: BalanceCardProps) {
  const { isConnected } = useAccount();
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  
  const { deposit, step: depositStep, error: depositError, reset: resetDeposit } = useDepositToServer();
  const { data: mneeBalance } = useMneeBalance();

  const deposited = BigInt(totalDeposited);
  const spent = BigInt(totalSpent);
  const available = BigInt(availableBalance);
  
  const usagePercent = deposited > 0n 
    ? Number((spent * 100n) / deposited) 
    : 0;

  const isDepositing = ['approving', 'confirming-approval', 'depositing', 'confirming-deposit'].includes(depositStep);
  const depositSuccess = depositStep === 'success';

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    const amountWei = parseMneeToWei(amount);
    await deposit(guildId, amountWei);
    
    if (depositStep === 'success') {
      onBalanceUpdate?.();
    }
  };

  const handleCloseDepositForm = () => {
    setShowDepositForm(false);
    setDepositAmount("");
    resetDeposit();
  };

  const getDepositStepText = () => {
    switch (depositStep) {
      case 'approving': return 'Approving MNEE...';
      case 'confirming-approval': return 'Confirming approval...';
      case 'depositing': return 'Depositing...';
      case 'confirming-deposit': return 'Confirming...';
      default: return 'Deposit MNEE';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Card variant="warm" padding="lg" className="relative overflow-hidden">
        {/* Subtle gold corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[rgba(201,162,39,0.05)] to-transparent pointer-events-none" />
        
        <CardContent className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-1">
                Balance
              </h3>
              <p className="text-sm text-[#666666]">Prepaid escrow</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDepositForm(true)}>
                <ArrowDownLeft className="w-4 h-4" />
                Deposit
              </Button>
              <Button variant="ghost" size="sm" onClick={onWithdraw}>
                <ArrowUpRight className="w-4 h-4" />
                Withdraw
              </Button>
            </div>
          </div>

          {/* Deposit Form */}
          <AnimatePresence>
            {showDepositForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <div className="bg-[#0a0a0a] border border-[rgba(201,162,39,0.2)] rounded-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-[#e8e8e8]">Deposit MNEE</h4>
                    <button onClick={handleCloseDepositForm} className="text-[#666666] hover:text-[#888888]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {depositSuccess ? (
                    <div className="flex items-center gap-3 py-4">
                      <div className="w-8 h-8 rounded-full bg-[rgba(201,162,39,0.2)] flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#c9a227]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#e8e8e8]">Deposit successful!</p>
                        <p className="text-xs text-[#666666]">Your balance has been updated.</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={handleCloseDepositForm} className="ml-auto">
                        Done
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-4 py-3 bg-[#0f0f0f] border border-[rgba(255,255,255,0.1)] rounded-sm text-[#e8e8e8] placeholder-[#444444] focus:outline-none focus:border-[rgba(201,162,39,0.3)] font-mono pr-16"
                              disabled={isDepositing}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666666] text-sm">
                              MNEE
                            </span>
                          </div>
                          {mneeBalance && (
                            <p className="text-xs text-[#555555] mt-2">
                              Wallet balance: {formatMNEE(mneeBalance)} MNEE
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={handleDeposit}
                          disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing || !isConnected}
                          size="sm"
                          className="self-start"
                        >
                          {isDepositing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {getDepositStepText()}
                            </>
                          ) : (
                            'Deposit'
                          )}
                        </Button>
                      </div>

                      {depositError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm mt-3 bg-red-400/10 p-2 rounded-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs">{depositError}</span>
                        </div>
                      )}

                      <p className="text-xs text-[#444444] mt-3">
                        You will need to approve MNEE spending first, then confirm the deposit.
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Balance */}
          <div className="text-center mb-10">
            <motion.div 
              className="text-6xl sm:text-7xl font-[family-name:var(--font-display)] font-normal text-[#e8e8e8] mb-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {formatMNEE(available)}
            </motion.div>
            <span className="text-[#c9a227] text-sm tracking-[0.2em] uppercase">MNEE</span>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#666666]">utilized</span>
              <span className="text-[#a0a0a0]">{usagePercent.toFixed(0)}%</span>
            </div>
            <div className="h-[2px] bg-[#1a1a1a] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-full bg-gradient-to-r from-[#c9a227] to-[#d4af37]"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[rgba(255,255,255,0.04)]">
            <div>
              <p className="text-xs text-[#444444] uppercase tracking-wider mb-1">Deposited</p>
              <p className="text-xl font-[family-name:var(--font-display)] text-[#a0a0a0]">
                {formatMNEE(deposited)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#444444] uppercase tracking-wider mb-1">Spent</p>
              <p className="text-xl font-[family-name:var(--font-display)] text-[#a0a0a0]">
                {formatMNEE(spent)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
