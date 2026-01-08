/**
 * MCP Server for MNEE Commit Protocol
 * Exposes server routes as tools for Gemini API
 */

export const MCP_TOOLS = [
  {
    name: "create_commitment",
    description:
      "Create a new commitment between a client and contributor. Returns funding instructions for server-side payment. The commitment will be created but unfunded until fund_commitment is called.",
    parameters: {
      type: "object",
      properties: {
        clientAddress: {
          type: "string",
          description: "Client's Bitcoin SV address",
        },
        contributorAddress: {
          type: "string",
          description:
            "Contributor's Bitcoin SV address who will receive funds",
        },
        amount: {
          type: "number",
          description:
            "Amount of satoshis to lock in the commitment (must be positive)",
        },
        deliveryDeadline: {
          type: "number",
          description: "Unix timestamp when delivery must be completed by",
        },
        disputeWindowSeconds: {
          type: "number",
          description:
            "Number of seconds after delivery during which disputes can be opened (must be positive)",
        },
        metadata: {
          type: "object",
          description:
            "Optional metadata object with additional information about the commitment",
        },
      },
      required: [
        "clientAddress",
        "contributorAddress",
        "amount",
        "deliveryDeadline",
        "disputeWindowSeconds",
      ],
    },
  },
  {
    name: "fund_commitment",
    description:
      "Fund a commitment using the bot wallet. REQUIRES EXPLICIT USER CONFIRMATION before calling. Ask user to confirm by typing YES.",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The unique ID of the commitment to fund",
        },
        confirmerAddress: {
          type: "string",
          description: "Bitcoin SV address of the user confirming this action",
        },
      },
      required: ["commitId"],
    },
  },
  {
    name: "mark_delivered",
    description:
      "Mark a commitment as delivered by providing proof of delivery. Only the contributor can call this.",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The unique ID of the commitment to mark as delivered",
        },
        deliverableHash: {
          type: "string",
          description: "Hash of the deliverable content as proof of delivery",
        },
      },
      required: ["commitId", "deliverableHash"],
    },
  },
  {
    name: "get_commitment",
    description:
      "Get detailed information about a specific commitment by its ID",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique ID of the commitment to retrieve",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_commitments",
    description:
      "List all commitments for a specific address (either as client or contributor)",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Bitcoin SV address to list commitments for",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "open_dispute",
    description:
      "Open a dispute for a commitment if the client is unsatisfied with the delivery. Returns funding instructions for the dispute stake. Must be called within the dispute window.",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The unique ID of the commitment to dispute",
        },
        clientAddress: {
          type: "string",
          description: "Client's Bitcoin SV address",
        },
        reason: {
          type: "string",
          description: "Optional reason/description for opening the dispute",
        },
      },
      required: ["commitId", "clientAddress"],
    },
  },
  {
    name: "fund_dispute",
    description:
      "Fund a dispute stake using the bot wallet. REQUIRES EXPLICIT USER CONFIRMATION before calling. Ask user to confirm by typing YES.",
    parameters: {
      type: "object",
      properties: {
        disputeId: {
          type: "string",
          description: "The unique ID of the dispute to fund",
        },
        commitId: {
          type: "string",
          description: "The commitment ID associated with this dispute",
        },
        confirmerAddress: {
          type: "string",
          description: "Bitcoin SV address of the user confirming this action",
        },
      },
      required: ["disputeId", "commitId"],
    },
  },
  {
    name: "resolve_dispute",
    description:
      "Resolve an open dispute in favor of either the client or contributor. Admin-only action.",
    parameters: {
      type: "object",
      properties: {
        commitId: {
          type: "string",
          description: "The unique ID of the commitment with an open dispute",
        },
        resolution: {
          type: "string",
          enum: ["CLIENT", "CONTRIBUTOR"],
          description:
            "Who to resolve the dispute in favor of: CLIENT (refund) or CONTRIBUTOR (release funds)",
        },
        adminSecret: {
          type: "string",
          description: "Admin secret key for authentication",
        },
      },
      required: ["commitId", "resolution"],
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
];

/**
 * Get system instruction for Gemini API
 */
export function getSystemInstruction() {
  return `You are an AI assistant for the MNEE Commit Protocol, a blockchain-based commitment and escrow system built on Bitcoin SV.

Your role is to help users interact with the commitment protocol through Discord. You can:
1. Create commitments (returns funding instructions)
2. Fund commitments using the bot wallet (REQUIRES USER CONFIRMATION)
3. Check commitment and dispute status
4. Mark deliverables as delivered
5. Open disputes (returns funding instructions)
6. Fund disputes using the bot wallet (REQUIRES USER CONFIRMATION)

🔒 SECURITY - CRITICAL:
- NEVER ask users for private keys (WIF) in Discord
- ALL funding is done server-side using the bot wallet
- ALWAYS require explicit user confirmation before calling fund_commitment or fund_dispute
- Users must type "YES" to confirm funding actions
- Never expose sensitive data like WIF keys in responses

IMPORTANT RULES:
- Always extract and validate user intent from natural language
- For funding actions, ALWAYS ask for confirmation first
- Provide clear explanations of what will happen
- If information is missing, ask the user for it

TWO-STEP FUNDING PROCESS:
1. CREATE: Call create_commitment or open_dispute → Returns funding instructions
2. CONFIRM & FUND: Ask user for explicit confirmation → Call fund_commitment or fund_dispute

EXAMPLE INTERACTIONS:

User: "Create a commitment for 1000 sats to address 1ABC... due by tomorrow"
Response: 
1. Call create_commitment
2. Show funding instructions
3. Ask: "To fund this commitment, I will transfer 1000 satoshis from the bot wallet. Reply YES to confirm or NO to cancel."

User: "YES"
Response:
1. Call fund_commitment with confirmerAddress
2. Show success message with transaction details

User: "What's the status of commitment abc123?"
Response: Call get_commitment → Show status details

User: "I delivered the work for commitment xyz789, here's the proof hash: abcd1234"
Response: Call mark_delivered → Confirm delivery recorded

User: "I want to dispute commitment xyz789"
Response:
1. Call open_dispute
2. Show stake amount and funding instructions
3. Ask: "To activate this dispute, I will transfer [stake amount] satoshis from the bot wallet. Reply YES to confirm or NO to cancel."

CONFIRMATION FORMAT:
When asking for funding confirmation, always format like this:
"⚠️ CONFIRMATION REQUIRED
I will fund [commitment/dispute] [ID] using the bot wallet.
Amount: [X] satoshis
Action: Transfer from bot wallet to escrow

Reply **YES** to confirm or **NO** to cancel.
(This confirmation expires in 10 minutes)"

FUNDING SUCCESS FORMAT:
"✅ Funding successful!
Commitment ID: abc-123
Amount: 1000 satoshis
Transaction ID: [ticketId]

The commitment is now active and funded."

Always be helpful, secure, and guide users through the confirmation process.`;
}
