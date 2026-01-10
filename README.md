# Commit Protocol

> **Optimistic Agentic Settlement for On-Chain Work Commitments with Discord Integration**

A trustless escrow system for work commitments that combines smart contract escrow, AI-powered verification, and optimistic settlement with dynamic economic security. Discord servers register and manage prepaid MNEE balances for seamless commitment creation.

## 🎯 Overview

Commit Protocol enables Discord communities and projects to:
- ✅ **Discord server registration** with 15 MNEE fee
- ✅ **Prepaid balance system** for MNEE token management
- ✅ **Automatic settlement** via cron job after deadline + dispute window
- ✅ **AI verification agents** (GitHub PRs, Design files, Documents)
- ✅ **Dynamic stakes** that scale with task value, reputation, and AI confidence
- ✅ **User-wallet mapping** for seamless Discord-to-blockchain identity
- ✅ **Secure relayer pattern** - bot wallet controls all contract interactions

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Commit Protocol                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────┐      ┌───────────────┐      ┌─────────────────┐       │
│   │   Discord   │─────▶│   API Server  │─────▶│ Smart Contract  │       │
│   │     Bot     │      │   (Express)   │      │   (Commit.sol)  │       │
│   └─────────────┘      └───────────────┘      └─────────────────┘       │
│                               │                        │                 │
│                     ┌─────────┼─────────┐             │                 │
│                     ▼         ▼         ▼             │                 │
│              ┌─────────┐ ┌────────┐ ┌────────┐        │                 │
│              │ MongoDB │ │  IPFS  │ │ Gemini │   MNEE Token             │
│              │ (Users) │ │Pinata  │ │   AI   │  (ERC-20)                │
│              └─────────┘ └────────┘ └────────┘                          │
│                                                                           │
│                        ┌──────────────────┐                              │
│                        │   Cron Scheduler │                              │
│                        │ (Auto-Settlement)│                              │
│                        └──────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## 📁 Complete Folder Structure

```
mnee-commit/
│
├── contracts/                      # Smart Contracts (Foundry)
│   ├── src/
│   │   ├── Commit.sol             # Main escrow contract
│   │   └── interfaces/
│   │       └── IERC20.sol         # Token interface
│   ├── test/
│   │   └── Commit.t.sol           # Contract tests
│   ├── script/
│   │   ├── Deploy.s.sol           # Mainnet deployment
│   │   └── DeployLocal.s.sol      # Local fork deployment
│   ├── scripts/
│   │   ├── start-anvil.sh         # Start local fork
│   │   └── fund-test-wallet.sh    # Fund wallets with MNEE
│   ├── foundry.toml               # Foundry config
│   └── README.md
│
├── server/                         # API Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── config/
│   │   │   └── index.ts           # Environment config
│   │   ├── models/
│   │   │   └── User.ts            # MongoDB user model
│   │   ├── routes/
│   │   │   ├── server.ts          # Server management
│   │   │   ├── commit.ts          # Commitment CRUD
│   │   │   ├── dispute.ts         # Dispute handling
│   │   │   ├── settlement.ts      # Batch settlement
│   │   │   ├── agent.ts           # AI agents
│   │   │   ├── user.ts            # User-wallet mapping
│   │   │   └── admin.ts           # Admin stats
│   │   ├── services/
│   │   │   ├── contractService.ts # Smart contract (ethers.js)
│   │   │   ├── ipfsService.ts     # IPFS uploads (Pinata)
│   │   │   ├── mongoService.ts    # MongoDB connection
│   │   │   ├── scheduler.ts       # Auto-settlement cron
│   │   │   └── agents/
│   │   │       ├── githubAgent.ts     # GitHub PR analysis
│   │   │       ├── designAgent.ts     # Visual design analysis
│   │   │       └── documentAgent.ts   # Document analysis
│   │   └── types/
│   │       ├── index.ts           # Contract types
│   │       └── agents.ts          # Agent types
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── bot/                            # Discord Bot
│   ├── index.js                   # Main bot entry
│   ├── deploy-commands.js         # Slash command registration
│   ├── gemini-service.js          # AI integration
│   ├── server-client.js           # API client
│   ├── mcp-server.js              # MCP server
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── commit-protocol/                # Documentation
│   ├── PROTOCOL.md                # Technical specification
│   └── commit_protocol.pdf        # Whitepaper
│
├── README.md                       # This file
├── SECURITY.md                     # Security guidelines
└── .gitignore
```

