"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/Button";

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal} variant="gold" size="sm">
                    Connect
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="primary" size="sm">
                    Wrong network
                  </Button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm bg-[#1a1a1a] border border-[rgba(201,162,39,0.2)] hover:border-[rgba(201,162,39,0.4)] transition-all duration-500"
                >
                  {/* Address */}
                  <span className="text-sm font-mono text-[#a0a0a0]">
                    {account.displayName}
                  </span>
                  {/* Balance */}
                  {account.displayBalance && (
                    <span className="text-xs text-[#c9a227]">
                      {account.displayBalance}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
