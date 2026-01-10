#!/bin/bash

# Start Anvil with Ethereum Mainnet fork
# This allows testing with real MNEE tokens (0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF)

set -e

# Change to the project root (one level up from this script)
cd "$(dirname "$0")/.."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check RPC URL
if [ -z "$ETH_MAINNET_RPC_URL" ]; then
    echo "Error: ETH_MAINNET_RPC_URL not set"
    echo "Please set it in .env file or export it:"
    echo "  export ETH_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
    exit 1
fi

echo "Starting Anvil with Ethereum Mainnet fork..."
echo "MNEE Token: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
echo ""
echo "Test accounts will be funded with 10000 ETH each"
echo "Use 'cast' to impersonate MNEE holders and transfer tokens"
echo ""

# Start Anvil with fork
# --fork-url: Fork from mainnet
# --fork-block-number: Optional - pin to specific block for reproducibility
# --accounts: Generate 10 test accounts
# --balance: Each account gets 10000 ETH
# --port: Run on port 8545

anvil \
    --fork-url "$ETH_MAINNET_RPC_URL" \
    --chain-id 1 \
    --accounts 10 \
    --balance 10000 \
    --port 8545 \
    --host 0.0.0.0

# Default test private keys (DO NOT USE IN PRODUCTION):
# Account 0: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# Account 1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
# Account 2: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
