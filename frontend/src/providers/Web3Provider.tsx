"use client";

import * as React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { defineChain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";

import "@rainbow-me/rainbowkit/styles.css";

// Get WalletConnect Project ID from env or use a public demo ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "3fcc6bba6f1de962d911bb5b5c3dba68";

/**
 * Anvil/Foundry local chain (ID 31337)
 * For when running Anvil without --chain-id 1
 */
const anvil = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
  testnet: true,
});

// Configure wallets
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, coinbaseWallet, rainbowWallet, walletConnectWallet],
    },
  ],
  {
    appName: "Commit Protocol",
    projectId,
  }
);

/**
 * Determine RPC URL for mainnet
 * If USE_LOCAL_CHAIN is true, point to localhost:8545 (Anvil with --chain-id 1)
 * This allows using MetaMask's "Ethereum" network with a local fork
 */
const useLocalChain = process.env.NEXT_PUBLIC_USE_LOCAL_CHAIN === "true";

const mainnetRpcUrl = useLocalChain
  ? "http://127.0.0.1:8545"
  : (process.env.NEXT_PUBLIC_RPC_URL || 
     `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo"}`);

// Configure wagmi with multiple chains
const config = createConfig({
  connectors,
  chains: [mainnet, sepolia, anvil],
  transports: {
    // Mainnet - points to localhost when USE_LOCAL_CHAIN=true (for Anvil with --chain-id 1)
    [mainnet.id]: http(mainnetRpcUrl),
    // Sepolia testnet
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo"}`
    ),
    // Anvil local (chain ID 31337) - for Anvil without --chain-id flag
    [anvil.id]: http("http://127.0.0.1:8545"),
  },
});

// Create query client
const queryClient = new QueryClient();

// Custom RainbowKit theme matching our design
const customTheme = darkTheme({
  accentColor: "#c9a227",
  accentColorForeground: "#020202",
  borderRadius: "small",
  fontStack: "system",
  overlayBlur: "small",
});

// Override specific values
customTheme.colors.modalBackground = "#080808";
customTheme.colors.modalBorder = "rgba(255, 255, 255, 0.04)";
customTheme.colors.profileForeground = "#0f0f0f";
customTheme.colors.closeButton = "#888888";
customTheme.colors.closeButtonBackground = "#1a1a1a";
customTheme.colors.connectButtonBackground = "#1a1a1a";
customTheme.colors.connectButtonInnerBackground = "#0f0f0f";
customTheme.colors.connectButtonText = "#e8e8e8";
customTheme.colors.generalBorder = "rgba(255, 255, 255, 0.08)";
customTheme.radii.modal = "4px";
customTheme.radii.menuButton = "4px";
customTheme.radii.connectButton = "4px";

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
