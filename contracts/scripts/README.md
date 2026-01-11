# Local Development Setup Scripts

Clean, focused scripts for setting up the Commit Protocol locally.

## Quick Start

```bash
cd contracts/scripts

# 1. Start Anvil (mainnet fork)
./start-anvil.sh

# 2. Deploy contracts
./deploy.sh
# Copy the contract address from output

# 3. Update .env files
./update-env.sh 0xYOUR_CONTRACT_ADDRESS

# 4. Fund test wallets
./fund-wallets.sh
```

## Scripts

### `start-anvil.sh`
Starts Anvil with Ethereum mainnet fork.
- Kills existing Anvil process
- Starts on port 8545
- Saves PID to `.anvil.pid`
- Logs to `anvil.log`

### `deploy.sh`
Deploys Commit Protocol contracts.
- Checks Anvil is running
- Deploys using Foundry
- Shows contract address in output

### `update-env.sh <ADDRESS>`
Updates all .env files with contract address.
- Updates: `contracts/.env`, `server/.env`, `bot/.env`, `frontend/.env.local`
- Validates address format

### `fund-wallets.sh`
Funds test wallets with 10,000 MNEE each.
- Creator: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Contributor: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Relayer: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

### `fund-test-wallet.sh <AMOUNT> <ADDRESS>`
Fund a specific wallet (optional).
- Default: 1000 MNEE to first Anvil account

## Test Account Private Keys

**⚠️ FOR DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION**

```
Creator:     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Contributor: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Relayer:     0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

## Stopping Anvil

```bash
# Using saved PID
kill $(cat .anvil.pid)

# Or kill all Anvil processes
pkill -f anvil

# Or kill by port
lsof -ti:8545 | xargs kill -9
```

## Troubleshooting

**Port 8545 already in use:**
```bash
lsof -ti:8545 | xargs kill -9
./start-anvil.sh
```

**Anvil not responding:**
```bash
pkill -f anvil
./start-anvil.sh
```

**Check wallet balance:**
```bash
cast call 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF \
  "balanceOf(address)(uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url http://localhost:8545
```
