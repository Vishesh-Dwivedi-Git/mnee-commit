# MNEE Commit Protocol - Discord Bot

Discord bot for interacting with the Commit Protocol. Integrates with Gemini AI for natural language processing and connects to the backend API.

## Features

- **Slash Commands** - Quick actions for common operations
- **Natural Language** - Ask questions by mentioning the bot
- **Role-Based Access** - Only `commit-creator` role can create commitments
- **Server Registration** - Each Discord server has prepaid MNEE balance

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GEMINI_API_KEY=your_gemini_api_key
SERVER_URL=http://localhost:3000
COMMIT_CREATOR_ROLE=commit-creator
```

### 3. Start Bot

```bash
npm start
```

## Slash Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `/register-server` | Register Discord server (15 MNEE fee) | Admin only |
| `/balance` | Check server's MNEE balance | Everyone |
| `/deposit <amount>` | Deposit MNEE to server balance | Everyone |
| `/create-commitment` | Create a work commitment | `commit-creator` role |
| `/commitments` | List server's commitments | Everyone |
| `/submit-work` | Submit completed work | Everyone |

## Natural Language

Mention the bot to use natural language:

```
@CommitBot What's our server balance?
@CommitBot Create a commitment for 500 MNEE to build an API
@CommitBot List all pending commitments
```

---

# Backend API Endpoints

> **IMPORTANT**: These endpoints need to be implemented in the backend server.
> The bot expects these exact routes and response formats.

## Server Registration & Balance

### POST `/server/register`

Register a Discord server with Commit Protocol.

**Request:**
```json
{
  "guildId": "123456789012345678",
  "adminDiscordId": "987654321098765432"
}
```

**Response:**
```json
{
  "success": true,
  "guildId": "123456789012345678",
  "txHash": "0x...",
  "message": "Server registered successfully"
}
```

**Blockchain Action:** Calls `commit.registerServer(guildId, adminDiscordId)` - Requires 15 MNEE

---

### POST `/server/:guildId/deposit`

Deposit MNEE to server's prepaid balance.

**Request:**
```json
{
  "amount": "1000000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "guildId": "123456789012345678",
  "amount": "1000000000000000000000",
  "txHash": "0x...",
  "newBalance": "1000000000000000000000"
}
```

**Blockchain Action:** Calls `commit.depositToServer(guildId, amount)`

---

### GET `/server/:guildId`

Get server info and balance.

**Response:**
```json
{
  "guildId": "123456789012345678",
  "adminDiscordId": "987654321098765432",
  "isActive": true,
  "registeredAt": 1704672000,
  "balance": {
    "totalDeposited": "5000000000000000000000",
    "totalSpent": "1000000000000000000000",
    "availableBalance": "4000000000000000000000"
  }
}
```

**Blockchain Action:** Calls `commit.getServerBalance(guildId)`

---

### POST `/server/:guildId/withdraw`

Withdraw MNEE from server balance.

**Request:**
```json
{
  "toAddress": "0x1234567890123456789012345678901234567890",
  "amount": "500000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "remainingBalance": "3500000000000000000000"
}
```

**Blockchain Action:** Calls `commit.withdrawFromServer(guildId, toAddress, amount)`

---

## Commitments

### POST `/commit/create`

Create a new commitment (deducts from server balance).

**Request:**
```json
{
  "guildId": "123456789012345678",
  "contributorAddress": "0x1234567890123456789012345678901234567890",
  "amount": "1000000000000000000000",
  "deadlineTimestamp": 1705276800,
  "disputeWindowSeconds": 259200,
  "specCid": "QmSpec123...",
  "discordUserId": "111222333444555666"
}
```

**Response:**
```json
{
  "success": true,
  "commitId": "1",
  "txHash": "0x...",
  "amount": "1000000000000000000000",
  "deadline": 1705276800,
  "state": "FUNDED"
}
```

**Blockchain Action:** Calls `commit.createCommitment(guildId, contributor, token, amount, deadline, disputeWindow, specCid)`

---

### POST `/commit/:commitId/submit`

Submit work evidence for a commitment.

**Request:**
```json
{
  "guildId": "123456789012345678",
  "evidenceCid": "QmEvidence456..."
}
```

**Response:**
```json
{
  "success": true,
  "commitId": "1",
  "txHash": "0x...",
  "state": "SUBMITTED",
  "submittedAt": 1705100000
}
```

**Blockchain Action:** Calls `commit.submitWork(guildId, commitId, evidenceCid)`

---

### GET `/commit/:commitId`

Get commitment details.

**Response:**
```json
{
  "commitId": "1",
  "guildId": "123456789012345678",
  "creator": "0x...",
  "contributor": "0x...",
  "token": "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF",
  "amount": "1000000000000000000000",
  "deadline": 1705276800,
  "disputeWindow": 259200,
  "specCid": "QmSpec123...",
  "evidenceCid": "QmEvidence456...",
  "state": "SUBMITTED",
  "createdAt": 1704672000,
  "submittedAt": 1705100000
}
```

---

### GET `/commit/server/:guildId`

List all commitments for a Discord server.

**Query Params:**
- `state` (optional): Filter by state (FUNDED, SUBMITTED, DISPUTED, SETTLED, REFUNDED, ALL)

**Response:**
```json
{
  "commitments": [
    {
      "commitId": "1",
      "contributor": "0x...",
      "amount": "1000000000000000000000",
      "deadline": 1705276800,
      "state": "SUBMITTED"
    },
    {
      "commitId": "2",
      "contributor": "0x...",
      "amount": "500000000000000000000",
      "deadline": 1705363200,
      "state": "FUNDED"
    }
  ],
  "total": 2
}
```

---

### GET `/commit/contributor/:address`

List all commitments for a contributor address.

**Response:**
```json
{
  "commitments": [...],
  "total": 5
}
```

---

## Disputes

### POST `/dispute/open`

Open a dispute for a commitment.

**Request:**
```json
{
  "guildId": "123456789012345678",
  "commitId": "1",
  "reason": "Work does not meet specifications"
}
```

**Response:**
```json
{
  "success": true,
  "disputeId": "1",
  "commitId": "1",
  "txHash": "0x...",
  "stakeAmount": "10000000000000000",
  "state": "DISPUTED"
}
```

**Blockchain Action:** Calls `commit.openDispute{value: stake}(guildId, commitId)`

---

### GET `/dispute/:commitId`

Get dispute details for a commitment.

**Response:**
```json
{
  "commitId": "1",
  "hasDispute": true,
  "disputeId": "1",
  "stakeAmount": "10000000000000000",
  "openedAt": 1705100000,
  "reason": "Work does not meet specifications",
  "state": "DISPUTED"
}
```

---

## Settlement

### POST `/settlement/settle`

Settle a single commitment (owner only).

**Request:**
```json
{
  "commitId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "commitId": "1",
  "txHash": "0x...",
  "recipient": "0x...",
  "amount": "1000000000000000000000",
  "state": "SETTLED"
}
```

**Blockchain Action:** Calls `commit.settle(commitId)`

---

### POST `/settlement/batch`

Batch settle multiple commitments (owner only / cron job).

**Request:**
```json
{
  "commitIds": ["1", "2", "3"]
}
```

**Response:**
```json
{
  "success": true,
  "settled": ["1", "3"],
  "skipped": ["2"],
  "txHash": "0x..."
}
```

**Blockchain Action:** Calls `commit.batchSettle(commitIds)`

---

### GET `/settlement/pending`

Get commitments ready for settlement.

**Query Params:**
- `guildId` (optional): Filter by Discord server

**Response:**
```json
{
  "pendingSettlements": [
    {
      "commitId": "1",
      "guildId": "123456789012345678",
      "contributor": "0x...",
      "amount": "1000000000000000000000",
      "disputeWindowEnds": 1705359200
    }
  ],
  "total": 1
}
```

---

## Health & Admin

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "contractAddress": "0x...",
  "networkId": 1
}
```

---

### GET `/admin/stats`

Protocol statistics (admin only).

**Response:**
```json
{
  "totalServers": 10,
  "totalCommitments": 150,
  "totalVolume": "500000000000000000000000",
  "pendingSettlements": 5,
  "activeDisputes": 2
}
```

---

## Error Responses

All endpoints should return errors in this format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `SERVER_NOT_REGISTERED` - Discord server not registered
- `INSUFFICIENT_BALANCE` - Not enough MNEE in server balance
- `COMMITMENT_NOT_FOUND` - Commitment ID doesn't exist
- `INVALID_STATE` - Wrong state for operation
- `UNAUTHORIZED` - Not allowed to perform action
- `BLOCKCHAIN_ERROR` - Transaction failed

---

## Notes for Backend Implementation

1. **Relayer Pattern**: All blockchain calls should be made from the relayer wallet (bot wallet)
2. **Discord ID Storage**: Store mapping of Discord user ID → ETH address
3. **Event Listening**: Listen for contract events to update local database
4. **Cron Job**: Run `/settlement/batch` every hour to settle eligible commitments
5. **Amount Format**: All amounts are in wei (18 decimals). 1 MNEE = 1e18 wei
