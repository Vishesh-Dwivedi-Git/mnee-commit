#!/bin/bash
# Start Anvil with Ethereum Mainnet fork

set -e

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check RPC URL
if [ -z "$ETH_MAINNET_RPC_URL" ]; then
    echo -e "${RED}Error: ETH_MAINNET_RPC_URL not set in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting Anvil (Mainnet fork)...${NC}"

# Kill existing Anvil
lsof -ti:8545 | xargs kill -9 2>/dev/null || true
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
echo $ANVIL_PID > .anvil.pid

# Wait for Anvil
echo "Waiting for Anvil..."
for i in {1..30}; do
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Anvil ready (PID: $ANVIL_PID)${NC}"
        echo "Logs: $(pwd)/anvil.log"
        exit 0
    fi
    sleep 1
done

echo -e "${RED}Error: Anvil failed to start${NC}"
cat anvil.log
exit 1
