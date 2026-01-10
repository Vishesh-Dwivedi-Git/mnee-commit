/**
 * MCP Server for MNEE Commit Protocol
 * Exposes Discord server-specific tools for Gemini API
 *
 * IMPORTANT: guildId is NEVER a tool parameter - it's injected from Discord context
 * This prevents Gemini from hallucinating values
 */

export const MCP_TOOLS = [
  // ============================================================================
  // Quick Query Tools (Micro Features)
  // ============================================================================
  {
    name: "help",
    description: "Show available commands and what the bot can help with",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "who_is",
    description: "Look up a Discord user's linked Ethereum wallet address by their username",
    parameters: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "Discord username to look up (without @)",
        },
      },
      required: ["username"],
    },
  },
  {
    name: "am_i_registered",
    description: "Check if the calling user has linked their Ethereum wallet to their Discord account",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "is_server_active",
    description: "Check if this Discord server is registered with Commit Protocol and can create commitments",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "commitment_status",
    description: "Get quick status summary of a commitment (state, amount, deadline)",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The commitment ID to check",
        },
      },
      required: ["commitId"],
    },
  },
  {
    name: "time_left",
    description: "Check how much time is left until a commitment's deadline",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The commitment ID to check deadline for",
        },
      },
      required: ["commitId"],
    },
  },

  // ============================================================================
  // Wallet Management
  // ============================================================================
  {
    name: "link_wallet",
    description: "Link an Ethereum wallet address to the user's Discord account. Required before creating or receiving commitments.",
    parameters: {
      type: "object",
      properties: {
        walletAddress: {
          type: "string",
          description: "Ethereum wallet address (0x followed by 40 hex characters)",
        },
      },
      required: ["walletAddress"],
    },
  },
  {
    name: "get_my_wallet",
    description: "Get the caller's linked Ethereum wallet address",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ============================================================================
  // Server Balance (Read Only - deposits via frontend)
  // ============================================================================
  {
    name: "get_server_balance",
    description: "Get the current MNEE balance for this Discord server, including total deposited, spent, and available.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ============================================================================
  // Commitment Management
  // ============================================================================
  {
    name: "create_commitment",
    description: "Create a new work commitment. The amount is deducted from the server's prepaid MNEE balance. The contributor must have linked their wallet.",
    parameters: {
      type: "object",
      properties: {
        contributorUsername: {
          type: "string",
          description: "Discord username of the person who will do the work (without @)",
        },
        amountMNEE: {
          type: "number",
          description: "Payment amount in MNEE (e.g., 500 for 500 MNEE)",
        },
        taskDescription: {
          type: "string",
          description: "Description of the work to be done",
        },
        deadlineDays: {
          type: "number",
          description: "Number of days from now until the deadline",
        },
      },
      required: ["contributorUsername", "amountMNEE", "taskDescription", "deadlineDays"],
    },
  },
  {
    name: "submit_work",
    description: "Submit completed work for a commitment. Only the assigned contributor can submit.",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The commitment ID to submit work for",
        },
        description: {
          type: "string",
          description: "Brief description of the completed work",
        },
        deliverableUrl: {
          type: "string",
          description: "URL to the deliverable (GitHub repo, Google Doc, etc.)",
        },
      },
      required: ["commitId", "description", "deliverableUrl"],
    },
  },
  {
    name: "get_commitment",
    description: "Get detailed information about a specific commitment by its ID",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The commitment ID to retrieve",
        },
      },
      required: ["commitId"],
    },
  },
  {
    name: "list_commitments",
    description: "List all commitments for this Discord server",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["all", "active", "completed", "disputed"],
          description: "Filter by status (optional, defaults to 'all')",
        },
      },
      required: [],
    },
  },
  {
    name: "my_commitments",
    description: "List all commitments where the caller is the contributor",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ============================================================================
  // Disputes
  // ============================================================================
  {
    name: "open_dispute",
    description: "Open a dispute for a commitment if unsatisfied with the submitted work. Must be within the dispute window.",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The commitment ID to dispute",
        },
        reason: {
          type: "string",
          description: "Reason for opening the dispute",
        },
      },
      required: ["commitId", "reason"],
    },
  },
];

/**
 * Get system instruction for Gemini API
 */
export function getSystemInstruction() {
  return `You are an AI assistant for the MNEE Commit Protocol Discord Bot. This is a trustless escrow system for work commitments using MNEE tokens.

## CRITICAL RULES
1. **NEVER include guildId in tool calls** - it's automatically injected from Discord context
2. **NEVER make up parameters** - if unsure, ask the user to clarify
3. **Always use exact parameter names** as defined in the tools

## Your Capabilities

### Quick Queries
- **help** - Show what I can do
- **who_is** - Look up someone's wallet by username
- **am_i_registered** - Check if caller has linked wallet
- **is_server_active** - Check if server is registered
- **commitment_status** - Quick status of a commitment
- **time_left** - Time until deadline

### Wallet
- **link_wallet** - Link Ethereum wallet (REQUIRED before using protocol)
- **get_my_wallet** - Show linked wallet

### Commitments
- **create_commitment** - Create work agreement (needs contributor username, amount, description, deadline days)
- **submit_work** - Submit completed work (needs commit ID, description, URL)
- **get_commitment** - Get commitment details
- **list_commitments** - List server commitments
- **my_commitments** - List caller's commitments
- **open_dispute** - Challenge work quality

### Balance
- **get_server_balance** - Check server's MNEE balance

## Important Notes
- Server registration and deposits are done via the **web dashboard**, not the bot
- If a server is not registered, direct users to https://commit.protocol/ to register
- All amounts are in MNEE (e.g., 500 = 500 MNEE)
- Contributors must link their wallet before they can receive commitments

## Example Interactions

User: "What can you do?"
→ Call help (no parameters)

User: "Check my wallet"
→ Call get_my_wallet (no parameters)

User: "Link my wallet 0x1234..."
→ Call link_wallet with walletAddress: "0x1234..."

User: "Create a commitment for @alice, 500 MNEE, build an API, 7 days"
→ Call create_commitment with contributorUsername: "alice", amountMNEE: 500, taskDescription: "build an API", deadlineDays: 7

User: "What's the status of commitment 5?"
→ Call commitment_status with commitId: "5"

User: "How much time left on commitment 3?"
→ Call time_left with commitId: "3"

Always be helpful and guide users through the process!`;
}
