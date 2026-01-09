# Commit Protocol - Smart Contracts

Foundry-based smart contracts for the Commit Protocol using **MNEE ERC-20 token** with **Discord server integration**.

## MNEE Token

- **Address**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **Network**: Ethereum Mainnet
- **Testing**: Fork mainnet using Anvil

## Quick Start

### 1. Install Dependencies

```bash
forge install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Add your ETH_MAINNET_RPC_URL (Alchemy/Infura)
# Add PRIVATE_KEY for deployment
# Add ARBITRATOR_ADDRESS
```

### 3. Local Testing with Fork

```bash
# Terminal 1: Start forked mainnet
./scripts/start-anvil.sh

# Terminal 2: Deploy to fork
forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url http://localhost:8545 \
  --broadcast

# Run tests
forge test --match-contract CommitTest  # Unit tests (mock tokens)
```

### 4. Mainnet Deployment

```bash
# Test deployment on fork first
./scripts/test-deploy.sh

# Deploy to mainnet (requires confirmation)
./scripts/deploy-mainnet.sh

# Or manually:
forge script script/Deploy.s.sol:DeployMainnet \
  --rpc-url $ETH_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Contract Architecture

```
Commit.sol
├── Discord Server Registry
│   ├── registerServer() - Pay 15 MNEE to register
│   ├── depositToServer() - Add MNEE to balance
│   ├── withdrawFromServer() - Withdraw unused MNEE
│   └── getServerBalance() - Check balance
├── State Machine
│   └── FUNDED → SUBMITTED → SETTLED/DISPUTED
├── Core Functions (Relayer Only)
│   ├── createCommitment(guildId, ...) - Deduct from server balance
│   ├── submitWork(guildId, ...) - Submit evidence CID
│   └── openDispute(guildId, ...) - Dispute with ETH stake
├── Settlement (Owner Only - Cron Job)
│   ├── settle() - Release funds to contributor
│   └── batchSettle() - Settle multiple commitments
└── Admin Functions
    ├── setRelayer() - Set trusted bot wallet
    ├── setRegistrationFee() - Update fee
    ├── setBaseStake() - Update dispute stake
    └── setArbitrator() - Update arbitrator
```

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/start-anvil.sh` | Start Anvil with mainnet fork |
| `scripts/fund-test-wallet.sh` | Fund wallet with MNEE tokens |
| `scripts/deploy-mainnet.sh` | Deploy to Ethereum mainnet |

## Deployment

### Local Fork

```bash
# Start Anvil
./scripts/start-anvil.sh

# Deploy
forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### Mainnet

```bash
# Set environment variables in .env:
# PRIVATE_KEY=0x...
# ARBITRATOR_ADDRESS=0x...
# ETH_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...
# ETHERSCAN_API_KEY=...

# Deploy
./scripts/deploy-mainnet.sh
```

The script will:
1. Validate all required environment variables
2. Show deployment details and ask for confirmation
3. Deploy the contract
4. Verify on Etherscan
5. Display contract addresses for server configuration

## Testing

```bash
# All tests (Discord integration)
forge test -vv

# Specific test
forge test --match-test testRegisterServer -vvvv

# Gas report
forge test --gas-report

# Coverage
forge coverage
```

**Test Suite:** 15/15 tests passing
- Server registration and balance management
- Commitment creation with balance deduction
- Relayer access control
- Batch settlement

## Workflow Example

```solidity
// 1. Register Discord server
MNEE.approve(commitContract, 15e18);
commit.registerServer(guildId, adminDiscordId);  // Pays 15 MNEE

// 2. Deposit MNEE to server balance
MNEE.approve(commitContract, 5000e18);
commit.depositToServer(guildId, 5000e18);

// 3. Create commitment (relayer only - via Discord bot)
commit.createCommitment(
    guildId,
    contributor,
    MNEE_TOKEN,
    1000e18,  // 1000 MNEE
    deadline,
    3 days,   // Dispute window
    "QmSpec..."
);  // Deducts from server balance

// 4. Contributor submits work (relayer only)
commit.submitWork(guildId, commitId, "QmEvidence...");

// 5. Automatic settlement (owner/cron job)
// (after deadline + dispute window)
commit.batchSettle([commitId1, commitId2, ...]);
// MNEE → contributors
```

## Gas Costs

| Operation | Gas |
|-----------|-----|
| Create Commitment | ~290k |
| Submit Work | ~335k |
| Settle | ~330k |
| Open Dispute | ~420k |
| Resolve Dispute | ~440k |

## Security

- ✅ OpenZeppelin contracts (v5.5.0)
- ✅ ReentrancyGuard
- ✅ SafeERC20 transfers
- ✅ Custom errors (gas efficient)
- ✅ Secure relayer pattern (only bot wallet can call)
- ✅ Server balance tracking prevents overdraft
- ✅ 15/15 unit tests passing
- ⏳ Audit pending

## Verification

After deployment, verify on Etherscan:

```bash
forge verify-contract CONTRACT_ADDRESS Commit \
  --constructor-args $(cast abi-encode 'constructor(address,address)' ARBITRATOR_ADDRESS MNEE_TOKEN) \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## License

MIT
