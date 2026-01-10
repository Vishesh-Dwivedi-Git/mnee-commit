"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, TrendingUp, Users, AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BalanceCard } from "@/components/dao/BalanceCard";
import { CommitmentsTable } from "@/components/dao/CommitmentsTable";
import { Card, CardContent } from "@/components/ui/Card";

// Mock data
const mockCommitments = [
  {
    id: "0x1a2b3c4d5e6f7890",
    contributor: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
    amount: "2500000000000000000000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 5,
    state: "FUNDED",
    specCid: "QmSpec123",
  },
  {
    id: "0x2b3c4d5e6f789012",
    contributor: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF",
    amount: "1000000000000000000000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 2,
    state: "SUBMITTED",
    specCid: "QmSpec456",
    evidenceCid: "QmEvidence789",
  },
  {
    id: "0x3c4d5e6f78901234",
    contributor: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    amount: "5000000000000000000000",
    deadline: Math.floor(Date.now() / 1000) - 86400,
    state: "SETTLED",
    specCid: "QmSpec789",
  },
];

const stats = [
  { label: "Total", value: "47", icon: FileText },
  { label: "Active", value: "12", icon: TrendingUp },
  { label: "Contributors", value: "23", icon: Users },
  { label: "Disputed", value: "2", icon: AlertCircle },
];

export default function DAODashboard() {
  return (
    <div className="min-h-screen bg-[#020202]">
      <Sidebar type="dao" />
      
      {/* Main Content */}
      <main className="ml-64 p-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <h1 className="text-3xl font-[family-name:var(--font-display)] font-normal text-[#e8e8e8] mb-2">
            Overview
          </h1>
          <p className="text-[#666666] text-sm">
            Server escrow management
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 + index * 0.05 }}
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

        {/* Balance Card */}
        <div className="mb-10">
          <BalanceCard
            guildId="123456789012345678"
            totalDeposited="15000000000000000000000"
            totalSpent="8500000000000000000000"
            availableBalance="6500000000000000000000"
          />
        </div>

        {/* Commitments Table */}
        <CommitmentsTable
          commitments={mockCommitments}
          onViewDetails={(id) => console.log("View:", id)}
          onCreateNew={() => console.log("Create new")}
        />
      </main>
    </div>
  );
}
