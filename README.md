# MNEE Commit Protocol

Optimistic Settlement + Dispute Staking protocol built on Bitcoin SV using the MNEE SDK.

## Overview

The MNEE Commit Protocol enables trustless commitments between clients and contributors with:
- **Optimistic Settlement**: Automatic release after delivery + dispute window
- **Dispute Staking**: Clients stake to dispute, preventing frivolous claims
- **Server-Side Funding**: Secure bot wallet funding with explicit user confirmation
- **Discord Integration**: Natural language interface via AI bot

## Features

### Core Protocol
- ✅ Create commitments with delivery deadlines
- ✅ Mark deliverables as delivered with proof hash
- ✅ Open disputes within dispute window
- ✅ Automatic release after dispute window expires
- ✅ Admin dispute resolution

### Security & UX
- 🔒 **Server-side funding** using BOT_WIF (no user private keys)
- ✅ **Explicit user confirmation** before spending
- 📊 **Audit logging** of all funding actions
- 🛡️ **Spending limits** (per-transaction and daily caps)
- ⏱️ **Confirmation timeouts** (10 minutes)
- 🔑 **Admin override** for emergency funding

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Discord   │─────▶│  Bot/Server  │─────▶│   MNEE      │
│    User     │      │ (BOT_WIF)    │      │  Blockchain │
└─────────────┘      └──────────────┘      └─────────────┘
      │                      │                      │
      │  1. Create intent    │                      │
      │  2. Confirm funding  │                      │
      │  3. Get confirmation │                      │
      │                      │  4. Sign & broadcast │
      │                      │  5. Webhook confirms │
```

### Components

- **Server** (`/server`): Express.js API with TypeScript
  - REST API for commitments and disputes
  - Server-side funding with BOT_WIF
  - Webhook handler for transaction confirmations
  - SQLite database for state management

- **Bot** (`/bot`): Discord bot with Gemini AI
  - Natural language interface
  - MCP tools for protocol actions
  - Confirmation flow management
  - User-friendly responses

## Quick Start

### Prerequisites
- Node.js 18+
- MNEE API key ([get one here](https://mnee.com))
- Discord bot token
- Gemini API key

### Setup

1. **Clone and install**
```bash
git clone <repo>
cd mnee-commit

# Server
cd server
npm install
cp .env.example .env
# Edit .env with your configuration

# Bot
cd ../bot
npm install
cp .env.example .env
# Edit .env with your configuration
```

2. **Configure environment variables**

**Server** (`.env`):
```bash
# Server
PORT=3000
SERVER_BASE_URL=http://localhost:3000

# MNEE SDK
MNEE_ENV=sandbox
MNEE_API_KEY=your_sandbox_api_key

# Escrow Wallet (server-controlled)
ESCROW_ADDRESS=your_escrow_address
ESCROW_WIF=your_escrow_private_key

# Bot Wallet (for server-side funding)
BOT_WALLET_ADDRESS=your_bot_wallet_address
BOT_WIF=your_bot_wallet_private_key

# Funding Limits & Security
MAX_FUNDING_AMOUNT=100000
DAILY_FUNDING_CAP=1000000
CONFIRMATION_TIMEOUT_MS=600000
ADMIN_SECRET=your_admin_secret

# Protocol
DISPUTE_STAKE_PERCENT=10
```

**Bot** (`.env`):
```bash
BOT_TOKEN=your_discord_bot_token
GEMINI_API_KEY=your_gemini_api_key
SERVER_URL=http://localhost:3000
```

3. **Run**
```bash
# Terminal 1: Server
cd server
npm run build
npm start

# Terminal 2: Bot
cd bot
node index.js
```

## Usage

### Creating a Commitment (Two-Step Process)

**Step 1: Create Intent**
```
User: @Bot create a commitment for 5000 sats to 1ABC... due tomorrow

Bot: ✅ Commitment created!
ID: abc-123
Amount: 5000 satoshis

⚠️ CONFIRMATION REQUIRED
I will fund this commitment using the bot wallet.
Amount: 5000 satoshis
Action: Transfer from bot wallet to escrow

Reply **YES** to confirm or **NO** to cancel.
(This confirmation expires in 10 minutes)
```

**Step 2: Confirm and Fund**
```
User: YES

Bot: ✅ Funding successful!
Commitment ID: abc-123
Amount: 5000 satoshis
Transaction ID: tx-456

The commitment is now active and funded.
```

### Marking as Delivered
```
User: @Bot I delivered the work for abc-123, proof hash: deadbeef

Bot: ✅ Commitment marked as delivered!
ID: abc-123
Deliverable Hash: deadbeef
Dispute window ends: 2026-01-07 12:00 UTC

The contributor can claim funds after the dispute window.
```

### Opening a Dispute
```
User: @Bot I want to dispute abc-123 because the work is incomplete

Bot: ⚠️ Dispute created!
ID: dispute-789
Stake required: 500 satoshis (10% of commitment)

⚠️ CONFIRMATION REQUIRED
I will fund this dispute stake using the bot wallet.
Amount: 500 satoshis
Action: Transfer from bot wallet to escrow

Reply **YES** to confirm or **NO** to cancel.

User: YES

Bot: ✅ Dispute funded and activated!
Dispute ID: dispute-789
Stake: 500 satoshis
Transaction ID: tx-999

The dispute is now open for admin review.
```

## API Endpoints

### Commitments
- `POST /commit/create` - Create a new commitment (returns funding instructions)
- `POST /commit/fund` - Fund a commitment using bot wallet (requires confirmation)
- `POST /commit/deliver` - Mark commitment as delivered
- `GET /commit/:id` - Get commitment details
- `GET /commit/list/:address` - List commitments for an address

### Disputes
- `POST /dispute/open` - Open a dispute (returns stake funding instructions)
- `POST /dispute/fund` - Fund dispute stake using bot wallet (requires confirmation)
- `POST /dispute/resolve` - Resolve a dispute (admin only)
- `GET /dispute/:commitId` - Get dispute details

### Webhooks
- `POST /webhook/mnee` - MNEE transaction status webhook

## Security

See [SECURITY.md](./SECURITY.md) for detailed security architecture.

**Key Points**:
- ✅ All funding done server-side with BOT_WIF
- ✅ Explicit user confirmation required
- ✅ Spending limits enforced
- ✅ Full audit trail
- ❌ Never expose BOT_WIF
- ❌ Never skip confirmation

## Development

### Build
```bash
cd server
npm run build
```

### Database
SQLite database is automatically created at `server/data/commit-protocol.db`

Schema includes:
- `commitments` - Commitment records
- `disputes` - Dispute records
- `funding_confirmations` - Pending user confirmations
- `funding_logs` - Audit trail of all funding actions

### Testing
```bash
# Server tests (when implemented)
cd server
npm test

# Manual testing via Discord
# 1. Start server
# 2. Start bot
# 3. Interact via Discord
```

## Troubleshooting

### Bot wallet out of funds
```bash
# Check bot wallet balance
# Transfer funds to BOT_WALLET_ADDRESS
```

### Confirmation expired
```
Error: Confirmation has expired

Solution: Create a new commitment/dispute and confirm within 10 minutes
```

### Daily funding cap exceeded
```
Error: Daily funding cap exceeded

Solution: Wait 24 hours or increase DAILY_FUNDING_CAP
```

### BOT_WIF not configured
```
Warning: BOT_WIF not configured - server-side funding is DISABLED

Solution: Set BOT_WALLET_ADDRESS and BOT_WIF in server/.env
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues or questions:
- Open a GitHub issue
- Check [SECURITY.md](./SECURITY.md) for security-related questions