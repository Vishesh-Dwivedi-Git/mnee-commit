"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Server, Check, AlertCircle, Loader2, Coins, ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRegisterServer, useMneeBalance } from "@/hooks/useCommitProtocol";
import { isValidDiscordId, isValidDiscordServerId, formatMNEE } from "@/lib/utils";
import { REGISTRATION_FEE } from "@/lib/contracts";

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(1);
  const [discordUserId, setDiscordUserId] = useState("");
  const [serverId, setServerId] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ userId?: string; serverId?: string }>({});
  
  const { registerServer, step: txStep, error: txError, txHash, reset } = useRegisterServer();
  const { data: mneeBalance } = useMneeBalance();

  // Validate inputs as user types
  const validateInputs = () => {
    const errors: { userId?: string; serverId?: string } = {};
    
    if (discordUserId && !isValidDiscordId(discordUserId)) {
      errors.userId = "Discord User ID must be 17-19 digits (enable Developer Mode in Discord to copy your ID)";
    }
    
    if (serverId && !isValidDiscordServerId(serverId)) {
      errors.serverId = "Server ID must be 17-19 digits";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if user has enough MNEE
  const hasEnoughMnee = useMemo(() => {
    if (!mneeBalance) return false;
    return mneeBalance >= REGISTRATION_FEE;
  }, [mneeBalance]);

  const handleRegister = async () => {
    if (!isConnected || !address) {
      return;
    }

    if (!validateInputs()) {
      return;
    }

    if (!discordUserId.trim() || !serverId.trim()) {
      return;
    }

    await registerServer(serverId, discordUserId);
  };

  // Show success state
  const isSuccess = txStep === 'success';
  const isLoading = ['approving', 'confirming-approval', 'registering', 'confirming-registration'].includes(txStep);

  // Get step description for UI
  const getStepDescription = () => {
    switch (txStep) {
      case 'approving':
        return 'Approve MNEE spending...';
      case 'confirming-approval':
        return 'Confirming approval...';
      case 'registering':
        return 'Registering server...';
      case 'confirming-registration':
        return 'Confirming registration...';
      default:
        return 'Register Server (15 MNEE)';
    }
  };

  return (
    <div className="min-h-screen bg-[#020202]">
      <Navbar />

      <main className="pt-32 pb-20">
        <div className="max-w-2xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#666666] hover:text-[#a0a0a0] transition-colors mb-8 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>

            <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-4">
              Register Your <span className="italic text-[#c9a227]">DAO</span>
            </h1>
            <p className="text-[#666666] text-lg">
              Connect your Discord server to the Commit Protocol. Pay 15 MNEE from your wallet.
            </p>
          </motion.div>

          {/* Steps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Step 1: Connect Wallet */}
            <Card variant={step >= 1 ? "warm" : "minimal"} padding="lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    step > 1 ? "bg-[#c9a227] text-black" : "bg-[#1a1a1a] text-[#888888]"
                  }`}>
                    {step > 1 ? <Check className="w-4 h-4" /> : "1"}
                  </div>
                  <span className={step >= 1 ? "text-[#e8e8e8]" : "text-[#666666]"}>
                    Connect Wallet
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#888888] mb-4">
                  Connect your wallet with at least 15 MNEE for registration.
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <ConnectButton />
                  {isConnected && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Coins className="w-4 h-4 text-[#c9a227]" />
                        <span className="text-[#a0a0a0]">
                          {mneeBalance ? formatMNEE(mneeBalance) : '0'} MNEE
                        </span>
                        {!hasEnoughMnee && mneeBalance !== undefined && (
                          <span className="text-red-400 text-xs">(need 15)</span>
                        )}
                      </div>
                      {step === 1 && (
                        <Button onClick={() => setStep(2)} size="sm" disabled={!hasEnoughMnee}>
                          Continue
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Discord Info & Payment */}
            <Card variant={step >= 2 ? "warm" : "minimal"} padding="lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isSuccess ? "bg-[#c9a227] text-black" : step === 2 ? "bg-[#1a1a1a] text-[#e8e8e8]" : "bg-[#1a1a1a] text-[#666666]"
                  }`}>
                    {isSuccess ? <Check className="w-4 h-4" /> : "2"}
                  </div>
                  <span className={step >= 2 ? "text-[#e8e8e8]" : "text-[#666666]"}>
                    Discord Information & Payment
                  </span>
                </CardTitle>
              </CardHeader>
              {step >= 2 && !isSuccess && (
                <CardContent className="space-y-4">
                  <p className="text-sm text-[#888888]">
                    Enter your Discord User ID and Server ID. Enable Developer Mode in Discord Settings → Advanced to copy IDs.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[#666666] mb-2 uppercase tracking-wider">
                        Your Discord User ID
                      </label>
                      <input
                        type="text"
                        value={discordUserId}
                        onChange={(e) => {
                          setDiscordUserId(e.target.value.replace(/\D/g, ''));
                          setValidationErrors({});
                        }}
                        placeholder="e.g., 123456789012345678"
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-sm text-[#e8e8e8] placeholder-[#444444] focus:outline-none focus:border-[rgba(201,162,39,0.3)] font-mono"
                      />
                      {validationErrors.userId && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.userId}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-[#666666] mb-2 uppercase tracking-wider">
                        Discord Server ID
                      </label>
                      <input
                        type="text"
                        value={serverId}
                        onChange={(e) => {
                          setServerId(e.target.value.replace(/\D/g, ''));
                          setValidationErrors({});
                        }}
                        placeholder="e.g., 123456789012345678"
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-sm text-[#e8e8e8] placeholder-[#444444] focus:outline-none focus:border-[rgba(201,162,39,0.3)] font-mono"
                      />
                      {validationErrors.serverId && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.serverId}</p>
                      )}
                    </div>
                  </div>

                  {/* Transaction info box */}
                  <div className="bg-[#0a0a0a] border border-[rgba(201,162,39,0.2)] rounded-sm p-4">
                    <p className="text-xs text-[#666666] mb-2">Transaction Summary</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888888]">Registration Fee</span>
                      <span className="text-[#c9a227] font-medium">15 MNEE</span>
                    </div>
                    <p className="text-xs text-[#555555] mt-2">
                      You will need to approve MNEE spending first, then confirm the registration transaction.
                    </p>
                  </div>

                  {txError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{txError}</span>
                      <button onClick={reset} className="ml-auto text-xs underline">Try again</button>
                    </div>
                  )}

                  <Button
                    onClick={handleRegister}
                    disabled={!discordUserId.trim() || !serverId.trim() || isLoading || !hasEnoughMnee}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {getStepDescription()}
                      </>
                    ) : (
                      <>
                        <Server className="w-4 h-4" />
                        Register Server (15 MNEE)
                      </>
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Success State */}
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card variant="warm" padding="lg">
                  <CardContent className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-[rgba(201,162,39,0.1)] flex items-center justify-center mx-auto mb-6">
                      <Check className="w-8 h-8 text-[#c9a227]" />
                    </div>
                    <h3 className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-2">
                      Server Registered!
                    </h3>
                    <p className="text-[#888888] mb-6">
                      Your Discord server is now registered with the Commit Protocol.
                    </p>
                    
                    {txHash && (
                      <div className="bg-[#0a0a0a] rounded-sm p-4 mb-6">
                        <p className="text-sm text-[#666666] mb-2">Transaction Hash</p>
                        <a
                          href={`https://etherscan.io/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#c9a227] hover:underline flex items-center justify-center gap-2"
                        >
                          <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    <div className="bg-[#0a0a0a] rounded-sm p-4 mb-6">
                      <p className="text-sm text-[#666666] mb-2">Next Steps</p>
                      <ol className="text-sm text-[#a0a0a0] text-left space-y-2">
                        <li>1. Invite the Commit Protocol bot to your server</li>
                        <li>2. Deposit MNEE to your server balance to fund commitments</li>
                        <li>3. Start creating commitments in Discord!</li>
                      </ol>
                    </div>
                    
                    <div className="flex gap-4 justify-center">
                      <Link href="/dao">
                        <Button variant="gold" size="lg">
                          Go to Dashboard
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
