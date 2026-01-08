# Commit Protocol - Smart Contracts

Foundry-based smart contracts for the Commit Protocol using **MNEE ERC-20 token**.

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
├── ERC-20 Escrow (MNEE tokens)
├── State Machine
│   ├── CREATED → FUNDED → SUBMITTED → SETTLED
│   └── SUBMITTED → DISPUTED → SETTLED/REFUNDED
├── Core Functions
│   ├── createCommitment() - Lock MNEE in escrow
│   ├── submitWork() - Submit evidence CID
│   ├── openDispute() - Dispute with ETH stake
│   ├── settle() - Auto-release after window
│   └── resolveDispute() - Arbitrator decision
└── Admin Functions
    ├── setBaseStake()
    └── setArbitrator()
```

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/start-anvil.sh` | Start Anvil with mainnet fork |
| `scripts/deploy-mainnet.sh` | Deploy to Ethereum mainnet |
| `scripts/test-deploy.sh` | Test deployment on fork |

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
# Unit tests (mock tokens)
forge test --match-contract CommitTest

# Fork tests (requires RPC URL)
forge test --match-contract CommitForkTest \
  --fork-url $ETH_MAINNET_RPC_URL

# Gas report
forge test --gas-report

# Coverage
forge coverage
```

**Note**: Fork tests require finding a MNEE whale address. They may fail if the whale address doesn't have sufficient balance. Use unit tests for CI/CD.

## Workflow Example

```solidity
// 1. Creator approves and creates commitment
IERC20(MNEE).approve(commitContract, amount);
uint256 id = commit.createCommitment(
    contributor,
    MNEE_TOKEN,
    1000e18,  // 1000 MNEE
    deadline,
    3 days,   // Dispute window
    "QmSpec..."
);

// 2. Contributor submits work
commit.submitWork(id, "QmEvidence...");

// 3a. Happy path - wait for dispute window, then settle
// (after 3 days)
commit.settle(id);  // MNEE → contributor

// 3b. Dispute path
commit.openDispute{value: 0.01 ether}(id);
// Arbitrator resolves
commit.resolveDispute(id, true);  // true = contributor wins
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
- ✅ 17/17 unit tests passing
- ⏳ Audit pending

## Verification

After deployment, verify on Etherscan:

```bash
forge verify-contract CONTRACT_ADDRESS Commit \
  --constructor-args $(cast abi-encode 'constructor(address)' ARBITRATOR_ADDRESS) \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## License

MIT
