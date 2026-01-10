"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020202] via-[#050505] to-[#020202]" />
      
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgba(201,162,39,0.2)] to-transparent" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[radial-gradient(ellipse,rgba(201,162,39,0.05)_0%,transparent_60%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <span className="w-8 h-[1px] bg-[#c9a227]" />
          <span className="text-[#c9a227] text-sm tracking-[0.2em] uppercase font-[family-name:var(--font-display)]">
            Get Started
          </span>
          <span className="w-8 h-[1px] bg-[#c9a227]" />
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-6 leading-tight"
        >
          Ready to <span className="italic text-[#c9a227]">commit</span>?
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[#888888] text-lg max-w-2xl mx-auto mb-12"
        >
          Register your DAO to start creating trustless work commitments. 
          Contributors can link their wallet to receive payments automatically.
        </motion.p>

        {/* Two paths */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto"
        >
          {/* DAO Path */}
          <Link href="/register" className="group">
            <div className="relative p-8 bg-[rgba(201,162,39,0.03)] border border-[rgba(201,162,39,0.15)] rounded-sm transition-all duration-500 hover:bg-[rgba(201,162,39,0.06)] hover:border-[rgba(201,162,39,0.25)]">
              <div className="w-12 h-12 rounded-full bg-[rgba(201,162,39,0.1)] flex items-center justify-center mb-4 mx-auto">
                <Plus className="w-6 h-6 text-[#c9a227]" />
              </div>
              <h3 className="text-xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-2">
                Register DAO
              </h3>
              <p className="text-sm text-[#666666] mb-4">
                Add your Discord server and start funding commitments
              </p>
              <span className="inline-flex items-center gap-2 text-[#c9a227] text-sm group-hover:gap-3 transition-all">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* Contributor Path */}
          <Link href="/contributor" className="group">
            <div className="relative p-8 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-sm transition-all duration-500 hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)]">
              <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-[#888888]" />
              </div>
              <h3 className="text-xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-2">
                I'm a Contributor
              </h3>
              <p className="text-sm text-[#666666] mb-4">
                Link your wallet and view your active commitments
              </p>
              <span className="inline-flex items-center gap-2 text-[#888888] text-sm group-hover:gap-3 group-hover:text-[#e8e8e8] transition-all">
                View Dashboard <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
