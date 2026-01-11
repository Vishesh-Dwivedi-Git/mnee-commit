"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Scale } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DisputeCard } from "@/components/arbitrator/DisputeCard";
import { useDisputedCommitments } from "@/hooks/useContract";

export default function ArbitratorPage() {
  const { commitments, isLoading, error } = useDisputedCommitments();

  return (
    <div className="min-h-screen bg-[#020202]">
      <Sidebar type="arbitrator" />

      <main className="ml-[280px] pt-12 pb-20 px-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-2">
              <Scale className="w-8 h-8 text-[#c9a227]" />
              <h1 className="text-4xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                Arbitrator Dashboard
              </h1>
            </div>
            <p className="text-[#666666]">
              Review and resolve disputed commitments
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-10"
          >
            <Card variant="minimal" padding="md">
              <CardContent>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[#c9a227]" />
                  <div>
                    <div className="text-3xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                      {isLoading ? "..." : commitments.length}
                    </div>
                    <div className="text-sm text-[#666666] uppercase tracking-wider">
                      Pending Disputes
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Disputes List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card variant="glass">
              <CardHeader className="p-6">
                <CardTitle>Disputed Commitments</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#666666]" />
                  </div>
                )}

                {error && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-400" />
                    <h3 className="text-lg font-[family-name:var(--font-display)] text-red-400 mb-2">
                      Failed to Load Disputes
                    </h3>
                    <p className="text-sm text-[#888888]">
                      {error.message || "Please try again later"}
                    </p>
                  </div>
                )}

                {!isLoading && !error && commitments.length === 0 && (
                  <div className="text-center py-12 text-[#666666]">
                    <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No pending disputes</p>
                    <p className="text-sm mt-1">All commitments are in good standing</p>
                  </div>
                )}

                {!isLoading && !error && commitments.length > 0 && (
                  <div className="space-y-4">
                    {commitments.map((commitment) => (
                      <DisputeCard
                        key={commitment.id.toString()}
                        commitment={commitment}
                      />
                    ))}
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
