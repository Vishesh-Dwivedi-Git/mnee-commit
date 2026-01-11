"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Scale, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { ResolveDisputeModal } from "./ResolveDisputeModal";
import { formatMNEE, formatTimeRemaining } from "@/lib/utils";
import { STATE_LABELS } from "@/lib/contracts";

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

export function DisputeCard({ commitment }) {
  const [showResolveModal, setShowResolveModal] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card variant="warm" padding="lg">
          <CardContent>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                      Commitment #{commitment.id.toString()}
                    </h3>
                    <StatusBadge status={STATE_LABELS[commitment.state]} />
                  </div>
                  <p className="text-sm text-[#888888]">
                    Amount: {formatMNEE(commitment.amount)} MNEE
                  </p>
                </div>
                <Button
                  onClick={() => setShowResolveModal(true)}
                  className="flex items-center gap-2"
                >
                  <Scale className="w-4 h-4" />
                  Resolve Dispute
                </Button>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <div>
                  <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">
                    Contributor
                  </p>
                  <p className="font-mono text-sm text-[#e8e8e8]">
                    {commitment.contributor.slice(0, 10)}...{commitment.contributor.slice(-8)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">
                    Deadline
                  </p>
                  <p className="text-sm text-[#e8e8e8]">
                    {formatTimeRemaining(Number(commitment.deadline))}
                  </p>
                </div>
              </div>

              {/* IPFS Links */}
              <div className="space-y-2 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888888]">Specification (Requirements)</span>
                  <a
                    href={`${IPFS_GATEWAY}${commitment.specCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-[#c9a227] hover:text-[#e8b429] transition-colors"
                  >
                    View on IPFS
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888888]">Evidence (Submitted Work)</span>
                  <a
                    href={`${IPFS_GATEWAY}${commitment.evidenceCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-[#c9a227] hover:text-[#e8b429] transition-colors"
                  >
                    View on IPFS
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Dispute Info */}
              <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#c9a227] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">
                      Dispute Stake
                    </p>
                    <p className="text-sm text-[#e8e8e8]">
                      {formatMNEE(commitment.amount)} MNEE
                      <span className="text-xs text-[#666666] ml-2">
                        (Equal to commitment amount)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <ResolveDisputeModal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        commitment={commitment}
      />
    </>
  );
}
