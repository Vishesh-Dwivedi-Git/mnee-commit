# Security Architecture - MNEE Commit Protocol

## 🔒 Server-Side Funding Model

The MNEE Commit Protocol uses **server-side funding** with explicit user confirmation to provide a secure, user-friendly payment experience.

### Key Security Principles

1. **Bot Wallet Custody**: Server holds `BOT_WIF` for funding commitments and disputes
2. **Explicit Consent**: Users must confirm before any funds are spent
3. **Audit Trail**: All funding actions are logged with timestamps and user info
4. **Spending Limits**: Per-transaction and daily caps prevent abuse
5. **Confirmation Timeout**: Confirmations expire after 10 minutes

## ✅ Secure Payment Flow

### Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Discord   │─────▶│  Bot/Server  │─────▶│   MNEE      │
│    User     │      │ (BOT_WIF)    │      │  Blockchain │
└─────────────┘      └──────────────┘      └─────────────┘
      │                      │                      │
      │  1. Create intent    │                      │
      │─────────────────────▶│                      │
      │                      │                      │
      │  2. Funding instr.   │                      │
      │◀─────────────────────│                      │
      │                      │                      │
      │  3. User confirms    │                      │
      │      "YES"           │                      │
      │─────────────────────▶│                      │
      │                      │                      │
      │                      │  4. Bot wallet signs │
      │                      │      & broadcasts    │
      │                      │─────────────────────▶│
      │                      │                      │
      │                      │  5. Webhook confirms │
      │                      │◀─────────────────────│
      │  6. Success msg      │                      │
      │◀─────────────────────│                      │
```

### Two-Step Process

#### Step 1: Create Commitment (No Payment)
```javascript
// User says in Discord: "@Bot create commitment for 5000 sats to 1ABC..."
POST /commit/create
{
  "clientAddress": "1CH6v4U...",      // ✅ Public address only
  "contributorAddress": "1ABC...",
  "amount": 5000,
  "deliveryDeadline": 1767225600000,
  "disputeWindowSeconds": 172800
}

// Response includes funding instructions
{
  "commitId": "abc-123",
  "amount": 5000,
  "escrowAddress": "1BotWallet...",
  "fundingInstructions": "To fund this commitment, confirm the payment in Discord..."
}
```

#### Step 2: Confirm and Fund
```javascript
// Bot asks: "I will fund commitment abc-123 with 5000 sats. Reply YES to confirm."
// User replies: "YES"

POST /commit/fund
{
  "commitId": "abc-123",
  "confirmerAddress": "1CH6v4U..."  // User who confirmed
}

// Server validates:
// 1. Confirmation exists and hasn't expired
// 2. Amount within limits (MAX_FUNDING_AMOUNT)
// 3. Daily cap not exceeded (DAILY_FUNDING_CAP)
// 4. Transfers from BOT_WIF to escrow
// 5. Logs action for audit

// Response
{
  "commitId": "abc-123",
  "transferTicketId": "tx-456",
  "funded": true
}
```

## Security Measures

### 1. Funding Limits

```bash
# Environment variables
MAX_FUNDING_AMOUNT=100000        # Max per transaction (satoshis)
DAILY_FUNDING_CAP=1000000        # Max per 24 hours (satoshis)
CONFIRMATION_TIMEOUT_MS=600000   # 10 minutes
```

**Purpose**: Prevent accidental or malicious large transfers

### 2. Confirmation Tracking

All funding requests require a confirmation record:

```typescript
interface ConfirmationRecord {
  id: string;
  userId: string;              // Discord user ID
  action: 'fund_commitment' | 'fund_dispute';
  targetId: string;            // Commitment or dispute ID
  amount: number;
  createdAt: number;
  expiresAt: number;           // createdAt + CONFIRMATION_TIMEOUT_MS
  confirmed: boolean;
}
```

**Workflow**:
1. Bot creates confirmation record when user says "YES"
2. Server validates confirmation exists and hasn't expired
3. After funding, confirmation is marked as used
4. Expired confirmations are cleaned up automatically

### 3. Audit Logging

Every funding action is logged:

```typescript
interface FundingLog {
  id: string;
  action: 'fund_commitment' | 'fund_dispute';
  targetId: string;
  amount: number;
  confirmerAddress: string | null;
  adminOverride: boolean;
  transferTicketId: string | null;
  success: boolean;
  error: string | null;
  timestamp: number;
}
```

**Benefits**:
- Full audit trail of all spending
- Track who authorized each payment
- Identify failed transactions
- Monitor spending patterns

### 4. Admin Override

Admins can bypass confirmation requirement:

```javascript
POST /commit/fund
{
  "commitId": "abc-123",
  "adminSecret": "your_admin_secret"  // From ADMIN_SECRET env var
}
```

**Use cases**:
- Emergency funding
- Automated processes
- Testing

**Security**: `ADMIN_SECRET` must be kept secure and rotated regularly

### 5. Private Key Protection

```bash
# ❌ NEVER expose BOT_WIF
- Not in logs
- Not in error messages
- Not in API responses
- Not sent to Gemini or Discord

