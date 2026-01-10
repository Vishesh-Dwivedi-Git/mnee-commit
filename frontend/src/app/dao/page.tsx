"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, TrendingUp, Users, AlertCircle, Loader2, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { BalanceCard } from "@/components/dao/BalanceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { useServerInfo, useServerCommitments } from "@/hooks/useContract";
import { formatMNEE, formatTimeRemaining } from "@/lib/utils";
import { STATE_LABELS, CommitmentState } from "@/lib/contracts";

// Loading fallback
function Loading() {
  return (
    <div className="min-h-screen bg-[#020202]">
      <Sidebar type="dao" />
      <main className="ml-[280px] pt-12 pb-20 px-10 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#c9a227]" />
      </main>
    </div>
  );
}

function DAODashboardInner() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId") || "";
  
  const { data: serverInfo, isLoading: serverLoading, error: serverError } = useServerInfo(guildId);
  const { commitments, isLoading: commitmentsLoading, error: commitmentsError } = useServerCommitments(guildId);

  // Calculate stats from real data
  const activeCommitments = commitments.filter(c => c.state === CommitmentState.FUNDED);
  const submittedCommitments = commitments.filter(c => c.state === CommitmentState.SUBMITTED);
  const disputedCommitments = commitments.filter(c => c.state === CommitmentState.DISPUTED);
  const uniqueContributors = new Set(commitments.map(c => c.contributor)).size;

  const stats = [
    { label: "Total", value: commitments.length.toString(), icon: FileText },
    { label: "Active", value: activeCommitments.length.toString(), icon: TrendingUp },
    { label: "Contributors", value: uniqueContributors.toString(), icon: Users },
    { label: "Disputed", value: disputedCommitments.length.toString(), icon: AlertCircle },
  ];

  // Show prompt if no guildId
  if (!guildId) {
    return (
      <div className="min-h-screen bg-[#020202]">
        <Sidebar type="dao" />
        <main className="ml-[280px] pt-12 pb-20 px-10">
          <div className="max-w-4xl mx-auto">
            <Card variant="warm" padding="lg">
              <CardContent>
                <h2 className="text-xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-4">
                  Server Not Selected
                </h2>
                <p className="text-[#888888] mb-4">
                  Please provide a guildId in the URL to view the dashboard.
                </p>
                <p className="text-sm text-[#666666] mb-6">
                  Example: <code className="bg-[#1a1a1a] px-2 py-1 rounded">/dao?guildId=1115619915609669822</code>
                </p>
                <div className="flex gap-3">
                  <Link href="/select">
                    <Button variant="outline">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Select
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button>Register New Server</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Show loading state
  if (serverLoading) {
    return (
      <div className="min-h-screen bg-[#020202]">
        <Sidebar type="dao" />
        <main className="ml-[280px] pt-12 pb-20 px-10">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#c9a227]" />
          </div>
        </main>
      </div>
    );
  }

  // Show error if server not found
  if (serverError || !serverInfo?.isActive) {
    return (
      <div className="min-h-screen bg-[#020202]">
        <Sidebar type="dao" />
        <main className="ml-[280px] pt-12 pb-20 px-10">
          <div className="max-w-4xl mx-auto">
            <Card variant="warm" padding="lg">
              <CardContent>
                <h2 className="text-xl font-[family-name:var(--font-display)] text-red-400 mb-4">
                  Server Not Found
                </h2>
                <p className="text-[#888888] mb-4">
                  The server with ID <code className="bg-[#1a1a1a] px-2 py-1 rounded">{guildId}</code> is not registered.
                </p>
                <div className="flex gap-3">
                  <Link href="/select">
                    <Button variant="outline">Back</Button>
                  </Link>
                  <Link href="/register">
                    <Button>Register Server</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202]">
      <Sidebar type="dao" />

      <main className="ml-[280px] pt-12 pb-20 px-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-2">
              Server Dashboard
            </h1>
            <p className="text-[#666666] font-mono">
              Guild ID: {guildId}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-4 gap-4 mb-10"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Card variant="minimal" padding="md">
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <stat.icon className="w-4 h-4 text-[#555555]" />
                      <span className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                        {stat.value}
                      </span>
                    </div>
                    <p className="text-xs text-[#666666] uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Balance Card */}
          <div className="mb-10">
            <BalanceCard
              guildId={guildId}
              totalDeposited={serverInfo.totalDeposited.toString()}
              totalSpent={serverInfo.totalSpent.toString()}
              availableBalance={serverInfo.availableBalance.toString()}
            />
          </div>

          {/* Commitments List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between p-6">
                <CardTitle>Commitments</CardTitle>
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  Create New
                </Button>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {commitmentsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#666666]" />
                  </div>
                )}

                {commitmentsError && (
                  <div className="text-center py-12 text-[#666666]">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                    <p>Failed to load commitments</p>
                  </div>
                )}

                {!commitmentsLoading && !commitmentsError && commitments.length === 0 && (
                  <div className="text-center py-12 text-[#666666]">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No commitments yet</p>
                    <p className="text-sm mt-1">Create your first commitment to get started</p>
                  </div>
                )}

                {!commitmentsLoading && !commitmentsError && commitments.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.05)]">
                          <th className="text-left py-3 px-4 text-xs uppercase text-[#666666] tracking-wider">ID</th>
                          <th className="text-left py-3 px-4 text-xs uppercase text-[#666666] tracking-wider">Contributor</th>
                          <th className="text-left py-3 px-4 text-xs uppercase text-[#666666] tracking-wider">Amount</th>
                          <th className="text-left py-3 px-4 text-xs uppercase text-[#666666] tracking-wider">Deadline</th>
                          <th className="text-left py-3 px-4 text-xs uppercase text-[#666666] tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commitments.map((commitment) => (
                          <tr 
                            key={commitment.id.toString()}
                            className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer"
                          >
                            <td className="py-4 px-4">
                              <span className="font-mono text-sm text-[#888888]">
                                #{commitment.id.toString()}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-mono text-sm text-[#888888]">
                                {commitment.contributor.slice(0, 8)}...{commitment.contributor.slice(-6)}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-[#e8e8e8]">
                                {formatMNEE(commitment.amount)}
                              </span>
                              <span className="text-xs text-[#c9a227] ml-1">MNEE</span>
                            </td>
                            <td className="py-4 px-4 text-sm text-[#888888]">
                              {formatTimeRemaining(Number(commitment.deadline))}
                            </td>
                            <td className="py-4 px-4">
                              <StatusBadge status={STATE_LABELS[commitment.state]} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function DAODashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <DAODashboardInner />
    </Suspense>
  );
}