## 🔄 Complete Workflow

### Phase 1: Server Registration

```
Discord Admin                API Server              Smart Contract
     │                           │                         │
     │  /register-server         │                         │
     ├──────────────────────────▶│                         │
     │                           │  registerServer()       │
     │                           ├────────────────────────▶│
     │                           │                         │ Pays 15 MNEE
     │                           │                         │ Server active
     │                           │◀────────────────────────┤
     │  ✅ Server registered     │                         │
     │◀──────────────────────────┤                         │
```

### Phase 2: Fund Server Balance

```
Discord Admin                API Server              Smart Contract
     │                           │                         │
     │  /deposit 5000 MNEE       │                         │
     ├──────────────────────────▶│                         │
     │                           │  depositToServer()      │
     │                           ├────────────────────────▶│
     │                           │                         │ Balance += 5000
     │  ✅ Balance: 5000 MNEE    │                         │
     │◀──────────────────────────┤                         │
```

### Phase 3: Create Commitment

```
Task Creator                 API Server              Smart Contract
     │                           │                         │
     │  /commit @user 1000 MNEE  │                         │
     │  "Build auth feature"     │                         │
     ├──────────────────────────▶│                         │
     │                           │  createCommitment()     │
     │                           ├────────────────────────▶│
     │                           │                         │ Balance -= 1000
     │                           │                         │ Commitment #42
     │  ✅ Commitment #42        │                         │
     │◀──────────────────────────┤                         │
```

### Phase 4: Submit Work

```
Contributor                  API Server              AI Agents        IPFS
     │                           │                      │               │
     │  /submit 42 <PR link>     │                      │               │
     ├──────────────────────────▶│                      │               │
     │                           │  Analyze PR          │               │
     │                           ├─────────────────────▶│               │
     │                           │  confidenceScore: 85 │               │
     │                           │◀─────────────────────┤               │
     │                           │  Upload evidence                     │
     │                           ├─────────────────────────────────────▶│
     │                           │                      evidenceCid     │
     │                           │◀─────────────────────────────────────┤
     │                           │  submitWork(cid)                     │
     │                           ├─────────────────────▶ Contract       │
     │  ✅ Work submitted        │                                      │
     │◀──────────────────────────┤                                      │
```

### Phase 5: Automatic Settlement

```
Cron Scheduler               API Server              Smart Contract
     │                           │                         │
     │  Every 60 seconds         │                         │
     ├──────────────────────────▶│                         │
     │                           │  getPendingSettlements()│
     │                           ├────────────────────────▶│
     │                           │  [#42, #43, #44]        │
     │                           │◀────────────────────────┤
     │                           │  batchSettle([42,43,44])│
     │                           ├────────────────────────▶│
     │                           │                         │ Transfer MNEE
     │                           │                         │ to contributors
     │  ✅ 3 commitments settled │                         │
     │◀──────────────────────────┤                         │
```

### Phase 6: Dispute (Optional)

```
Creator (Disputer)           API Server              Smart Contract
     │                           │                         │
     │  /dispute 42              │                         │
     ├──────────────────────────▶│                         │
     │                           │  calculateStake()       │
     │                           ├────────────────────────▶│
     │                           │  stake: 50 MNEE         │
     │                           │◀────────────────────────┤
     │                           │  openDispute(stake)     │
     │                           ├────────────────────────▶│
     │                           │                         │ Stakes locked
     │  ✅ Dispute opened        │                         │
     │◀──────────────────────────┤                         │

     ... Arbitrator resolves dispute ...
     
     │  Winner receives stake    │                         │
```

## 💰 MNEE Token

- **Token**: MNEE ERC-20
- **Address**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **Network**: Ethereum Mainnet
- **Testing**: Fork mainnet using Anvil

