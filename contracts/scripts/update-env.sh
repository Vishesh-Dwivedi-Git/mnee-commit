#!/bin/bash
# Update .env files with contract address
# Usage: ./update-env.sh <CONTRACT_ADDRESS>

set -e

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Validate input
if [ -z "$1" ]; then
    echo -e "${RED}Error: Contract address required${NC}"
    echo "Usage: $0 <CONTRACT_ADDRESS>"
    exit 1
fi

CONTRACT_ADDRESS=$1

if [[ ! $CONTRACT_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "${RED}Error: Invalid address format${NC}"
    exit 1
fi

echo -e "${YELLOW}Updating .env files...${NC}"
echo "Contract: $CONTRACT_ADDRESS"
echo ""

# Update contracts/.env
if [ -f .env ]; then
    sed -i '/^CONTRACT_ADDRESS=/d' .env
    echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> .env
    echo -e "${GREEN}✓ contracts/.env${NC}"
fi

# Update server/.env
if [ -f ../server/.env ]; then
    sed -i '/^CONTRACT_ADDRESS=/d' ../server/.env
    echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> ../server/.env
    echo -e "${GREEN}✓ server/.env${NC}"
fi

# Update bot/.env
if [ -f ../bot/.env ]; then
    sed -i '/^CONTRACT_ADDRESS=/d' ../bot/.env
    echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> ../bot/.env
    echo -e "${GREEN}✓ bot/.env${NC}"
fi

# Update frontend/.env.local or frontend/.env
if [ -f ../frontend/.env.local ]; then
    sed -i '/^NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS=/d' ../frontend/.env.local
    echo "NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> ../frontend/.env.local
    echo -e "${GREEN}✓ frontend/.env.local${NC}"
elif [ -f ../frontend/.env ]; then
    sed -i '/^NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS=/d' ../frontend/.env
    echo "NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> ../frontend/.env
    echo -e "${GREEN}✓ frontend/.env${NC}"
else
    echo -e "${YELLOW}⚠ frontend/.env not found, skipping${NC}"
fi

echo ""
echo -e "${GREEN}✓ All .env files updated${NC}"
