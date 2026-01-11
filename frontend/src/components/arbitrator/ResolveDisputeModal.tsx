"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useResolveDispute } from "@/hooks/useContract";
import { formatMNEE } from "@/lib/utils";

export function ResolveDisputeModal({ isOpen, onClose, commitment }) {
  const [favorContributor, setFavorContributor] = useState<boolean | null>(null);
  const { resolveDispute, isLoading, error, txHash } = useResolveDispute();

  const handleResolve = async () => {
    if (favorContributor === null) return;

    const success = await resolveDispute(
      Number(commitment.id),
      favorContributor
    );

    if (success) {
      // Wait a moment to show success, then close
      setTimeout(() => {
        onClose();
        window.location.reload(); // Refresh to show updated state
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-lg"
        >
          <Card variant="glass" padding="lg">
            <CardContent>
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-[#c9a227]" />
                  <h2 className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                    Resolve Dispute
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-[#666666] hover:text-[#e8e8e8] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Commitment Info */}
              <div className="mb-6 p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                <p className="text-sm text-[#888888] mb-2">Commitment #{commitment.id.toString()}</p>
                <p className="text-lg text-[#e8e8e8]">
                  Amount: {formatMNEE(commitment.amount)} MNEE
                </p>
                <p className="text-sm text-[#666666] mt-1">
                  Stake: {formatMNEE(commitment.amount)} MNEE (will be returned to server)
                </p>
              </div>

              {/* Decision Buttons */}
              {!txHash && (
                <div className="space-y-3 mb-6">
                  <p className="text-sm text-[#888888] mb-4">
                    Choose the outcome of this dispute:
                  </p>

                  <button
                    onClick={() => setFavorContributor(true)}
                    className={`w-full p-4 rounded-lg border transition-all ${
                      favorContributor === true
                        ? "border-green-500 bg-green-500/10"
                        : "border-[rgba(255,255,255,0.1)] hover:border-green-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div className="text-left">
                        <p className="font-medium text-[#e8e8e8]">Favor Contributor</p>
                        <p className="text-xs text-[#888888]">
                          Work is acceptable → Payment to contributor, stake to server
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setFavorContributor(false)}
                    className={`w-full p-4 rounded-lg border transition-all ${
                      favorContributor === false
                        ? "border-red-500 bg-red-500/10"
                        : "border-[rgba(255,255,255,0.1)] hover:border-red-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <div className="text-left">
                        <p className="font-medium text-[#e8e8e8]">Favor Creator</p>
                        <p className="text-xs text-[#888888]">
                          Work not acceptable → Payment + stake to server balance
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Transaction Status */}
              {isLoading && (
                <div className="text-center py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-[#c9a227] mx-auto mb-3" />
                  <p className="text-sm text-[#888888]">Processing transaction...</p>
                </div>
              )}

              {txHash && !error && (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-medium text-[#e8e8e8] mb-2">
                    Dispute Resolved!
                  </p>
                  <p className="text-sm text-[#888888]">
                    Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              {!txHash && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleResolve}
                    disabled={favorContributor === null || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? "Processing..." : "Confirm Resolution"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
