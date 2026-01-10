# Development Setup Guide

Quick guide to set up the MNEE Commit Protocol for local development with forked mainnet.

## Prerequisites

- Node.js 18+ and npm
- Foundry (for Anvil and contract deployment)
- MetaMask browser extension

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Install contract dependencies
cd contracts
forge install

# Install bot dependencies
cd ../bot
npm install

# Install server dependencies
cd ../server
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**contracts/.env**
```env
# Get from https://dashboard.alchemy.com/
ETH_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Deployer private key (use Anvil test key for local dev)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Arbitrator address (can be same as deployer for testing)
ARBITRATOR_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# MNEE Token (mainnet address - will exist on fork)
MNEE_TOKEN_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
```

**frontend/.env**
```env
# Get from https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Alchemy API key
NEXT_PUBLIC_ALCHEMY_API_KEY=YOUR_API_KEY

# Contract address (will be set after deployment)
NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS=0x...

# MNEE token address
NEXT_PUBLIC_MNEE_TOKEN_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

# Enable local chain mode
NEXT_PUBLIC_USE_LOCAL_CHAIN=true
```

**server/.env**
```env
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/commit-protocol

# Contract configuration
COMMIT_CONTRACT_ADDRESS=0x...  # Set after deployment
MNEE_TOKEN_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
RPC_URL=http://127.0.0.1:8545

# Bot wallet (use Anvil test account for local dev)
BOT_WIF=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BOT_WALLET_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# IPFS (Pinata)
PINATA_JWT=your_pinata_jwt

# Server port
PORT=3001
```

**bot/.env**
```env
# Discord bot token
DISCORD_TOKEN=your_discord_bot_token

# Server URL
SERVER_URL=http://localhost:3001
```

## Starting Development Environment

### Step 1: Start Anvil (Forked Mainnet)

```bash
cd contracts
./scripts/start-anvil.sh
```

This starts Anvil with:
- Chain ID: 1 (mainnet)
- Fork: Ethereum mainnet (with real MNEE token)
- RPC: http://127.0.0.1:8545
- 10 test accounts with 10,000 ETH each

**Keep this terminal running.**

### Step 2: Deploy Contracts

In a new terminal:

```bash
cd contracts
./scripts/deploy-fork.sh
```

This will:
1. Deploy the Commit Protocol contract
2. Fund test accounts with MNEE tokens

**Copy the contract address** from the output and update:
- `frontend/.env` → `NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS`
- `server/.env` → `COMMIT_CONTRACT_ADDRESS`

### Step 3: Fund Test Wallet with MNEE (Optional)

If you need more MNEE:

```bash
cd contracts
./scripts/fund-test-wallet.sh 1000 0xYourAddress
```

### Step 4: Start Backend Server

```bash
cd server
npm run dev
```

Server runs on http://localhost:3001

### Step 5: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:3000

### Step 6: Start Discord Bot (Optional)

```bash
cd bot
npm start
```

## MetaMask Setup

### Option 1: Use Ethereum Mainnet with Local RPC (Recommended)

1. Open MetaMask → Settings → Networks
2. Select "Ethereum Mainnet"
3. Click "Edit"
4. Change RPC URL to: `http://127.0.0.1:8545`
5. Save

Now when you connect to "Ethereum Mainnet" in MetaMask, it uses your local fork!

### Option 2: Add Custom Network

1. Open MetaMask → Settings → Networks → Add Network
2. Fill in:
   - Network Name: `Anvil Fork`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1`
   - Currency Symbol: `ETH`
3. Save

### Import Test Account

Import the first Anvil test account to MetaMask:

```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This account will have:
- 10,000 ETH
- 1,000 MNEE (after running deploy-fork.sh)

## Testing the Flow

1. **Open frontend**: http://localhost:3000
2. **Connect wallet** (MetaMask with Anvil account)
3. **Register a server**:
   - Go to `/register`
   - Enter Discord User ID (17-19 digits)
   - Enter Server ID (17-19 digits)
   - Click "Register Server (15 MNEE)"
   - Approve MNEE spending in MetaMask
   - Confirm registration transaction
4. **Fund server balance**:
   - Go to `/dao`
   - Click "Deposit" on balance card
   - Enter amount and confirm

## Troubleshooting

### "Internal JSON-RPC error" when approving MNEE

- Make sure Anvil is running with `--chain-id 1`
- Verify MetaMask RPC URL is exactly `http://127.0.0.1:8545`
- Check you're connected to the right network in MetaMask
- Try disconnecting and reconnecting wallet

### "Contract address not configured"

- Make sure you deployed contracts and copied the address
- Update `NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS` in `frontend/.env`
- Restart frontend dev server

### MNEE balance shows 0

- Run `./scripts/fund-test-wallet.sh` to get MNEE
- Make sure `NEXT_PUBLIC_USE_LOCAL_CHAIN=true` in frontend/.env
- Verify you're on chain ID 1 in MetaMask

### Frontend can't read contract

- Check `NEXT_PUBLIC_COMMIT_CONTRACT_ADDRESS` is set
- Verify contract was deployed (check Anvil logs)
- Make sure Anvil is still running

## Useful Commands

```bash
# Check MNEE balance
cast call 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF \
  "balanceOf(address)(uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url http://127.0.0.1:8545

# Check server info
cast call $CONTRACT_ADDRESS \
  "servers(uint256)" \
  YOUR_GUILD_ID \
  --rpc-url http://127.0.0.1:8545

# Impersonate account (for testing)
cast rpc anvil_impersonateAccount 0xYourAddress \
  --rpc-url http://127.0.0.1:8545
```

## Test Accounts

Anvil provides 10 test accounts. Here are the first 3:

| Account | Address | Private Key |
|---------|---------|-------------|
| 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

**⚠️ NEVER use these keys in production!**

## Architecture

```
┌─────────────┐
│   Discord   │
│     Bot     │◄─────┐
└──────┬──────┘      │
       │             │
       ▼             │
┌─────────────┐      │
│   Backend   │      │
│   Server    │◄─────┤
└──────┬──────┘      │
       │             │
       ▼             │
┌─────────────┐      │
│  Frontend   │──────┘
│   (Next.js) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Anvil     │
│  (Forked    │
│  Mainnet)   │
└─────────────┘
```

- **Frontend**: User wallet interactions, direct contract calls
- **Backend**: IPFS uploads, Discord integration, relayer for bot
- **Bot**: Discord commands, natural language interface
- **Anvil**: Local blockchain with mainnet state
