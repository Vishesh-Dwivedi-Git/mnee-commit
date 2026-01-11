#!/bin/bash

# All-in-One Local Development Setup
# This script:
# 1. Starts Anvil with mainnet fork
# 2. Deploys Commit Protocol contracts
# 3. Updates .env files with contract address
# 4. Funds test wallets with MNEE tokens

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
echo -e "${BLUE}║  Commit Protocol - Local Development Setup (All-in-One)  ║${NC}"
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

echo -e "${YELLOW}[1/4] Starting Anvil with Ethereum Mainnet fork...${NC}"
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

echo -e "${YELLOW}[2/4] Deploying Commit Protocol contracts...${NC}"
echo ""

# Deploy using forge script
DEPLOY_OUTPUT=$(forge script script/DeployLocal.s.sol:DeployLocal \
    --rpc-url http://localhost:8545 \
    --broadcast \
    -vvv 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract contract address from deployment output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Contract Address: \K0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    # Try alternative pattern
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '(?<=Deployed to: )0x[a-fA-F0-9]{40}' | head -1)
fi

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}Error: Could not extract contract address from deployment${NC}"
    echo "Please check the deployment logs above"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Contract deployed at: $CONTRACT_ADDRESS${NC}"
echo ""

# ============================================================================
# Step 3: Update .env Files
# ============================================================================

echo -e "${YELLOW}[3/4] Updating .env files with contract address...${NC}"

# Update contracts/.env
if [ -f .env ]; then
    # Remove old CONTRACT_ADDRESS if exists
    sed -i '/^CONTRACT_ADDRESS=/d' .env
    # Add new CONTRACT_ADDRESS
    echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> .env
    echo -e "${GREEN}✓ Updated contracts/.env${NC}"
fi

# Update server/.env
SERVER_ENV="../server/.env"
if [ -f "$SERVER_ENV" ]; then
    sed -i '/^CONTRACT_ADDRESS=/d' "$SERVER_ENV"
    echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> "$SERVER_ENV"
    echo -e "${GREEN}✓ Updated server/.env${NC}"
else
    echo -e "${YELLOW}⚠ server/.env not found, skipping${NC}"
fi

# Update bot/.env
BOT_ENV="../bot/.env"
if [ -f "$BOT_ENV" ]; then
    sed -i '/^CONTRACT_ADDRESS=/d' "$BOT_ENV"
    echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> "$BOT_ENV"
    echo -e "${GREEN}✓ Updated bot/.env${NC}"
else
    echo -e "${YELLOW}⚠ bot/.env not found, skipping${NC}"
fi

# Update frontend/.env.local
FRONTEND_ENV="../frontend/.env.local"
if [ -f "$FRONTEND_ENV" ]; then
    sed -i '/^NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS=/d' "$FRONTEND_ENV"
    echo "NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> "$FRONTEND_ENV"
    echo -e "${GREEN}✓ Updated frontend/.env.local${NC}"
else
    echo -e "${YELLOW}⚠ frontend/.env.local not found, skipping${NC}"
fi

echo ""

# ============================================================================
# Step 4: Fund Test Wallets with MNEE
# ============================================================================

echo -e "${YELLOW}[4/4] Funding test wallets with MNEE tokens...${NC}"
echo ""

# MNEE Token Contract
MNEE_TOKEN="0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"

# Known MNEE holder (AscendEX 7 with ~162k MNEE)
MNEE_HOLDER="0x4240781A9ebDB2EB14a183466E8820978b7DA4e2"

# Test accounts (from Anvil default accounts)
CREATOR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
CONTRIBUTOR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
RELAYER="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

# Amount to fund (10,000 MNEE each)
AMOUNT_WEI=$(cast to-wei 10000 ether)

RPC_URL="http://127.0.0.1:8545"

# Function to fund an account
fund_account() {
    local RECIPIENT=$1
    local NAME=$2
    
    echo "Funding $NAME ($RECIPIENT)..."
    
    # Impersonate holder
    cast rpc anvil_impersonateAccount $MNEE_HOLDER --rpc-url $RPC_URL > /dev/null
    
    # Transfer tokens
    cast send $MNEE_TOKEN \
        "transfer(address,uint256)(bool)" \
        $RECIPIENT \
        $AMOUNT_WEI \
        --from $MNEE_HOLDER \
        --rpc-url $RPC_URL \
        --unlocked > /dev/null 2>&1
    
    # Stop impersonating
    cast rpc anvil_stopImpersonatingAccount $MNEE_HOLDER --rpc-url $RPC_URL > /dev/null
    
    # Verify balance
    BALANCE=$(cast call $MNEE_TOKEN "balanceOf(address)(uint256)" $RECIPIENT --rpc-url $RPC_URL)
    BALANCE_MNEE=$(cast from-wei $BALANCE ether)
    
    echo -e "${GREEN}✓ $NAME funded with $BALANCE_MNEE MNEE${NC}"
}

# Fund all test accounts
fund_account $CREATOR "Creator"
fund_account $CONTRIBUTOR "Contributor"
fund_account $RELAYER "Relayer"

echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete! 🎉                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Environment Details:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RPC URL:           http://localhost:8545"
echo "Chain ID:          1 (Mainnet fork)"
echo "Commit Contract:   $CONTRACT_ADDRESS"
echo "MNEE Token:        $MNEE_TOKEN"
echo ""
echo -e "${BLUE}Test Accounts (each with 10,000 MNEE):${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Creator:           $CREATOR"
echo "Contributor:       $CONTRIBUTOR"
echo "Relayer:           $RELAYER"
echo ""
echo -e "${BLUE}Private Keys (Anvil defaults - DO NOT USE IN PRODUCTION):${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Creator:     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "Contributor: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
echo "Relayer:     0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Start the server:    cd ../server && npm run dev"
echo "2. Start the bot:       cd ../bot && node index.js"
echo "3. Start the frontend:  cd ../frontend && npm run dev"
echo ""
echo -e "${YELLOW}To stop Anvil:${NC}"
echo "  kill $ANVIL_PID"
echo "  or: pkill -f anvil"
echo ""
echo -e "${GREEN}Happy developing! 🚀${NC}"
