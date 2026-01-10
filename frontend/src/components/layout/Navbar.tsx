"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X, Plus } from "lucide-react";
import { WalletButton } from "@/components/web3/WalletButton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Protocol", href: "/docs" },
  { label: "DAO Dashboard", href: "/dao" },
  { label: "Contributor", href: "/contributor" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-700",
        scrolled
          ? "bg-[#020202]/90 backdrop-blur-md border-b border-[rgba(255,255,255,0.04)]"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Artistic serif */}
          <Link href="/" className="group">
            <motion.span 
              className="text-2xl font-[family-name:var(--font-display)] text-[#e8e8e8] tracking-tight transition-all duration-500 group-hover:text-white"
              whileHover={{ letterSpacing: "0.02em" }}
            >
              Commit
              <span className="text-[#c9a227] font-light italic">.</span>
            </motion.span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              >
                <Link
                  href={item.href}
                  className="text-[#888888] hover:text-[#e8e8e8] transition-colors duration-500 text-sm tracking-wide relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gradient-to-r from-[#c9a227] to-transparent group-hover:w-full transition-all duration-500" />
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Actions */}
          <motion.div 
            className="hidden md:flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Link href="/register">
              <Button variant="gold" size="sm">
                <Plus className="w-4 h-4" />
                Register DAO
              </Button>
            </Link>
            <WalletButton />
          </motion.div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-[#888888] hover:text-white transition-colors p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden py-6 border-t border-[rgba(255,255,255,0.04)]"
          >
            <nav className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[#888888] hover:text-white transition-colors py-2 text-lg font-[family-name:var(--font-display)]"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-[rgba(255,255,255,0.04)] space-y-4">
                <Link href="/register" onClick={() => setIsOpen(false)}>
                  <Button variant="gold" size="sm" className="w-full">
                    <Plus className="w-4 h-4" />
                    Register DAO
                  </Button>
                </Link>
                <WalletButton />
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
