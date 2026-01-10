"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutGrid, 
  Wallet, 
  FileText, 
  BarChart2, 
  Settings,
  LogOut,
  ChevronLeft,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const daoNavItems = [
  { icon: LayoutGrid, label: "Overview", href: "/dao" },
  { icon: Wallet, label: "Balance", href: "/dao/balance" },
  { icon: FileText, label: "Commitments", href: "/dao/commitments" },
  { icon: BarChart2, label: "Analytics", href: "/dao/analytics" },
  { icon: Users, label: "Contributors", href: "/dao/contributors" },
  { icon: Settings, label: "Settings", href: "/dao/settings" },
];

const contributorNavItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/contributor" },
  { icon: FileText, label: "Work", href: "/contributor/work" },
  { icon: Wallet, label: "Earnings", href: "/contributor/earnings" },
  { icon: BarChart2, label: "Reputation", href: "/contributor/reputation" },
  { icon: Settings, label: "Settings", href: "/contributor/settings" },
];

interface SidebarProps {
  type: "dao" | "contributor";
}

export function Sidebar({ type }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const items = type === "dao" ? daoNavItems : contributorNavItems;

  return (
    <motion.aside
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "fixed top-0 left-0 h-screen bg-[#080808] border-r border-[rgba(255,255,255,0.04)] z-40 transition-all duration-500",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-[rgba(255,255,255,0.04)]">
          <Link href="/" className="group">
            {collapsed ? (
              <span className="text-xl font-[family-name:var(--font-display)] text-[#c9a227]">C</span>
            ) : (
              <span className="text-xl font-[family-name:var(--font-display)] text-[#e8e8e8]">
                Commit<span className="text-[#c9a227]">.</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-sm hover:bg-[rgba(255,255,255,0.03)] text-[#666666] hover:text-[#a0a0a0] transition-all duration-300"
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {items.map((item, i) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-sm transition-all duration-300",
                      isActive
                        ? "bg-[rgba(201,162,39,0.08)] text-[#d4af37] border-l-2 border-[#c9a227]"
                        : "text-[#666666] hover:text-[#a0a0a0] hover:bg-[rgba(255,255,255,0.02)]"
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.04)]">
          {/* Wallet */}
          <div className={cn(
            "mb-4 p-3 rounded-sm bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]",
            collapsed && "p-2"
          )}>
            {collapsed ? (
              <Wallet className="w-4 h-4 text-[#666666] mx-auto" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#1a1a1a] flex items-center justify-center">
                  <span className="text-[#c9a227] text-xs font-mono">0x</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#a0a0a0] font-mono truncate">8cce...6cF</p>
                  <p className="text-xs text-[#444444]">connected</p>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          {!collapsed && (
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[#444444] hover:text-[#666666] transition-colors text-sm">
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
