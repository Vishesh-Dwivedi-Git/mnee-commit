#!/bin/bash

# Step 1: Start Anvil and Deploy Contracts
# This script starts Anvil and deploys the Commit Protocol

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to the contracts directory
cd "$(dirname "$0")/.."

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Commit Protocol - Step 1: Anvil & Deployment         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check RPC URL
if [ -z "$ETH_MAINNET_RPC_URL" ]; then
    echo -e "${RED}Error: ETH_MAINNET_RPC_URL not set${NC}"
    echo "Please set it in .env file or export it:"
    echo "  export ETH_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
    exit 1
fi

# ============================================================================
# Step 1: Start Anvil
# ============================================================================

echo -e "${YELLOW}[1/2] Starting Anvil with Ethereum Mainnet fork...${NC}"
echo "MNEE Token: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
echo ""

# Kill any existing Anvil process
pkill -f "anvil" || true
sleep 1

# Start Anvil in background
anvil \
    --fork-url "$ETH_MAINNET_RPC_URL" \
    --chain-id 1 \
    --accounts 10 \
    --balance 10000 \
    --port 8545 \
    --host 0.0.0.0 \
    > anvil.log 2>&1 &

ANVIL_PID=$!
echo "Anvil started (PID: $ANVIL_PID)"
echo "Logs: $(pwd)/anvil.log"

# Save PID for later
echo $ANVIL_PID > .anvil.pid

# Wait for Anvil to be ready
echo "Waiting for Anvil to be ready..."
for i in {1..30}; do
    if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Anvil is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Error: Anvil failed to start${NC}"
        cat anvil.log
        exit 1
    fi
    sleep 1
done
echo ""

# ============================================================================
# Step 2: Deploy Contracts
# ============================================================================

echo -e "${YELLOW}[2/2] Deploying Commit Protocol contracts...${NC}"
echo ""

# Deploy using forge script
forge script script/DeployLocal.s.sol:DeployLocal \
    --rpc-url http://localhost:8545 \
    --broadcast \
    -vvv

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deployment Complete! 🎉                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Step:${NC}"
echo "Copy the Commit Protocol contract address from the logs above."
echo "It should look like: 'Commit Protocol: 0x...'"
echo ""
echo "Then run:"
echo -e "${BLUE}  ./scripts/setup-env.sh 0xYOUR_CONTRACT_ADDRESS${NC}"
echo ""
echo "This will update all .env files and fund test wallets."
echo ""
