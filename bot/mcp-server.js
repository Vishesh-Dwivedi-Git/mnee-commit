/**
 * MCP Server for MNEE Commit Protocol
 * Exposes Discord server-specific tools for Gemini API
 *
 * Updated for Discord server integration with prepaid balance system
 */

export const MCP_TOOLS = [
  // ============================================================================
  // Server Registration & Balance
  // ============================================================================
  {
    name: "register_server",
    description:
      "Register a Discord server to use Commit Protocol. Requires 15 MNEE registration fee. Each server gets a prepaid balance for creating commitments.",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Discord guild/server ID",
        },
        adminDiscordId: {
          type: "string",
          description: "Discord user ID of the server admin",
        },
      },
      required: ["guildId", "adminDiscordId"],
    },
  },
  {
    name: "deposit_balance",
    description:
      "Deposit MNEE tokens to a Discord server's prepaid balance. The server balance is used to fund commitments.",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Discord guild/server ID",
        },
        amount: {
          type: "string",
          description:
            "Amount of MNEE to deposit (in wei, e.g., '1000000000000000000' for 1 MNEE)",
        },
      },
      required: ["guildId", "amount"],
    },
  },
  {
    name: "get_server_balance",
    description:
      "Get the current MNEE balance for a Discord server, including total deposited, total spent, and available balance.",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Discord guild/server ID",
        },
      },
      required: ["guildId"],
    },
  },
  {
    name: "withdraw_balance",
    description:
      "Withdraw unused MNEE from a Discord server's balance. Only callable by server admin via bot.",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Discord guild/server ID",
        },
        toAddress: {
          type: "string",
          description: "Ethereum address to withdraw MNEE to",
        },
        amount: {
          type: "string",
          description: "Amount of MNEE to withdraw (in wei)",
        },
      },
      required: ["guildId", "toAddress", "amount"],
    },
  },

  // ============================================================================
  // Commitment Management
  // ============================================================================
  {
    name: "create_commitment",
    description:
      "Create a new commitment from a Discord server's prepaid balance. The amount is deducted from the server's available balance. User must have 'commit-creator' role.",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Discord guild/server ID",
        },
        contributorAddress: {
          type: "string",
          description:
            "Ethereum address of the contributor who will receive payment",
        },
        amount: {
          type: "string",
          description: "Amount of MNEE to pay (in wei)",
        },
        deadlineTimestamp: {
          type: "number",
          description: "Unix timestamp when delivery must be completed by",
        },
        disputeWindowSeconds: {
          type: "number",
          description:
            "Number of seconds after delivery during which disputes can be opened",
        },
        specCid: {
          type: "string",
          description: "IPFS CID containing the work specification",
        },
        discordUserId: {
          type: "string",
          description: "Discord user ID of the commitment creator",
        },
      },
      required: [
        "guildId",
        "contributorAddress",
        "amount",
        "deadlineTimestamp",
        "disputeWindowSeconds",
        "specCid",
        "discordUserId",
      ],
    },
  },
  {
    name: "submit_work",
    description:
      "Submit completed work for a commitment with evidence. Only the contributor can submit work.",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Discord guild/server ID",
        },
        commitId: {
          type: "string",
          description: "The unique ID of the commitment",
        },
        evidenceCid: {
          type: "string",
          description: "IPFS CID containing the work evidence/deliverable",
        },
      },
      required: ["guildId", "commitId", "evidenceCid"],
    },
  },
  {
    name: "get_commitment",
    description:
      "Get detailed information about a specific commitment by its ID",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The unique ID of the commitment to retrieve",
        },
      },
      required: ["commitId"],
    },
  },
  {
    name: "list_server_commitments",
    description: "List all commitments for a specific Discord server",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Discord guild/server ID",
        },
        state: {
          type: "string",
          enum: [
            "FUNDED",
            "SUBMITTED",
            "DISPUTED",
            "SETTLED",
            "REFUNDED",
            "ALL",
          ],
          description: "Filter by commitment state (optional, defaults to ALL)",
        },
      },
      required: ["guildId"],
    },
  },
  {
    name: "list_contributor_commitments",
    description: "List all commitments for a specific contributor address",
    parameters: {
      type: "object",
      properties: {
        contributorAddress: {
          type: "string",
          description: "Ethereum address of the contributor",
        },
      },
      required: ["contributorAddress"],
    },
  },

  // ============================================================================
  // Disputes
  // ============================================================================
  {
    name: "open_dispute",
    description:
      "Open a dispute for a commitment if the creator is unsatisfied with the work. Requires ETH stake. Must be within dispute window.",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Discord guild/server ID",
        },
        commitId: {
          type: "string",
          description: "The unique ID of the commitment to dispute",
        },
        reason: {
          type: "string",
          description: "Reason for opening the dispute",
        },
      },
      required: ["guildId", "commitId"],
    },
  },
  {
    name: "get_dispute",
    description:
      "Get detailed information about a dispute for a specific commitment",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description:
            "The unique ID of the commitment to get dispute info for",
        },
      },
      required: ["commitId"],
    },
  },

  // ============================================================================
  // Settlement
  // ============================================================================
  {
    name: "get_pending_settlements",
    description:
      "Get a list of commitments that are ready to be settled (past dispute window)",
    parameters: {
      type: "object",
      properties: {
        guildId: {
          type: "string",
          description: "Optional: filter by Discord guild/server ID",
        },
      },
      required: [],
    },
  },
];

