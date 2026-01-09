# Commit Protocol

> **Optimistic Agentic Settlement for On-Chain Work Commitments with Discord Integration**

A trustless escrow system for work commitments that combines smart contract escrow, AI-powered verification, and optimistic settlement with dynamic economic security. Discord servers register and manage prepaid MNEE balances for seamless commitment creation.

## 🎯 Overview

Commit Protocol enables Discord communities and projects to:
- ✅ **Discord server registration** with 15 MNEE fee
- ✅ **Prepaid balance system** for MNEE token management
- ✅ **Automatic settlement** via cron job after deadline + dispute window
- ✅ **AI verification** for objective "done" criteria
- ✅ **Dynamic stakes** that scale with task value, reputation, and AI confidence
- ✅ **Reputation tracking** to reward consistent contributors
- ✅ **Secure relayer pattern** - bot wallet controls all contract interactions

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Commit Protocol                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────┐   ┌──────────────┐   ┌──────────────┐          │
│  │  Discord   │──▶│  Bot Wallet  │──▶│    Smart     │          │
│  │   Server   │   │  (Relayer)   │   │  Contracts   │          │
│  │  (Guild)   │   │              │   │  (Solidity)  │          │
│  └────────────┘   └──────────────┘   └──────────────┘          │
│                           │                    │                 │
│   Register (15 MNEE) ─────┘                    │                 │
│   Deposit Balance                              │                 │
│   Create Commitments ──────────────────────────┘                 │
│                                                │                  │
│                                           MNEE Token              │
│                                         (Ethereum L1)             │
│                                                                   │
│         ┌──────────────┐         ┌──────────────┐               │
│         │ Cron Job     │────────▶│  AI Agents   │               │
│         │ (Settlement) │         │  (GitHub)    │               │
│         └──────────────┘         └──────────────┘               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 💰 MNEE Token

- **Token**: MNEE ERC-20
- **Address**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **Network**: Ethereum Mainnet
- **Testing**: Fork mainnet using Anvil (no testnet available)

## 📁 Repository Structure

```
mnee-commit/
├── contracts/          # Solidity smart contracts (Foundry)
│   ├── src/
│   │   └── Commit.sol          # Main escrow contract with Discord integration
│   ├── test/
│   │   └── Commit.t.sol        # Tests for Discord server balance system
│   ├── script/
│   │   ├── Deploy.s.sol        # Mainnet deployment
│   │   └── DeployLocal.s.sol   # Local fork deployment
│   └── scripts/
│       ├── start-anvil.sh      # Start local fork
│       └── fund-test-wallet.sh # Fund wallets with MNEE
│
├── server/             # Orchestrator backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── config/             # Web3/IPFS configuration
│   │   ├── services/           # Contract, IPFS, commit services
│   │   ├── routes/             # REST API endpoints
│   │   └── db/                 # Prisma + PostgreSQL
│   └── prisma/
│       └── schema.prisma       # Database schema
│
├── bot/                # Discord bot for user interaction
│   └── index.js
│
└── commit-protocol/    # Documentation
    ├── PROTOCOL.md             # Complete technical guide
    └── commit_protocol.pdf     # Original whitepaper
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- Foundry (for smart contracts)
- Ethereum RPC URL (Alchemy/Infura)

### 1. Smart Contracts

```bash
cd contracts

# Install dependencies
forge install

# Configure environment
cp .env.example .env
# Add ETH_MAINNET_RPC_URL

# Start Anvil fork
./scripts/start-anvil.sh

# Deploy to local fork
forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url http://localhost:8545 \
  --broadcast

# Run tests
forge test
```

### 2. Orchestrator Server

```bash
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add DATABASE_URL, CONTRACT_ADDRESS, RPC_URL, etc.

# Initialize database
npm run db:push

# Start server
npm run dev
```

### 3. Discord Bot

```bash
cd bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add BOT_TOKEN, SERVER_URL, GEMINI_API_KEY

# Start bot
npm start
```

## 🔄 Workflow

### 1. Discord Server Registration

```typescript
// Server admin registers Discord server
const tx = await contract.registerServer(
  guildId,        // Discord guild ID (e.g., 123456789)
  adminDiscordId  // Admin's Discord user ID
);
// Pays 15 MNEE registration fee
// Server is now active and can create commitments
```

### 2. Fund Server Balance

```typescript
// Server admin deposits MNEE to prepaid balance
const amount = ethers.utils.parseEther("5000"); // 5000 MNEE
await contract.depositToServer(guildId, amount);

// Check balance
const {totalDeposited, totalSpent, availableBalance} = 
  await contract.getServerBalance(guildId);
```

### 3. Create Commitment (via Discord Bot)

```typescript
// User types: /create-commitment @contributor 1000 MNEE "Build API"
// Bot checks user has "commit-creator" role
// Bot wallet (relayer) calls contract:

await contract.createCommitment(
  guildId,                    // Discord server ID
  contributorAddress,         // Contributor wallet
  mneeTokenAddress,           // MNEE token
  "1000000000000000000000",   // 1000 MNEE
  deadline,
  disputeWindow,
  specCid
);
// Deducts 1000 MNEE from server balance
```

### 4. Submit Work

```typescript
// Contributor types: /submit <commit-id> <evidence-link>
// Bot wallet calls contract:
await contract.submitWork(guildId, commitId, evidenceCid);

