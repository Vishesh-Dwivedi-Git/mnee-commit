"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";

const features = [
  {
    number: "01",
    title: "Payment Is a Clock",
    description: "Once a commitment is funded, settlement is inevitable. There is no “Pay” button. Only a deadline. Time, not people, executes the contract.",
  },
  {
    number: "02",
    title: "Disputes Are Economically Priced",
    description: "Stopping a payment requires staking capital. The cost scales with time remaining, contributor reputation, and AI confidence. Bad faith is expensive by design.",
  },
  {
    number: "03",
    title: "AI Does Not Approve Work",
    description: "AI agents never release funds. They never act as judges. They only raise the economic cost of interference when work matches the specification.",
  },
  {
    number: "04",
    title: "Coordination Where Work Happens",
    description: "Commit Protocol lives in Discord. One server treasury. Role-based task creation. No wallets required for contributors. Settlement on Ethereum, coordination off-chain.",
  },
];

export function Features() {
  return (
    <section id="about" className="relative py-32 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-[family-name:var(--font-display)] font-normal text-[#e8e8e8] mb-6">
            Financial <span className="italic text-[#c9a227]">automation</span>
          </h2>
          <div className="max-w-2xl mx-auto space-y-4 text-[#888888] text-lg">
            <p>A protocol for irreversible work commitments.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#666666] pt-4">
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227]" />
                Funds are escrowed at creation
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227]" />
                Settlement is triggered by time
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227]" />
                AI prices disputes
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227]" />
                The default outcome is paid
              </div>
            </div>
            <p className="pt-6 text-[#e8e8e8] font-[family-name:var(--font-display)] italic">
              "This is not a marketplace. This is financial automation."
            </p>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.15 }}
            >
              <Card 
                variant="minimal" 
                hover="glow" 
                padding="lg"
                className="h-full group relative"
              >
                {/* Gold corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-[rgba(201,162,39,0.1)] to-transparent" />
                </div>

                <CardContent>
                  {/* Number */}
                  <span className="text-[#333333] text-xs tracking-[0.3em] font-mono mb-4 block">
                    {feature.number}
                  </span>

                  {/* Title */}
                  <h3 className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-4 group-hover:text-white transition-colors duration-500">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#888888] leading-relaxed group-hover:text-[#a0a0a0] transition-colors duration-500">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