/**
 * Get system instruction for Gemini API
 */
export function getSystemInstruction() {
  return `You are an AI assistant for the MNEE Commit Protocol Discord Bot. This is a trustless escrow system for work commitments using MNEE tokens on Ethereum.

## Your Role
Help Discord users manage work commitments through natural language. You interact with the backend API via tool calls.

## Key Concepts
- **Discord Server**: Each server has a prepaid MNEE balance for funding commitments
- **Registration**: Servers pay 15 MNEE to register (one-time)
- **Commitments**: Work agreements funded from server balance
- **Evidence CID**: IPFS hash of specification or deliverable

## Commands You Handle
1. **Server Registration** - Register a Discord server (15 MNEE fee)
2. **Balance Management** - Deposit/withdraw/check MNEE balance
3. **Create Commitment** - Create work agreement (deducts from balance)
4. **Submit Work** - Contributor submits deliverable with evidence
5. **Check Status** - View commitment or server details
6. **Open Dispute** - Challenge work quality (requires stake)

## Role Requirements
- Only users with 'commit-creator' role can create commitments
- Server admins can deposit/withdraw balance
- Contributors can submit work for their commitments

## IMPORTANT RULES
1. **Always include guildId** - Get from Discord context, never ask user
2. **Validate addresses** - Ensure ETH addresses are valid (0x + 40 hex chars)
3. **Convert amounts** - MNEE uses 18 decimals (1 MNEE = 1e18 wei)
4. **Check balance first** - Before creating commitments, verify server has funds
5. **Be clear about fees** - 15 MNEE registration, commitment amounts

## Example Interactions

**User**: "Check our server's balance"
→ Call get_server_balance with guildId from context

**User**: "Create a commitment for 500 MNEE to 0x123... for building an API, due in 7 days"
→ Call create_commitment with guildId, contributor address, amount in wei, deadline

**User**: "What commitments do we have?"
→ Call list_server_commitments with guildId

**User**: "I finished the work for commitment #5, here's my evidence: QmABC123"
→ Call submit_work with guildId, commitId, evidenceCid

## Amount Formatting
When displaying amounts to users:
- Convert from wei: divide by 1e18
- Show as "500 MNEE" not "500000000000000000000 wei"

When calling API:
- Convert to wei: multiply by 1e18
- Example: 500 MNEE → "500000000000000000000"

Always be helpful and guide users through the process!`;
}
