"use client";

import React from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Award, Clock, CheckCircle, FileText } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMNEE, formatTimeRemaining } from "@/lib/utils";

// Mock data
const mockWork = [
  {
    id: "0x1a2b3c4d",
    server: "Web3 Builders",
    title: "Smart Contract Audit",
    amount: "5000000000000000000000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 3,
    state: "FUNDED",
    progress: 65,
  },
  {
    id: "0x2b3c4d5e",
    server: "DeFi Protocol",
    title: "Frontend Integration",
    amount: "2000000000000000000000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 1,
    state: "FUNDED",
    progress: 90,
  },
  {
    id: "0x3c4d5e6f",
    server: "NFT Marketplace",
    title: "API Development",
    amount: "3500000000000000000000",
    deadline: Math.floor(Date.now() / 1000) - 86400,
    state: "SUBMITTED",
    progress: 100,
  },
];

const stats = [
  { label: "Earned", value: "45,250", icon: Wallet },
  { label: "Pending", value: "10,500", icon: Clock },
  { label: "Reputation", value: "94", icon: Award },
  { label: "Success", value: "98%", icon: TrendingUp },
];

export default function ContributorDashboard() {
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
            Dashboard
          </h1>
          <p className="text-[#666666] text-sm">
            Your work and reputation
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card variant="minimal" hover="border" padding="md">
                <CardContent className="flex items-center gap-4">
                  <stat.icon className="w-5 h-5 text-[#444444]" />
                  <div>
                    <p className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                      {stat.value}
                    </p>
                    <p className="text-xs text-[#666666] uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Active Work */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between p-6">
              <CardTitle>Active Work</CardTitle>
              <Button variant="ghost" size="sm">
                <FileText className="w-4 h-4" />
                All
              </Button>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockWork.map((work, index) => (
                  <motion.div
                    key={work.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Card variant="elevated" hover="glow" padding="md" className="h-full group">
                      <CardContent>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] text-[#444444] font-mono uppercase tracking-wider">
                            {work.id}
                          </span>
                          <StatusBadge status={work.state} />
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-[family-name:var(--font-display)] text-[#e8e8e8] mb-1 group-hover:text-white transition-colors">
                          {work.title}
                        </h3>
                        <p className="text-xs text-[#666666] mb-6">{work.server}</p>

                        {/* Progress */}
                        <div className="mb-6">
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-[#444444]">progress</span>
                            <span className="text-[#888888]">{work.progress}%</span>
                          </div>
                          <div className="h-[2px] bg-[#1a1a1a] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${work.progress}%` }}
                              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                              className="h-full bg-gradient-to-r from-[#666666] to-[#888888]"
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.04)]">
                          <div>
                            <p className="text-lg font-[family-name:var(--font-display)] text-[#e8e8e8]">
                              {formatMNEE(work.amount)}
                            </p>
                            <p className="text-[10px] text-[#c9a227] uppercase tracking-wider">MNEE</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#666666]">{formatTimeRemaining(work.deadline)}</p>
                          </div>
                        </div>

                        {/* Submit Button */}
                        {work.state === "FUNDED" && (
                          <Button variant="gold" className="w-full mt-4" size="sm">
                            <CheckCircle className="w-4 h-4" />
                            Submit
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reputation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10"
        >
          <Card variant="warm">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#c9a227]" />
                Reputation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Score */}
                <div className="flex flex-col items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="text-7xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-2"
                  >
                    94
                  </motion.div>
                  <span className="text-xs text-[#666666] uppercase tracking-[0.2em]">of 100</span>
                </div>

                {/* Breakdown */}
                <div className="col-span-2 space-y-4">
                  {[
                    { label: "Completion", value: 98 },
                    { label: "Timeliness", value: 92 },
                    { label: "Quality", value: 95 },
                    { label: "Communication", value: 90 },
                  ].map((metric, i) => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#666666]">{metric.label}</span>
                        <span className="text-[#888888]">{metric.value}%</span>
                      </div>
                      <div className="h-[2px] bg-[#1a1a1a] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.value}%` }}
                          transition={{ duration: 0.8, delay: 0.6 + i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                          className="h-full bg-[#c9a227]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
