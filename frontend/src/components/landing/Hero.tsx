"use client";

import React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 50;
    const y = (e.clientY - rect.top - rect.height / 2) / 50;
    mouseX.set(x);
    mouseY.set(y);
  };

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Ambient Background */}
      <div className="ambient-bg" />
      
      {/* Subtle gold glow */}
      <motion.div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(ellipse, rgba(201,162,39,0.08) 0%, transparent 60%)",
          x: springX,
          y: springY,
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
          className="text-[#666666] text-sm tracking-[0.3em] uppercase mb-8"
        >
          Escrow without discretion
        </motion.p>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-[family-name:var(--font-display)] font-normal text-[#e8e8e8] leading-[1.1] mb-8 tracking-tight"
        >
          Settlement is the default.
          <br />
          Agents observe. They don't{" "}
          <motion.span
            className="italic text-gold-shimmer inline-block"
            whileHover={{ x: 3 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            decide
          </motion.span>
          .
        </motion.h1>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="max-w-2xl mx-auto mb-12 space-y-6"
        >
          <p className="text-[#888888] text-lg sm:text-xl leading-relaxed">
            A financial automation protocol where work commitments settle automatically — witnessed by AI, settled by time.
          </p>
          
          <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent mx-auto opacity-30" />
          
          <p className="text-[#e8e8e8] text-lg font-[family-name:var(--font-display)] italic">
            "In Commit Protocol, you don't approve payments.
            <br />
            You only pay to interfere with them."
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/docs">
            <Button variant="ghost" size="lg" className="text-[#888888] hover:text-[#e8e8e8]">
              [ Read the Protocol ]
            </Button>
          </Link>
          <Link href="/dao">
            <Button size="lg" variant="gold" className="group min-w-[160px]">
              <span>[ Enter App ]</span>
            </Button>
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-[1px] h-12 bg-gradient-to-b from-[#c9a227] to-transparent opacity-40"
          />
        </motion.div>
      </div>
    </section>
  );
}
