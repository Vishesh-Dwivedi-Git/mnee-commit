"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAccount, usePublicClient } from "wagmi";
import { Server, User, Plus, ArrowRight, Loader2, Wallet, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useUserByWallet } from "@/hooks/useApi";
import { useContributorCommitments, useServerInfo } from "@/hooks/useContract";
import { COMMIT_CONTRACT_ADDRESS, COMMIT_CONTRACT_ABI } from "@/lib/contracts";
import { formatMNEE } from "@/lib/utils";

// Known server IDs to check (from recent registrations)
// In production, this would come from an indexer or the user's discordId
const KNOWN_SERVER_IDS = [
  "1115619915609669822", // The registered test server
];

interface DetectedServer {
  guildId: string;
  adminDiscordId: string;
  isActive: boolean;
  availableBalance: bigint;
}

function SelectDashboardInner() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  
  // Get user's linked Discord ID if any
  const { user, isLoading: userLoading } = useUserByWallet(address);
  
  // Get contributor's work
  const { commitments, isLoading: commitmentsLoading } = useContributorCommitments();
  
  // Detect user's servers
  const [detectedServers, setDetectedServers] = useState<DetectedServer[]>([]);
  const [scanningServers, setScanningServers] = useState(false);

  // Scan for servers the user registered
  useEffect(() => {
    if (!publicClient || !address || !COMMIT_CONTRACT_ADDRESS) return;

    const scanServers = async () => {
      setScanningServers(true);
      const servers: DetectedServer[] = [];

      // Check known server IDs
      for (const guildId of KNOWN_SERVER_IDS) {
        try {
          const data = await publicClient.readContract({
            address: COMMIT_CONTRACT_ADDRESS,
            abi: COMMIT_CONTRACT_ABI,
            functionName: 'servers',
            args: [BigInt(guildId)],
          }) as readonly [bigint, bigint, boolean, bigint, bigint, bigint, bigint];

          if (data[2]) { // isActive
            servers.push({
              guildId,
              adminDiscordId: data[1].toString(),
              isActive: data[2],
              availableBalance: data[6],
            });
          }
        } catch (e) {
          // Server not found, skip
        }
      }

      setDetectedServers(servers);
      setScanningServers(false);
    };

    scanServers();
  }, [publicClient, address]);

  // Count active work
  const activeWorkCount = commitments.filter(c => c.state === 0 || c.state === 1).length;

  return (
    <div className="min-h-screen bg-[#020202]">
      <Navbar />

      <main className="pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-4">
              Dashboard
            </h1>
            <p className="text-[#666666] text-lg">
              Manage your servers and work
            </p>
          </motion.div>

          {/* Connect Wallet First */}
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center mb-12"
            >
              <Card variant="warm" padding="lg" className="max-w-md mx-auto">
                <CardContent className="flex flex-col items-center gap-4">
                  <Wallet className="w-8 h-8 text-[#c9a227]" />
                  <p className="text-[#888888]">Connect your wallet to continue</p>
                  <ConnectButton />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Connected State */}
          {isConnected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* My Servers Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Card variant="warm" padding="lg">
                  <CardContent>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[rgba(201,162,39,0.15)] flex items-center justify-center">
                          <Server className="w-5 h-5 text-[#c9a227]" />
                        </div>
                        <div>
                          <h2 className="text-xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                            My Servers
                          </h2>
                          <p className="text-xs text-[#666666]">Discord servers you manage</p>
                        </div>
                      </div>
                      {scanningServers && (
                        <Loader2 className="w-4 h-4 animate-spin text-[#666666]" />
                      )}
                    </div>

                    {/* Server List */}
                    {detectedServers.length > 0 ? (
                      <div className="space-y-3 mb-6">
                        {detectedServers.map((server) => (
                          <button
                            key={server.guildId}
                            onClick={() => router.push(`/dao?guildId=${server.guildId}`)}
                            className="w-full p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-sm hover:border-[rgba(201,162,39,0.3)] hover:bg-[rgba(201,162,39,0.02)] transition-all duration-300 text-left group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-mono text-[#888888] mb-1">
                                  {server.guildId}
                                </p>
                                <p className="text-xs text-[#666666]">
                                  Balance: <span className="text-[#c9a227]">{formatMNEE(server.availableBalance)} MNEE</span>
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-[#444444] group-hover:text-[#c9a227] transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : !scanningServers ? (
                      <div className="text-center py-8 mb-6">
                        <Server className="w-8 h-8 text-[#333333] mx-auto mb-3" />
                        <p className="text-sm text-[#666666] mb-1">No servers found</p>
                        <p className="text-xs text-[#444444]">Register a Discord server to get started</p>
                      </div>
                    ) : null}

                    {/* Register Button */}
                    <Button
                      onClick={() => router.push("/register")}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4" />
                      Register New Server
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* My Work Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <Card variant="elevated" padding="lg">
                  <CardContent>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                          <User className="w-5 h-5 text-[#888888]" />
                        </div>
                        <div>
                          <h2 className="text-xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                            My Work
                          </h2>
                          <p className="text-xs text-[#666666]">Commitments assigned to you</p>
                        </div>
                      </div>
                      {commitmentsLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-[#666666]" />
                      )}
                    </div>

                    {/* Work Summary */}
                    <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.05)] rounded-sm p-4 mb-6">
                      {commitments.length > 0 ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                              {activeWorkCount}
                            </p>
                            <p className="text-xs text-[#666666]">Active commitments</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-[#888888]">{commitments.length} total</p>
                          </div>
                        </div>
                      ) : !commitmentsLoading ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-[#666666]">No work assigned yet</p>
                        </div>
                      ) : null}
                    </div>

                    {/* View Work Button */}
                    <Button
                      onClick={() => router.push("/contributor")}
                      variant="outline"
                      className="w-full"
                    >
                      View All Work
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    {/* Wallet Info */}
                    <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.05)]">
                      <p className="text-[10px] text-[#666666] uppercase tracking-wider mb-2">Connected Wallet</p>
                      <p className="text-xs font-mono text-[#888888] break-all">
                        {address}
                      </p>
                      {user?.discordId && (
                        <p className="text-xs text-[#666666] mt-2">
                          Discord linked: <span className="text-[#c9a227]">{user.username}</span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen bg-[#020202]">
      <Navbar />
      <main className="pt-32 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c9a227]" />
      </main>
    </div>
  );
}

export default function SelectDashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <SelectDashboardInner />
    </Suspense>
  );
}
