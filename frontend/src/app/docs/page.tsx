"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Book, Code, Shield, Coins, Users, Clock, Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/Card";

const sections = [
  {
    id: "overview",
    title: "Overview",
    icon: Book,
  },
  {
    id: "token",
    title: "MNEE Token",
    icon: Coins,
  },
  {
    id: "lifecycle",
    title: "Commitment Lifecycle",
    icon: Clock,
  },
  {
    id: "security",
    title: "Security Model",
    icon: Shield,
  },
  {
    id: "integration",
    title: "Integration",
    icon: Code,
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = React.useState("overview");

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0% -60% 0%" }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#020202]">
      <Navbar />

      <main className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[#666666] hover:text-[#a0a0a0] transition-colors mb-8 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            
            <h1 className="text-5xl lg:text-6xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-4">
              Protocol <span className="italic text-[#c9a227]">Documentation</span>
            </h1>
            <p className="text-[#666666] text-lg max-w-2xl">
              Technical specification for the Commit Protocol. Optimistic agentic settlement for on-chain work commitments.
            </p>
          </motion.div>

          <div className="flex gap-12">
            {/* Sidebar Navigation */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block w-48 flex-shrink-0"
            >
              <nav className="sticky top-32 space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`flex items-center gap-2 py-2 px-3 rounded-sm text-sm transition-all duration-300 ${
                      activeSection === section.id
                        ? "text-[#c9a227] bg-[rgba(201,162,39,0.08)]"
                        : "text-[#666666] hover:text-[#a0a0a0]"
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.title}
                  </a>
                ))}
              </nav>
            </motion.aside>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex-1 max-w-3xl"
            >
              {/* Overview */}
              <section id="overview" className="mb-20">
                <h2 className="text-3xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-6">
                  Overview
                </h2>
                
                <div className="prose-custom space-y-6">
                  <p className="text-[#888888] leading-relaxed">
                    Commit Protocol is a <span className="text-[#a0a0a0]">trustless escrow system</span> for work commitments that combines smart contract escrow, Discord server integration, AI-powered verification, and dynamic economic security.
                  </p>

                  <Card variant="warm" padding="md">
                    <CardContent>
                      <h4 className="text-lg font-[family-name:var(--font-display)] text-[#e8e8e8] mb-4">
                        Core Components
                      </h4>
                      <ul className="space-y-3">
                        {[
                          "Smart contract escrow (MNEE ERC-20 tokens)",
                          "Discord server integration (prepaid balance)",
                          "AI-powered verification (automated review)",
                          "Optimistic settlement (automatic release)",
                          "Dynamic stakes (reputation-based)"
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-[#888888]">
                            <Check className="w-4 h-4 text-[#c9a227] mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Token */}
              <section id="token" className="mb-20">
                <h2 className="text-3xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-6">
                  MNEE Token
                </h2>
                
                <div className="space-y-6">
                  <p className="text-[#888888] leading-relaxed">
                    All transactions within the protocol use the MNEE ERC-20 token on Ethereum mainnet.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Network", value: "Ethereum Mainnet" },
                      { label: "Standard", value: "ERC-20" },
                      { label: "Decimals", value: "18" },
                      { label: "Registration Fee", value: "15 MNEE" },
                    ].map((item) => (
                      <Card key={item.label} variant="minimal" padding="md">
                        <CardContent>
                          <p className="text-[10px] text-[#444444] uppercase tracking-[0.2em] mb-1">
                            {item.label}
                          </p>
                          <p className="text-lg font-[family-name:var(--font-display)] text-[#e8e8e8]">
                            {item.value}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card variant="glass" padding="md">
                    <CardContent className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#666666] mb-1">Contract Address</p>
                        <code className="text-sm font-mono text-[#a0a0a0]">
                          0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
                        </code>
                      </div>
                      <a
                        href="https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c9a227] hover:text-[#f0d060] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Lifecycle */}
              <section id="lifecycle" className="mb-20">
                <h2 className="text-3xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-6">
                  Commitment Lifecycle
                </h2>
                
                <div className="space-y-8">
                  <p className="text-[#888888] leading-relaxed">
                    Every commitment follows a deterministic state machine from creation to settlement.
                  </p>

                  <div className="space-y-4">
                    {[
                      { state: "FUNDED", desc: "MNEE deducted from server balance, commitment created", trigger: "createCommitment()" },
                      { state: "SUBMITTED", desc: "Contributor submitted work with evidence CID", trigger: "submitWork()" },
                      { state: "DISPUTED", desc: "Creator opened dispute with required stake", trigger: "openDispute()" },
                      { state: "SETTLED", desc: "Funds released to contributor", trigger: "batchSettle()" },
                      { state: "REFUNDED", desc: "Funds returned to server balance", trigger: "resolveDispute()" },
                    ].map((item, index) => (
                      <motion.div
                        key={item.state}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                      >
                        <Card variant="minimal" hover="border" padding="md">
                          <CardContent className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-sm bg-[#1a1a1a] flex items-center justify-center text-[#c9a227] text-xs font-mono">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono text-sm text-[#e8e8e8]">{item.state}</span>
                                <code className="text-[10px] text-[#666666] font-mono">{item.trigger}</code>
                              </div>
                              <p className="text-sm text-[#666666]">{item.desc}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Security */}
              <section id="security" className="mb-20">
                <h2 className="text-3xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-6">
                  Security Model
                </h2>
                
                <div className="space-y-6">
                  <p className="text-[#888888] leading-relaxed">
                    The protocol uses a <span className="text-[#a0a0a0]">secure relayer pattern</span> where the Discord bot wallet is the only authorized caller, verifying Discord roles off-chain before executing on-chain transactions.
                  </p>

                  <Card variant="warm" padding="lg">
                    <CardContent>
                      <h4 className="text-lg font-[family-name:var(--font-display)] text-[#e8e8e8] mb-4">
                        Trust Assumptions
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <Shield className="w-4 h-4 text-[#c9a227] mt-0.5" />
                          <span className="text-[#888888]">Bot private key is secure (only way to call contract)</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Users className="w-4 h-4 text-[#c9a227] mt-0.5" />
                          <span className="text-[#888888]">Discord API correctly reports user roles</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Code className="w-4 h-4 text-[#c9a227] mt-0.5" />
                          <span className="text-[#888888]">Contract trusts relayer to have verified permissions</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <h4 className="text-lg font-[family-name:var(--font-display)] text-[#e8e8e8] pt-4">
                    Role-Based Access
                  </h4>
                  
                  <div className="grid gap-4">
                    {[
                      { role: "Server Admin", desc: "Registered during server registration. Can deposit/withdraw balance." },
                      { role: "commit-creator", desc: "Discord role. Can create commitments using server balance." },
                      { role: "Contributor", desc: "Any Discord user with wallet. Can submit work and receive payments." },
                    ].map((item) => (
                      <Card key={item.role} variant="minimal" padding="md">
                        <CardContent>
                          <p className="text-[#e8e8e8] font-mono text-sm mb-1">{item.role}</p>
                          <p className="text-[#666666] text-sm">{item.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </section>

              {/* Integration */}
              <section id="integration" className="mb-20">
                <h2 className="text-3xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-6">
                  Integration
                </h2>
                
                <div className="space-y-6">
                  <p className="text-[#888888] leading-relaxed">
                    Quick start for integrating the Commit Protocol into your Discord server.
                  </p>

                  <div className="space-y-4">
                    <h4 className="text-lg font-[family-name:var(--font-display)] text-[#e8e8e8]">
                      Quick Start
                    </h4>
                    
                    <Card variant="glass" padding="lg">
                      <CardContent className="space-y-4">
                        <div className="flex items-start gap-4">
                          <span className="text-[#c9a227] font-[family-name:var(--font-display)] text-lg italic">I.</span>
                          <div>
                            <p className="text-[#e8e8e8] mb-1">Invite the bot</p>
                            <p className="text-sm text-[#666666]">Add the Commit Protocol bot to your Discord server</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <span className="text-[#c9a227] font-[family-name:var(--font-display)] text-lg italic">II.</span>
                          <div>
                            <p className="text-[#e8e8e8] mb-1">Register your server</p>
                            <p className="text-sm text-[#666666]">Pay 15 MNEE registration fee to activate</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <span className="text-[#c9a227] font-[family-name:var(--font-display)] text-lg italic">III.</span>
                          <div>
                            <p className="text-[#e8e8e8] mb-1">Deposit MNEE</p>
                            <p className="text-sm text-[#666666]">Fund your server&apos;s escrow balance</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <span className="text-[#c9a227] font-[family-name:var(--font-display)] text-lg italic">IV.</span>
                          <div>
                            <p className="text-[#e8e8e8] mb-1">Create commitments</p>
                            <p className="text-sm text-[#666666]">Use bot commands to create and manage work</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="pt-8">
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#1a1a1a] border border-[rgba(201,162,39,0.2)] text-[#e8e8e8] hover:border-[rgba(201,162,39,0.4)] hover:text-white transition-all duration-500"
                    >
                      <Code className="w-4 h-4" />
                      View on GitHub
                      <ExternalLink className="w-3 h-3 text-[#666666]" />
                    </a>
                  </div>
                </div>
              </section>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
