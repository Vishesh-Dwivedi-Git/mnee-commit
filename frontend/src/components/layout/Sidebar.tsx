"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutGrid, 
  Wallet, 
  FileText, 
  LogOut,
  ChevronLeft,
  Home,
  Plus,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisconnect, useAccount } from "wagmi";

// DAO nav - single dashboard with all features
const daoNavItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dao", requiresGuildId: true },
  { icon: Plus, label: "Register New", href: "/register", requiresGuildId: false },
];

// Contributor nav - single dashboard
const contributorNavItems = [
  { icon: LayoutGrid, label: "My Work", href: "/contributor", requiresGuildId: false },
];

// Common items
const commonItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: FileText, label: "Documentation", href: "/docs" },
];

interface SidebarProps {
  type: "dao" | "contributor";
}

// Loading fallback
function SidebarLoading() {
  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-[#080808] border-r border-[rgba(255,255,255,0.04)] z-40 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#666666]" />
    </div>
  );
}

function SidebarInner({ type }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId");
  const [collapsed, setCollapsed] = React.useState(false);
  const { disconnect } = useDisconnect();
  const { address } = useAccount();

  const items = type === "dao" ? daoNavItems : contributorNavItems;

  // Build href with guildId preserved if needed
  const buildHref = (item: typeof items[0]) => {
    if ('requiresGuildId' in item && item.requiresGuildId && guildId) {
      return `${item.href}?guildId=${guildId}`;
    }
    return item.href;
  };

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

        {/* Guild ID Display (for DAO) */}
        {type === "dao" && guildId && !collapsed && (
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
            <p className="text-[10px] text-[#666666] uppercase tracking-wider mb-1">Server ID</p>
            <p className="text-xs font-mono text-[#888888] truncate">{guildId}</p>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {/* Section: Dashboard */}
          {!collapsed && (
            <p className="text-[10px] text-[#444444] uppercase tracking-wider px-3 mb-2">
              {type === "dao" ? "Server" : "My Dashboard"}
            </p>
          )}
          
          {items.map((item, i) => {
            const href = buildHref(item);
            const isActive = pathname === item.href || (item.href.startsWith(pathname) && pathname !== "/");
            
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link href={href}>
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

          {/* Divider */}
          <div className="my-4 border-t border-[rgba(255,255,255,0.04)]" />
          
          {/* Common Links */}
          {!collapsed && (
            <p className="text-[10px] text-[#444444] uppercase tracking-wider px-3 mb-2">
              Quick Links
            </p>
          )}
          
          {commonItems.map((item, i) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: (items.length + i) * 0.05 }}
            >
              <Link href={item.href}>
                <div className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#555555] hover:text-[#888888] hover:bg-[rgba(255,255,255,0.02)] transition-all duration-300">
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Bottom Section - Wallet */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.04)]">
          {address && (
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
                    <p className="text-sm text-[#a0a0a0] font-mono truncate">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                    <p className="text-xs text-[#444444]">connected</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disconnect */}
          {!collapsed && address && (
            <button 
              onClick={() => disconnect()}
              className="w-full flex items-center gap-2 px-3 py-2 text-[#444444] hover:text-[#666666] transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

// Export with Suspense wrapper
export function Sidebar({ type }: SidebarProps) {
  return (
    <Suspense fallback={<SidebarLoading />}>
      <SidebarInner type={type} />
    </Suspense>
  );
}
