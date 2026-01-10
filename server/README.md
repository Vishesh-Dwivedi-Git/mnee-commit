# MNEE Commit Protocol Server

API server for Discord-based work commitments with ERC-20 escrow and AI verification agents.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `RPC_URL` | Yes | Blockchain RPC endpoint |
| `CONTRACT_ADDRESS` | Yes | MNEE Commit contract address |
| `RELAYER_PRIVATE_KEY` | No | Private key for write operations |
| `MONGODB_URI` | No | MongoDB connection string |
| `GEMINI_API_KEY` | No | Google Gemini API key for AI agents |
| `GITHUB_TOKEN` | No | GitHub PAT for PR analysis |
| `PINATA_API_KEY` | No | Pinata API key for IPFS |
| `PINATA_SECRET_KEY` | No | Pinata secret key |

## API Endpoints

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
| GET | `/commit/:id` | Get commitment details |
| GET | `/commit/server/:guildId` | List by server |
| GET | `/commit/contributor/:address` | List by contributor |

### Disputes (`/dispute`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dispute/open` | Open dispute |
| GET | `/dispute/:commitId` | Get dispute details |

### Settlement (`/settlement`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/settlement/batch` | Batch settle |
| GET | `/settlement/pending` | Get pending settlements |

### AI Verification Agents (`/agent`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/github` | GitHub Code Diff verification |
| POST | `/agent/design` | Visual Design verification |
| POST | `/agent/document` | Document verification |
| GET | `/agent/:cid` | Get evidence by CID |

### User Mapping (`/user`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user` | Register username-wallet mapping |
| GET | `/user/:username` | Get wallet by username |
| GET | `/user/wallet/:address` | Get username by wallet |
| DELETE | `/user/:username` | Remove mapping |

### Health (`/health`, `/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/admin/stats` | Protocol statistics |

## Agent Examples

### GitHub Agent
```bash
curl -X POST http://localhost:3000/agent/github \
  -H "Content-Type: application/json" \
  -d '{
    "taskSpec": "Add user authentication",
    "prUrl": "https://github.com/owner/repo/pull/123"
  }'
```

### Design Agent
```bash
curl -X POST http://localhost:3000/agent/design \
  -H "Content-Type: application/json" \
  -d '{
    "designSpec": "Create a login page",
    "submittedImages": ["https://example.com/image.png"]
  }'
```

### Document Agent
```bash
curl -X POST http://localhost:3000/agent/document \
  -H "Content-Type: application/json" \
  -d '{
    "documentSpec": "Technical spec with Introduction, Methods, Results",
    "submittedDocUrl": "https://example.com/doc.pdf"
  }'
```

## Architecture

```
src/
├── index.ts              # Entry point
├── config/               # Environment config
├── models/               # MongoDB models
├── routes/               # API routes
├── services/
│   ├── contractService   # Blockchain (ethers.js)
│   ├── ipfsService       # IPFS (Pinata)
│   ├── mongoService      # MongoDB
│   ├── scheduler         # Auto-settlement
│   └── agents/           # AI verification agents
└── types/                # TypeScript types
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Blockchain**: ethers.js v6
- **Database**: MongoDB (Mongoose)
- **AI**: Google Gemini 2.0 Flash
- **IPFS**: Pinata

## License

MIT
