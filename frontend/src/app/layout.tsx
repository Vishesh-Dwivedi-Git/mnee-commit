import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commit Protocol | Trustless Escrow for Discord",
  description: "Create work commitments, submit evidence, and get paid automatically. AI-powered verification. Dynamic dispute resolution. Built on Ethereum with MNEE tokens.",
  keywords: ["escrow", "discord", "ethereum", "MNEE", "smart contracts", "AI verification", "work commitments"],
  authors: [{ name: "Commit Protocol" }],
  openGraph: {
    title: "Commit Protocol | Trustless Escrow for Discord",
    description: "Create work commitments, submit evidence, and get paid automatically. Built on Ethereum.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Commit Protocol",
    description: "Trustless escrow for Discord communities. Built on Ethereum.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#020202] text-white antialiased">
        <Web3Provider>
          {/* Ambient background with noise */}
          <div className="ambient-bg" />
          
          {/* Subtle grid pattern */}
          <div className="grid-pattern" />
          
          {/* Corner decorations */}
          <div className="corner-decoration top-left" />
          <div className="corner-decoration bottom-right" />
          
          {/* Decorative vertical lines */}
          <div className="deco-line left hidden lg:block" />
          <div className="deco-line right hidden lg:block" />
          
          {/* Circle decorations */}
          <div className="deco-circle large hidden md:block" />
          <div className="deco-circle small hidden md:block" />
          
          {/* Diamond accent */}
          <div className="deco-diamond top hidden md:block" />
          
          {/* Floating dust particles */}
          <div className="dust-container">
            <div className="dust-particle" />
            <div className="dust-particle" />
            <div className="dust-particle" />
            <div className="dust-particle" />
            <div className="dust-particle" />
          </div>
          
          {/* Main content */}
          <div className="relative z-10">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
