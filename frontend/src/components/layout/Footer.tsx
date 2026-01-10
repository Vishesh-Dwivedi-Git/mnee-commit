"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Register DAO", href: "/register" },
      { label: "DAO Dashboard", href: "/dao" },
      { label: "Contributor", href: "/contributor" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Protocol Docs", href: "/docs" },
      { label: "GitHub", href: "https://github.com" },
      { label: "Discord", href: "https://discord.gg" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-[rgba(255,255,255,0.04)] bg-[#020202]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="md:col-span-2"
          >
            <Link href="/" className="group inline-block mb-4">
              <span className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8] group-hover:text-white transition-colors duration-500">
                Commit
                <span className="text-[#c9a227]">.</span>
              </span>
            </Link>
            <p className="text-sm text-[#666666] max-w-xs mb-4">
              Trustless escrow for work commitments. Settlement is the default.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[#444444] text-xs tracking-wider">MNEE</span>
              <code className="text-[10px] text-[#666666] font-mono bg-[#0a0a0a] px-2 py-1 rounded">
                0x8cce...6cF
              </code>
            </div>
          </motion.div>

          {/* Link columns */}
          {footerLinks.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
            >
              <h4 className="text-xs text-[#666666] uppercase tracking-[0.2em] mb-4">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#888888] hover:text-[#e8e8e8] transition-colors duration-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[rgba(201,162,39,0.1)] to-transparent mb-8" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#444444]">
          <p>© {new Date().getFullYear()} Commit Protocol</p>
          <p className="font-[family-name:var(--font-display)] italic text-[#666666]">
            "Designed so fairness is the only equilibrium"
          </p>
        </div>
      </div>
    </footer>
  );
}
