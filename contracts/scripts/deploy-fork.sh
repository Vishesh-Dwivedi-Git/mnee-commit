#!/bin/bash

# Deploy Commit Protocol to a local Anvil fork
# This script deploys the contracts and funds test accounts with MNEE tokens

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to the project root (one level up from this script)
cd "$(dirname "$0")/.."

echo -e "${YELLOW}=== Commit Protocol Fork Deployment ===${NC}"
echo "Working directory: $(pwd)"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if Anvil is running
if ! curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null; then
    echo -e "${RED}Error: Anvil is not running on http://localhost:8545${NC}"
    echo "Please start Anvil with a fork first:"
    echo "  ./scripts/start-anvil.sh"
    exit 1
fi

echo -e "${GREEN}Anvil detected. Starting deployment...${NC}"
echo ""

# 1. Deploy Contracts
echo -e "${YELLOW}Step 1: Deploying Commit contract...${NC}"
forge script script/DeployLocal.s.sol:DeployLocal \
    --rpc-url http://localhost:8545 \
    --broadcast \
    -vvvv

echo ""
echo -e "${GREEN}Contracts deployed successfully!${NC}"
echo ""

# 2. Setup Test Accounts (Fund with MNEE)
echo -e "${YELLOW}Step 2: Funding test accounts with MNEE...${NC}"
forge script script/DeployLocal.s.sol:SetupTestAccounts \
    --rpc-url http://localhost:8545 \
    --broadcast \
    -vvvv

echo ""
echo -e "${GREEN}=== Fork Deployment & Setup Complete ===${NC}"
echo ""
echo "Test Environment Details:"
echo "- RPC URL: http://localhost:8545"
echo "- MNEE Token: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
echo "- Creator: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10,000 MNEE)"
echo "- Contributor: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10,000 MNEE)"
echo ""
echo "Note: You can find the Commit contract address in the broadcast logs above."
