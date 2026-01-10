"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Eye, FileCode, Scale, ShieldAlert } from "lucide-react";

export function Agents() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020202] via-[#050505] to-[#020202]" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgba(201,162,39,0.1)] to-transparent" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: The Narrative */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-[1px] bg-[#c9a227]" />
              <span className="text-[#c9a227] text-sm tracking-[0.2em] uppercase font-[family-name:var(--font-display)] italic">
                The Silent Observer
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-[family-name:var(--font-display)] font-normal text-[#e8e8e8] mb-8 leading-tight">
              Agents don't judge. <br />
              <span className="text-[#666666]">They witness.</span>
            </h2>

            <div className="space-y-8 text-lg text-[#888888] leading-relaxed">
              <p>
                In traditional systems, you wait for a human to say "Yes." 
                In Commit Protocol, the agents are already reading.
              </p>
              
              <p>
                They parse the specification. They analyze the evidence. 
                They don't block the transaction—they simply <span className="text-[#e8e8e8]">calculate the cost of lying</span>.
              </p>

              <div className="pl-6 border-l border-[rgba(201,162,39,0.2)] space-y-4">
                <div className="flex items-center gap-4">
                  <FileCode className="w-5 h-5 text-[#444444]" />
                  <span className="text-sm text-[#666666]">Reading 14 files...</span>
                </div>
                <div className="flex items-center gap-4">
                  <Scale className="w-5 h-5 text-[#444444]" />
                  <span className="text-sm text-[#666666]">Comparing against spec...</span>
                </div>
                <div className="flex items-center gap-4">
                  <ShieldAlert className="w-5 h-5 text-[#c9a227]" />
                  <span className="text-sm text-[#e8e8e8]">Dispute Probability: <span className="font-mono text-[#c9a227]">0.02%</span></span>
                </div>
              </div>

              <p className="text-sm text-[#666666] italic">
                "If the work matches the spec, the agent makes a dispute mathematically irrational."
              </p>
            </div>
          </motion.div>

          {/* Right: The Visual Metaphor */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {/* The Eye/Lens */}
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Rings */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-[rgba(255,255,255,0.03)] border-dashed"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute inset-8 rounded-full border border-[rgba(255,255,255,0.03)]"
              />
              
              {/* Center Glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-b from-[rgba(201,162,39,0.1)] to-transparent blur-2xl" />
                <div className="relative z-10 w-24 h-24 rounded-full bg-[#050505] border border-[rgba(201,162,39,0.2)] flex items-center justify-center">
                  <Eye className="w-8 h-8 text-[#c9a227] opacity-80" />
                </div>
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 right-0"
              >
                <Card variant="glass" padding="sm" className="w-48 backdrop-blur-md">
                  <CardContent>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase text-[#666666]">Analysis</span>
                      <span className="w-2 h-2 rounded-full bg-green-500/50" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full w-[98%] bg-[#c9a227]" />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#888888]">
                        <span>Match</span>
                        <span>98%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-10 left-0"
              >
                <Card variant="glass" padding="sm" className="w-40 backdrop-blur-md">
                  <CardContent>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-3 h-3 text-[#666666]" />
                      <span className="text-[10px] uppercase text-[#666666]">Risk</span>
                    </div>
                    <p className="text-xs text-[#e8e8e8] font-mono">Low Confidence</p>
                    <p className="text-[10px] text-[#444444]">Dispute unlikely</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
