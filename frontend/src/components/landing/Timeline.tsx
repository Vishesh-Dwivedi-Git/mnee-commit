"use client";

import React from "react";
import { motion } from "framer-motion";

const steps = [
  {
    step: "I",
    title: "Register the Treasury",
    description: "A Discord server commits capital once.",
  },
  {
    step: "II",
    title: "Fund the Clock",
    description: "MNEE is deposited into a prepaid balance.",
  },
  {
    step: "III",
    title: "Issue a Commitment",
    description: "Funds move into escrow immediately.",
  },
  {
    step: "IV",
    title: "Submit Evidence",
    description: "Work is delivered with verifiable artifacts.",
  },
  {
    step: "V",
    title: "Let Time Settle",
    description: "If no one pays to stop it, settlement happens automatically.",
  },
];

export function Timeline() {
  return (
    <section id="protocol" className="relative py-32 overflow-hidden">
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080808] to-transparent opacity-50" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-[family-name:var(--font-display)] font-normal text-[#e8e8e8] mb-4">
            The <span className="italic text-[#c9a227]">settlement loop</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[rgba(201,162,39,0.2)] to-transparent hidden md:block" />

          <div className="space-y-16 md:space-y-0">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`relative md:flex md:items-center ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content */}
                <div className={`md:w-1/2 ${index % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16"}`}>
                  <div className="group">
                    {/* Roman numeral */}
                    <span className="text-[#c9a227] text-sm tracking-[0.3em] font-[family-name:var(--font-display)] italic mb-2 block">
                      {item.step}
                    </span>
                    
                    {/* Title */}
                    <h3 className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8] mb-2 group-hover:text-white transition-colors duration-500">
                      {item.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-[#666666] text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Center dot */}
                <div className="hidden md:block absolute left-1/2 -translate-x-1/2 w-2 h-2">
                  <motion.div
                    whileInView={{ scale: [0, 1.2, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                    className="w-2 h-2 rounded-full bg-[#c9a227] shadow-[0_0_10px_rgba(201,162,39,0.5)]"
                  />
                </div>

                {/* Empty space for other side */}
                <div className="hidden md:block md:w-1/2" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
