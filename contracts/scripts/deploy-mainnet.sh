#!/bin/bash

# Deploy Commit Protocol to Ethereum Mainnet
# Uses MNEE token at 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Commit Protocol Mainnet Deployment ===${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Validate required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set${NC}"
    echo "Please set it in .env file"
    exit 1
fi

if [ -z "$ARBITRATOR_ADDRESS" ]; then
    echo -e "${RED}Error: ARBITRATOR_ADDRESS not set${NC}"
    echo "Please set it in .env file"
    exit 1
fi

if [ -z "$ETH_MAINNET_RPC_URL" ]; then
    echo -e "${RED}Error: ETH_MAINNET_RPC_URL not set${NC}"
    echo "Please set it in .env file"
    exit 1
fi

# Confirmation prompt
echo -e "${YELLOW}WARNING: You are about to deploy to ETHEREUM MAINNET${NC}"
echo ""
echo "Deployer: $(cast wallet address $PRIVATE_KEY)"
echo "Arbitrator: $ARBITRATOR_ADDRESS"
echo "MNEE Token: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
echo "RPC: $ETH_MAINNET_RPC_URL"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Starting deployment...${NC}"
echo ""

# Deploy
forge script script/Deploy.s.sol:DeployMainnet \
    --rpc-url $ETH_MAINNET_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Save the contract address to server/.env"
echo "2. Update ARBITRATOR_ADDRESS if needed"
echo "3. Test on mainnet fork before using"
echo "4. Monitor contract on Etherscan"
