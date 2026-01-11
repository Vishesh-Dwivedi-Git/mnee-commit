"use client";

import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Wallet, TrendingUp, Clock, CheckCircle, FileText, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMNEE, formatTimeRemaining } from "@/lib/utils";
import { useContributorCommitments, useMneeBalance } from "@/hooks/useContract";
import { STATE_LABELS, CommitmentState } from "@/lib/contracts";

// Loading fallback
function Loading() {
  return (
    <div className="min-h-screen bg-[#020202]">
      <Sidebar type="contributor" />
      <main className="ml-64 p-10 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#c9a227]" />
      </main>
    </div>
  );
}

function ContributorDashboardInner() {
  const { address, isConnected } = useAccount();
  const { commitments, isLoading, error } = useContributorCommitments();
  const { data: mneeBalance } = useMneeBalance();

  // Calculate stats from real data
  const activeWork = commitments.filter(c => c.state === CommitmentState.FUNDED);
  const submittedWork = commitments.filter(c => c.state === CommitmentState.SUBMITTED);
  const completedWork = commitments.filter(c => 
    c.state === CommitmentState.SETTLED || c.state === CommitmentState.APPROVED
  );
  
  const pendingAmount = activeWork.reduce((sum, c) => sum + c.amount, 0n);
  const earnedAmount = completedWork.reduce((sum, c) => sum + c.amount, 0n);

  // Show connect prompt if no wallet
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-[#020202]">
        <Sidebar type="contributor" />
        <main className="ml-64 p-10">
          <Card variant="warm" padding="lg" className="max-w-md mx-auto mt-20">
            <CardContent className="text-center">
              <Wallet className="w-12 h-12 text-[#c9a227] mx-auto mb-4" />
              <h2 className="text-xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-2">
                Connect Wallet
              </h2>
              <p className="text-[#888888] text-sm">
                Connect your wallet to view your commitments
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202]">
      <Sidebar type="contributor" />
      
      <main className="ml-64 p-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12"
        >
          <h1 className="text-3xl font-[family-name:var(--font-display)] font-normal text-[#e8e8e8] mb-2">
            My Work
          </h1>
          <p className="text-[#666666] text-sm font-mono">
            {address?.slice(0, 10)}...{address?.slice(-8)}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          <Card variant="minimal" hover="border" padding="md">
            <CardContent className="flex items-center gap-4">
              <Wallet className="w-5 h-5 text-[#444444]" />
              <div>
                <p className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                  {formatMNEE(earnedAmount)}
                </p>
                <p className="text-xs text-[#666666] uppercase tracking-wider">
                  Earned
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="minimal" hover="border" padding="md">
            <CardContent className="flex items-center gap-4">
              <Clock className="w-5 h-5 text-[#444444]" />
              <div>
                <p className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                  {formatMNEE(pendingAmount)}
                </p>
                <p className="text-xs text-[#666666] uppercase tracking-wider">
                  Pending
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="minimal" hover="border" padding="md">
            <CardContent className="flex items-center gap-4">
              <FileText className="w-5 h-5 text-[#444444]" />
              <div>
                <p className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                  {activeWork.length}
                </p>
                <p className="text-xs text-[#666666] uppercase tracking-wider">
                  Active
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="minimal" hover="border" padding="md">
            <CardContent className="flex items-center gap-4">
              <TrendingUp className="w-5 h-5 text-[#444444]" />
              <div>
                <p className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                  {completedWork.length}
                </p>
                <p className="text-xs text-[#666666] uppercase tracking-wider">
                  Completed
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#c9a227]" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card variant="minimal" padding="lg">
            <CardContent className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-[family-name:var(--font-display)] text-red-400 mb-2">
                Unable to Load Your Work
              </h3>
              <p className="text-sm text-[#888888] mb-4">
                We couldn't connect to the blockchain. Please check your connection and try again.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && commitments.length === 0 && (
          <Card variant="minimal" padding="lg">
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-[#333333] mx-auto mb-4" />
              <h3 className="text-lg font-[family-name:var(--font-display)] text-[#888888] mb-2">
                No Work Assigned
              </h3>
              <p className="text-sm text-[#666666]">
                You don't have any work commitments assigned to your wallet yet.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Commitments List */}
        {!isLoading && !error && commitments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between p-6">
                <CardTitle>My Commitments</CardTitle>
                <span className="text-sm text-[#666666]">{commitments.length} total</span>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {commitments.map((commitment, index) => (
                    <motion.div
                      key={commitment.id.toString()}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                    >
                      <Card variant="elevated" hover="glow" padding="md" className="h-full group">
                        <CardContent>
                          {/* Header */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] text-[#444444] font-mono uppercase tracking-wider">
                              #{commitment.id.toString()}
                            </span>
                            <StatusBadge status={STATE_LABELS[commitment.state]} />
                          </div>

                          {/* Server ID */}
                          <p className="text-xs text-[#666666] mb-2">
                            Server: {commitment.guildId.toString()}
                          </p>

                          {/* Amount & Deadline */}
                          <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.04)]">
                            <div>
                              <p className="text-lg font-[family-name:var(--font-display)] text-[#e8e8e8]">
                                {formatMNEE(commitment.amount)}
                              </p>
                              <p className="text-[10px] text-[#c9a227] uppercase tracking-wider">MNEE</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[#666666]">
                                {formatTimeRemaining(Number(commitment.deadline))}
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          {commitment.state === CommitmentState.FUNDED && (
                            <Button variant="gold" className="w-full mt-4" size="sm">
                              <CheckCircle className="w-4 h-4" />
                              Submit Work
                            </Button>
                          )}

                          {commitment.state === CommitmentState.SUBMITTED && (
                            <div className="mt-4 text-center text-xs text-[#666666]">
                              Awaiting approval...
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* MNEE Balance Card */}
        {mneeBalance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card variant="minimal" padding="md">
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-[#666666]">Wallet MNEE Balance</span>
                <span className="text-lg font-[family-name:var(--font-display)] text-[#c9a227]">
                  {formatMNEE(mneeBalance)} MNEE
                </span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function ContributorDashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <ContributorDashboardInner />
    </Suspense>
  );
}
