"use client";

import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMNEE, shortenAddress, formatDate, formatTimeRemaining } from "@/lib/utils";

interface Commitment {
  id: string;
  contributor: string;
  amount: string | bigint;
  deadline: number;
  state: string;
  specCid: string;
  evidenceCid?: string;
}

interface CommitmentsTableProps {
  commitments: Commitment[];
  onViewDetails?: (id: string) => void;
  onCreateNew?: () => void;
}

export function CommitmentsTable({ commitments, onViewDetails, onCreateNew }: CommitmentsTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Card variant="glass">
        <CardHeader className="flex flex-row items-center justify-between p-6 pb-0">
          <CardTitle className="text-xl">Commitments</CardTitle>
          <Button variant="gold" size="sm" onClick={onCreateNew}>
            New
          </Button>
        </CardHeader>
        <CardContent className="p-0 mt-6">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.04)]">
                  <th className="text-left text-[10px] font-normal text-[#444444] uppercase tracking-[0.15em] px-6 py-3">
                    ID
                  </th>
                  <th className="text-left text-[10px] font-normal text-[#444444] uppercase tracking-[0.15em] px-6 py-3">
                    Contributor
                  </th>
                  <th className="text-left text-[10px] font-normal text-[#444444] uppercase tracking-[0.15em] px-6 py-3">
                    Amount
                  </th>
                  <th className="text-left text-[10px] font-normal text-[#444444] uppercase tracking-[0.15em] px-6 py-3">
                    Deadline
                  </th>
                  <th className="text-left text-[10px] font-normal text-[#444444] uppercase tracking-[0.15em] px-6 py-3">
                    Status
                  </th>
                  <th className="text-right text-[10px] font-normal text-[#444444] uppercase tracking-[0.15em] px-6 py-3">
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {commitments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-[#444444] italic">
                      No commitments yet
                    </td>
                  </tr>
                ) : (
                  commitments.map((commitment, index) => (
                    <motion.tr
                      key={commitment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.01)] transition-colors duration-300 group"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-[#666666]">
                          {commitment.id.slice(0, 10)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-[#888888]">
                          {shortenAddress(commitment.contributor)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#e8e8e8] font-[family-name:var(--font-display)]">
                          {formatMNEE(commitment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-[#888888]">{formatDate(commitment.deadline)}</p>
                          <p className="text-xs text-[#444444]">{formatTimeRemaining(commitment.deadline)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={commitment.state} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDetails?.(commitment.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
