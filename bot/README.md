# MNEE Commit Protocol Discord Bot

A Discord bot integrated with Google's Gemini API that allows users to interact with the MNEE Commit Protocol through natural language.

## Features

- 🤖 **Natural Language Interface**: Talk to the bot in plain English to interact with the commitment protocol
- 🧠 **Gemini AI Integration**: Powered by Google's Gemini 2.0 Flash with function calling
- 🔧 **MCP (Model Context Protocol)**: Structured tool definitions for blockchain operations
- 💰 **Full Protocol Support**: Create commitments, mark deliverables, manage disputes

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit the `.env` file:

```env
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id

GEMINI_API_KEY=your_gemini_api_key_here
SERVER_URL=http://localhost:3000
```

**Get a Gemini API Key:**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Sign in with your Google account
- Click "Create API Key"
- Copy and paste it into your `.env` file

### 3. Start the Server

Make sure your MNEE Commit Protocol server is running on `http://localhost:3000` (or update `SERVER_URL` accordingly).

### 4. Run the Bot

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

Mention the bot in any Discord channel and ask it to perform actions:

### Creating a Commitment

```
@YourBot create a commitment for 10000 satoshis to contributor address 1ABC...XYZ
The delivery deadline is January 15, 2026 at 5pm
Set a 72 hour dispute window
```

### Checking Status

```
@YourBot what's the status of commitment abc123?
```

### Marking as Delivered

```
@YourBot I've delivered commitment xyz789
The deliverable hash is abcd1234efgh5678
```

### Opening a Dispute

```
@YourBot I want to dispute commitment xyz789
The work wasn't completed as specified
```

### Listing Commitments

```
@YourBot show me all commitments for address 1ABC...XYZ
```

## Architecture

### Files

- **`index.js`**: Main Discord bot entry point
- **`mcp-server.js`**: MCP tool definitions and system instructions for Gemini
- **`gemini-service.js`**: Gemini API client with function calling support
- **`server-client.js`**: HTTP client for MNEE Commit Protocol server API

### Flow

1. User mentions bot with a message
2. Bot sends message to Gemini API with MCP tool definitions
3. Gemini analyzes the message and decides which tool to call
4. Bot executes the tool via server API
5. Bot sends result back to Gemini for natural language response
6. Bot replies to user with friendly message

## Available Tools (MCP)

- `create_commitment` - Create a new commitment
- `mark_delivered` - Mark commitment as delivered
- `get_commitment` - Get commitment details
- `list_commitments` - List commitments for an address
- `open_dispute` - Open a dispute
- `resolve_dispute` - Resolve a dispute (admin)
- `get_dispute` - Get dispute details

## Example Conversations

**User:** "@Bot hey, can you explain what this protocol does?"

**Bot:** "The MNEE Commit Protocol is a blockchain-based escrow system on Bitcoin SV. Clients can lock funds that will be released to contributors upon successful delivery. It includes dispute resolution and time-based safeguards."

---

**User:** "@Bot create a commitment: 5000 sats to 1ContributorAddress, due Jan 10 2026, 48hr dispute window"

**Bot:** "⚙️ Executing: create_commitment...
✅ Commitment created successfully! 
- Commit ID: abc123xyz
- Amount: 5000 satoshis
- Deadline: January 10, 2026
- Dispute window: 48 hours"

---

**User:** "@Bot check abc123xyz"

**Bot:** "Here's the commitment status:
- State: DELIVERED
- Client: 1ClientAddr...
- Contributor: 1ContribAddr...
- Delivered at: January 8, 2026 3:45 PM
- Funds will auto-release after dispute window"

## Troubleshooting

### Bot not responding
- Check that `GEMINI_API_KEY` is set correctly
- Verify the server is running on `SERVER_URL`
- Check bot has proper Discord permissions (Read Messages, Send Messages)

### "Server is not responding" error
- Make sure the MNEE server is running: `cd ../server && npm start`
- Verify `SERVER_URL` in `.env` matches your server address

### Gemini API errors
- Check your API key is valid
- Ensure you haven't exceeded quota limits
- Try regenerating your API key

## Development

The bot uses ES modules (`type: "module"` in package.json), so all imports use `.js` extensions.

To modify bot behavior:
- Edit system instructions in `mcp-server.js`
- Add new tools to `MCP_TOOLS` array
- Update `server-client.js` to handle new endpoints