# ✅ Only used server-side
- Loaded from environment
- Used only in mneeService.transferFromBot()
- Never leaves server process
```

## Discord Bot Confirmation Flow

### Example Interaction

```
User: @Bot create a commitment for 1000 sats to 1ABC... due tomorrow

Bot: ✅ Commitment created!
ID: abc-123
Amount: 1000 satoshis

⚠️ CONFIRMATION REQUIRED
I will fund this commitment using the bot wallet.
Amount: 1000 satoshis
Action: Transfer from bot wallet to escrow

Reply **YES** to confirm or **NO** to cancel.
(This confirmation expires in 10 minutes)

User: YES

Bot: ✅ Funding successful!
Commitment ID: abc-123
Amount: 1000 satoshis
Transaction ID: tx-456

The commitment is now active and funded.
```

### Timeout Handling

```
User: @Bot create commitment...
Bot: [confirmation request]
... 10+ minutes pass ...
User: YES

Bot: ❌ Confirmation expired
The funding request has timed out. Please create a new commitment if you still want to proceed.
```

## Security Best Practices

### ✅ DO
- Require explicit user confirmation for all funding
- Log all funding actions with user attribution
- Enforce spending limits (per-transaction and daily)
- Use confirmation timeouts to prevent stale requests
- Store BOT_WIF only in server environment
- Validate all confirmations server-side
- Clean up expired confirmations regularly

### ❌ DON'T
- Accept funding requests without confirmation
- Expose BOT_WIF in logs or responses
- Allow unlimited spending
- Trust client-reported confirmations
- Store confirmations indefinitely
- Skip audit logging

## Implementation Status

### ✅ Completed
- Server-side funding with BOT_WIF
- Confirmation tracking database
- Funding audit logs
- Spending limits (per-transaction and daily)
- Confirmation timeout mechanism
- Admin override capability
- Updated API endpoints (POST /commit/fund, POST /dispute/fund)
- Updated MCP tools (fund_commitment, fund_dispute)
- Server client methods (fundCommitment, fundDispute)

### ⏳ Pending
- Discord bot confirmation flow implementation
- Webhook updates for funding confirmation
- Web dashboard for payment management (optional)

## Environment Variables

```bash
# Bot Wallet (Required for server-side funding)
BOT_WALLET_ADDRESS=your_bot_wallet_address
BOT_WIF=your_bot_wallet_private_key

# Funding Limits
MAX_FUNDING_AMOUNT=100000          # Default: 100,000 sats
DAILY_FUNDING_CAP=1000000          # Default: 1,000,000 sats
CONFIRMATION_TIMEOUT_MS=600000     # Default: 10 minutes

# Admin Access
ADMIN_SECRET=your_admin_secret_for_overrides
```

## Monitoring and Alerts

### Recommended Monitoring

1. **Daily Spending**: Track total funded amount per day
2. **Failed Fundings**: Alert on repeated failures
3. **Expired Confirmations**: Monitor timeout rate
4. **Admin Overrides**: Log and review all admin actions
5. **Wallet Balance**: Ensure BOT_WALLET has sufficient funds

### Query Examples

```sql
-- Daily spending total
SELECT SUM(amount) FROM funding_logs 
WHERE timestamp >= ? AND success = 1;

-- Failed funding attempts
SELECT * FROM funding_logs 
WHERE success = 0 
ORDER BY timestamp DESC;

-- Admin overrides
SELECT * FROM funding_logs 
WHERE admin_override = 1;
```

## Disaster Recovery

### If BOT_WIF is Compromised

1. **Immediately**: Change BOT_WIF environment variable
2. **Transfer funds**: Move remaining funds to new wallet
3. **Update config**: Set new BOT_WALLET_ADDRESS
4. **Audit logs**: Review funding_logs for unauthorized transactions
5. **Notify users**: If funds were stolen

### If Server is Compromised

1. **Rotate secrets**: Change BOT_WIF and ADMIN_SECRET
2. **Review logs**: Check funding_logs for suspicious activity
3. **Verify balances**: Ensure escrow and bot wallet balances are correct
4. **Restore from backup**: If database was tampered with

## Questions & Answers

**Q: What if a user confirms but the transaction fails?**
A: The funding action is logged with `success: false` and the error message. The confirmation is marked as used, so the user must create a new commitment to retry.

**Q: Can users fund commitments with their own wallets?**
A: Not in the current implementation. All funding is done server-side using BOT_WIF. This could be added as an alternative flow in the future.

**Q: What happens if the bot wallet runs out of funds?**
A: Funding attempts will fail with an error. The server should monitor BOT_WALLET balance and alert admins when it's low.

**Q: How are disputes funded?**
A: Same process as commitments: create dispute → user confirms → server funds stake from BOT_WIF.

**Q: Can confirmations be reused?**
A: No. Once a confirmation is used for funding (successful or failed), it's marked as confirmed and cannot be reused.