// AI agents analyze work
// Evidence stored on IPFS
```

### 5. Automatic Settlement

```typescript
// Cron job runs every hour
// Detects commitments past deadline + dispute window
// Owner wallet calls:
await contract.batchSettle([commitId1, commitId2, ...]);
// MNEE tokens transferred to contributors
```

### 4. Dispute (Optional)

```typescript
// Client disputes with stake
const stake = calculateStake(commitId)  // Dynamic formula
contract.openDispute{value: stake}(commitId)

// Arbitrator resolves
contract.resolveDispute(commitId, favorContributor)
```

## 📊 Dynamic Stake Formula

```
Sreq = Sbase × Mtime × Mrep × MAI
```

Where:
- **Sbase**: Base stake (e.g., 0.01 ETH)
- **Mtime**: Time multiplier (prevents last-second disputes)
- **Mrep**: Reputation multiplier (protects proven contributors)
- **MAI**: AI confidence multiplier (2x for high confidence)

See [PROTOCOL.md](./commit-protocol/PROTOCOL.md) for detailed examples.

## 🔐 Security

### Smart Contracts
- ✅ OpenZeppelin v5.5.0 (ReentrancyGuard, SafeERC20, Ownable)
- ✅ Custom errors (gas efficient)
- ✅ Secure relayer pattern - only bot wallet can call protected functions
- ✅ Server registration with 15 MNEE fee prevents spam
- ✅ Balance tracking prevents overdraft
- ✅ 15/15 tests passing
- ⏳ Audit pending

### Discord Bot Security
- ✅ Bot private key is the only way to call contract functions
- ✅ Bot verifies Discord roles before any blockchain interaction
- ✅ `onlyRelayer` and `onlyRegisteredServer` modifiers
- ✅ No on-chain role storage - Discord is source of truth

### Server
- ✅ Prisma ORM (SQL injection protection)
- ✅ Environment variable validation
- ✅ CORS configuration
- ⏳ Rate limiting (TODO)

## 🔌 Backend API Endpoints

The following endpoints must be implemented in the backend server. See [bot/README.md](./bot/README.md) for detailed specifications.

### Server Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/server/register` | Register Discord server (15 MNEE) |
| POST | `/server/:guildId/deposit` | Deposit MNEE to balance |
| POST | `/server/:guildId/withdraw` | Withdraw MNEE |
| GET | `/server/:guildId` | Get server info & balance |

### Commitments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/commit/create` | Create commitment (deducts balance) |
| POST | `/commit/:id/submit` | Submit work evidence |
| GET | `/commit/:id` | Get commitment details |
| GET | `/commit/server/:guildId` | List by server |
| GET | `/commit/contributor/:address` | List by contributor |

### Disputes & Settlement

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dispute/open` | Open dispute with stake |
| GET | `/dispute/:commitId` | Get dispute details |
| POST | `/settlement/batch` | Batch settle (cron job) |
| GET | `/settlement/pending` | Get pending settlements |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/admin/stats` | Protocol statistics |

## 📚 Documentation

- **[PROTOCOL.md](./commit-protocol/PROTOCOL.md)** - Complete technical guide with examples
- **[contracts/README.md](./contracts/README.md)** - Smart contract documentation
- **[bot/README.md](./bot/README.md)** - Bot & API endpoint documentation
- **[commit_protocol.pdf](./commit-protocol/commit_protocol.pdf)** - Original whitepaper

## 🧪 Testing

### Smart Contracts

```bash
cd contracts

# Unit tests (Discord integration)
forge test -vv

# Gas report
forge test --gas-report

# Coverage
forge coverage

# Test on local fork
./scripts/start-anvil.sh
./scripts/fund-test-wallet.sh 5000
forge script script/DeployLocal.s.sol:DeployLocal --rpc-url http://localhost:8545 --broadcast
```

### Server

```bash
cd server

# Build TypeScript
npm run build

# Run with test database
npm run dev
```

## 🛣️ Roadmap

### ✅ Phase 1: Core Protocol (Current)
- [x] Smart contract implementation
- [x] ERC-20 escrow with MNEE
- [x] Orchestrator server (PostgreSQL + Prisma)
- [x] Basic dispute resolution
- [x] Discord bot integration

### 🔄 Phase 2: AI Integration (In Progress)
- [ ] GitHub Auditor agent
- [ ] OpenAI-based spec compliance checking
- [ ] IPFS evidence storage (Pinata)
- [ ] Dynamic stake calculation (full formula)

### 📋 Phase 3: Decentralization (Planned)
- [ ] Kleros arbitration integration
- [ ] Reputation oracle (federated signers)
- [ ] Multi-chain deployment (Base, Arbitrum, Optimism)
- [ ] DAO governance for protocol parameters

### 🚀 Phase 4: Advanced Features (Future)
- [ ] Visual verification agents (Figma API)
- [ ] Streaming payments for long-term commitments
- [ ] Reputation import (GitPOAP, Coordinape)
- [ ] Insurance liquidity pool

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🔗 Links

- **Documentation**: [PROTOCOL.md](./commit-protocol/PROTOCOL.md)
- **Whitepaper**: [commit_protocol.pdf](./commit-protocol/commit_protocol.pdf)
- **MNEE Token**: [0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF](https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF)

---

**Built with**: Solidity • TypeScript • Node.js • PostgreSQL • Prisma • Foundry • OpenZeppelin • IPFS