#!/bin/bash
# Deploy Commit Protocol contracts to Anvil

set -e

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Deploying Commit Protocol...${NC}"

# Check Anvil
if ! curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}Error: Anvil not running${NC}"
    echo "Run: ./scripts/start-anvil.sh"
    exit 1
fi

# Deploy
forge script script/DeployLocal.s.sol:DeployLocal \
    --rpc-url http://localhost:8545 \
    --broadcast \
    -vvv

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Find the contract address in logs above:"
echo "  'Commit Protocol: 0x...'"