## 🔌 API Endpoints (23 Total)

### Server Management (`/server`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/server/register` | Register Discord server (15 MNEE) |
| POST | `/server/:guildId/deposit` | Deposit MNEE |
| POST | `/server/:guildId/withdraw` | Withdraw MNEE |
| GET | `/server/:guildId` | Get server info |

### Commitments (`/commit`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/commit/create` | Create commitment |
| POST | `/commit/:id/submit` | Submit work evidence |
| GET | `/commit/:id` | Get commitment |
| GET | `/commit/server/:guildId` | List by server |
| GET | `/commit/contributor/:address` | List by contributor |

### Disputes & Settlement
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dispute/open` | Open dispute |
| GET | `/dispute/:commitId` | Get dispute |
| POST | `/settlement/batch` | Batch settle |
| GET | `/settlement/pending` | Pending settlements |

### AI Verification Agents (`/agent`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/github` | GitHub PR verification |
| POST | `/agent/design` | Design verification |
| POST | `/agent/document` | Document verification |
| GET | `/agent/:cid` | Get evidence by CID |

### User Mapping (`/user`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user` | Register username-wallet |
| GET | `/user/:username` | Get wallet by username |
| GET | `/user/wallet/:address` | Get username by wallet |
| DELETE | `/user/:username` | Remove mapping |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/admin/stats` | Protocol statistics |

## 🤖 AI Verification Agents

### 1️⃣ GitHub Code Diff Agent
```bash
curl -X POST http://localhost:3000/agent/github \
  -H "Content-Type: application/json" \
  -d '{
    "taskSpec": "Implement user authentication with JWT",
    "prUrl": "https://github.com/owner/repo/pull/123"
  }'
```

### 2️⃣ Visual Design Agent
```bash
curl -X POST http://localhost:3000/agent/design \
  -H "Content-Type: application/json" \
  -d '{
    "designSpec": "Create a login page with email and password fields",
    "submittedImages": ["https://example.com/screenshot.png"]
  }'
```

### 3️⃣ Document Agent
```bash
curl -X POST http://localhost:3000/agent/document \
  -H "Content-Type: application/json" \
  -d '{
    "documentSpec": "Technical spec with: Introduction, Methods, Results",
    "submittedDocUrl": "https://example.com/doc.pdf"
  }'
```

## 🚀 Quick Start

### 1. Smart Contracts
```bash
cd contracts
forge install
cp .env.example .env
./scripts/start-anvil.sh
forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 2. API Server
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### 3. Discord Bot
```bash
cd bot
npm install
cp .env.example .env
npm start
```

## 📊 Dynamic Stake Formula

```
Sreq = Sbase × Mtime × Mrep × MAI
```

| Factor | Description |
|--------|-------------|
| **Sbase** | Base stake (e.g., 0.01 ETH) |
| **Mtime** | Time multiplier (prevents last-second disputes) |
| **Mrep** | Reputation multiplier (protects proven contributors) |
| **MAI** | AI confidence multiplier (2x for high confidence) |

## 🔐 Security

- ✅ OpenZeppelin v5.5.0 (ReentrancyGuard, SafeERC20)
- ✅ Secure relayer pattern - only bot wallet can call protected functions
- ✅ Server registration fee prevents spam
- ✅ Evidence stored on IPFS (immutable)
- ✅ Wallet address validation
- ⏳ Audit pending

## 🛣️ Roadmap

| Phase | Status | Features |
|-------|--------|----------|
| **Phase 1: Core** | ✅ Complete | Smart contracts, Server registration, Escrow |
| **Phase 2: AI** | ✅ Complete | GitHub, Design, Document agents, IPFS |
| **Phase 3: Scale** | 🔄 Planned | Kleros arbitration, Multi-chain, DAO |

## 🤝 Contributing

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
- **MNEE Token**: [Etherscan](https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF)

---

**Tech Stack**: Solidity • TypeScript • Node.js • Express • MongoDB • ethers.js • Foundry • OpenZeppelin • IPFS • Gemini AI