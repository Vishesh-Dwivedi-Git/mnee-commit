#!/bin/bash

# Test deployment on Anvil fork before mainnet
# This simulates mainnet deployment without spending real gas

set -e

echo "=== Testing Mainnet Deployment on Fork ==="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check RPC URL
if [ -z "$ETH_MAINNET_RPC_URL" ]; then
    echo "Error: ETH_MAINNET_RPC_URL not set"
    exit 1
fi

# Start Anvil in background
echo "Starting Anvil fork..."
anvil --fork-url $ETH_MAINNET_RPC_URL --port 8545 &
ANVIL_PID=$!

# Wait for Anvil to start
sleep 3

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping Anvil..."
    kill $ANVIL_PID 2>/dev/null || true
}
trap cleanup EXIT

# Deploy to fork
echo ""
echo "Deploying to fork..."
forge script script/Deploy.s.sol:DeployMainnet \
    --rpc-url http://localhost:8545 \
    --broadcast \
    -vvv

echo ""
echo "=== Deployment Test Complete ==="
echo "If successful, you can now deploy to mainnet using:"
echo "  ./scripts/deploy-mainnet.sh"
