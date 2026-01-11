#!/bin/bash
# Fund test wallets with MNEE tokens

set -e

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Funding test wallets...${NC}"

# Check Anvil
if ! curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}Error: Anvil not running${NC}"
    exit 1
fi

# Constants
MNEE_TOKEN="0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
MNEE_HOLDER="0x4240781A9ebDB2EB14a183466E8820978b7DA4e2"
RPC_URL="http://127.0.0.1:8545"

# Test accounts
CREATOR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
CONTRIBUTOR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
RELAYER="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

# Amount (10,000 MNEE = 10,000 * 10^18 wei)
AMOUNT="10000000000000000000000"

# Fund function
fund_account() {
    local RECIPIENT=$1
    local NAME=$2
    
    echo "Funding $NAME..."
    
    cast rpc anvil_impersonateAccount $MNEE_HOLDER --rpc-url $RPC_URL > /dev/null
    
    cast send $MNEE_TOKEN \
        "transfer(address,uint256)(bool)" \
        $RECIPIENT \
        $AMOUNT \
        --from $MNEE_HOLDER \
        --rpc-url $RPC_URL \
        --unlocked > /dev/null 2>&1
    
    
    BALANCE=$(cast call $MNEE_TOKEN "balanceOf(address)(uint256)" $RECIPIENT --rpc-url $RPC_URL)
    
    echo -e "${GREEN}✓ $NAME: 10000 MNEE (balance: $BALANCE wei)${NC}"
}

# Fund all accounts
fund_account $CREATOR "Creator"
fund_account $CONTRIBUTOR "Contributor"
fund_account $RELAYER "Relayer"

echo ""
echo -e "${GREEN}✓ All wallets funded${NC}"
