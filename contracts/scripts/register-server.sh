#!/bin/bash

# Register Discord server on the contract
# This script registers a test Discord server and deposits initial balance

set -e

GUILD_ID="1111222233334444190"
ADMIN_DISCORD_ID="123456789"
CONTRACT_ADDRESS="0xa50EaB9e3F5653Ba000392acf3AA06A3D7Ab9F78"
MNEE_TOKEN="0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
RPC_URL="http://127.0.0.1:8545"

# Account #0 (has MNEE tokens)
DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
DEPLOYER_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

echo "=== Registering Discord Server ==="
echo "Guild ID: $GUILD_ID"
echo "Contract: $CONTRACT_ADDRESS"
echo ""

# 1. Approve MNEE for registration fee (15 MNEE)
echo "Step 1: Approving 15 MNEE for registration fee..."
cast send $MNEE_TOKEN "approve(address,uint256)" $CONTRACT_ADDRESS 15000000000000000000 \
  --private-key $DEPLOYER_KEY \
  --rpc-url $RPC_URL

# 2. Register server
echo "Step 2: Registering server..."
cast send $CONTRACT_ADDRESS "registerServer(uint256,uint256)" $GUILD_ID $ADMIN_DISCORD_ID \
  --private-key $DEPLOYER_KEY \
  --rpc-url $RPC_URL

# 3. Approve MNEE for initial deposit (100 MNEE)
echo "Step 3: Approving 100 MNEE for initial deposit..."
cast send $MNEE_TOKEN "approve(address,uint256)" $CONTRACT_ADDRESS 100000000000000000000 \
  --private-key $DEPLOYER_KEY \
  --rpc-url $RPC_URL

# 4. Deposit to server
echo "Step 4: Depositing 100 MNEE to server balance..."
cast send $CONTRACT_ADDRESS "depositToServer(uint256,uint256)" $GUILD_ID 100000000000000000000 \
  --private-key $DEPLOYER_KEY \
  --rpc-url $RPC_URL

# 5. Check balance
echo ""
echo "=== Registration Complete ==="
cast call $CONTRACT_ADDRESS "getServerBalance(uint256)" $GUILD_ID --rpc-url $RPC_URL

echo ""
echo "Server registered and funded successfully!"
