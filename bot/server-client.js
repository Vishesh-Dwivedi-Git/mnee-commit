import axios from "axios";

/**
 * Client for interacting with MNEE Commit Protocol Backend
 * Updated for natural language experience - handles IPFS internally
 */
class ServerClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || "http://localhost:3001";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  // ============================================================================
  // User / Wallet Management
  // ============================================================================

  /**
   * Link a wallet address to a Discord user
   */
  async linkWallet(discordId, discordUsername, walletAddress) {
    try {
      const response = await this.client.post("/user", {
        username: discordUsername,
        walletAddress,
        discordId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "link wallet");
    }
  }

  /**
   * Get wallet address for a Discord user
   */
  async getWalletByDiscordId(discordId) {
    try {
      const response = await this.client.get(`/user/discord/${discordId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "get wallet");
    }
  }

  /**
   * Get wallet address by username
   */
  async getWalletByUsername(username) {
    try {
      // Remove @ prefix if present
      const cleanUsername = username.replace(/^@/, "").toLowerCase();
      const response = await this.client.get(`/user/${cleanUsername}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "get wallet by username");
    }
  }

  // ============================================================================
  // Server Registration & Balance
  // ============================================================================

  /**
   * Register a Discord server (15 MNEE fee)
   */
  async registerServer(guildId, adminDiscordId) {
    try {
      const response = await this.client.post("/server/register", {
        guildId,
        adminDiscordId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "register server");
    }
  }

  /**
   * Get server balance
   */
  async getServerBalance(guildId) {
    try {
      const response = await this.client.get(`/server/${guildId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "get server balance");
    }
  }

  // ============================================================================
  // Commitments (Natural Language - Backend handles IPFS)
  // ============================================================================

  /**
   * Create a commitment with natural language description
   * Backend handles IPFS upload of spec
   */
  async createCommitment(params) {
    try {
      const response = await this.client.post("/commit/create", {
        guildId: params.guildId,
        contributorUsername: params.contributorUsername,
        contributorAddress: params.contributorAddress, // resolved from username
        amountMNEE: params.amountMNEE,
        taskDescription: params.taskDescription,
        deadlineDays: params.deadlineDays,
        creatorDiscordId: params.creatorDiscordId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "create commitment");
    }
  }

  /**
   * Submit work with description and URL
   * Backend handles IPFS upload of evidence
   */
  async submitWork(params) {
    try {
      const response = await this.client.post(
        `/commit/${params.commitId}/submit`,
        {
          guildId: params.guildId,
          description: params.description,
          deliverableUrl: params.deliverableUrl,
          submitterDiscordId: params.submitterDiscordId,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "submit work");
    }
  }

  /**
   * Get commitment details
   */
  async getCommitment(commitId) {
    try {
      const response = await this.client.get(`/commit/${commitId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "get commitment");
    }
  }

  /**
   * List commitments for a server
   */
  async listCommitments(guildId, status = "all") {
    try {
      const response = await this.client.get(`/commit/server/${guildId}`, {
        params: { status },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "list commitments");
    }
  }

  /**
   * List commitments for a contributor (by Discord ID or wallet)
   */
  async myCommitments(discordId) {
    try {
      // First get wallet for this Discord user
      const userResult = await this.getWalletByDiscordId(discordId);
      if (!userResult.success) {
        return {
          success: false,
          error:
            "You haven't linked your wallet yet. Say 'link my wallet 0x...' first.",
        };
      }

      const walletAddress = userResult.data?.data?.walletAddress;
      if (!walletAddress) {
        return {
          success: false,
          error: "Wallet not found. Please link your wallet first.",
        };
      }

      const response = await this.client.get(
        `/commit/contributor/${walletAddress}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "list my commitments");
    }
  }

  // ============================================================================
  // Disputes
  // ============================================================================

  /**
   * Open a dispute
   */
  async openDispute(params) {
    try {
      const response = await this.client.post("/dispute/open", {
        guildId: params.guildId,
        commitId: params.commitId,
        reason: params.reason,
        disputerDiscordId: params.disputerDiscordId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "open dispute");
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  handleError(error, action) {
    console.error(`Error during ${action}:`, error.message);

    if (error.response) {
      return {
        success: false,
        error:
          error.response.data?.error ||
          error.response.data?.message ||
          error.response.statusText,
        statusCode: error.response.status,
      };
    } else if (error.request) {
      return {
        success: false,
        error: "Server is not responding. Please try again later.",
      };
    } else {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // Tool Execution (for Gemini integration)
  // ============================================================================

  /**
   * Execute a tool call from Gemini
   * Context contains: guildId, discordId, discordUsername, isAdmin, roles
   */
  async executeTool(toolName, params, context = {}) {
    const { guildId, discordId, discordUsername } = context;

    switch (toolName) {
      // User/Wallet
      case "link_wallet":
        return await this.linkWallet(
          discordId,
          discordUsername,
          params.walletAddress
        );

      case "get_my_wallet":
        return await this.getWalletByDiscordId(discordId);

      // Server registration & balance
      case "register_server":
        return await this.registerServer(guildId, discordId);

      case "get_server_balance":
        return await this.getServerBalance(guildId);

      // Commitments
      case "create_commitment": {
        // Resolve contributor username to wallet
        const contributorResult = await this.getWalletByUsername(
          params.contributorUsername
        );
        if (!contributorResult.success) {
          return {
            success: false,
            error: `User @${params.contributorUsername} hasn't linked their wallet yet. Ask them to say 'link my wallet 0x...' first.`,
          };
        }

        return await this.createCommitment({
          guildId,
          contributorUsername: params.contributorUsername,
          contributorAddress: contributorResult.data?.data?.walletAddress,
          amountMNEE: params.amountMNEE,
          taskDescription: params.taskDescription,
          deadlineDays: params.deadlineDays,
          creatorDiscordId: discordId,
        });
      }

      case "submit_work":
        return await this.submitWork({
          guildId,
          commitId: params.commitId,
          description: params.description,
          deliverableUrl: params.deliverableUrl,
          submitterDiscordId: discordId,
        });

      case "get_commitment":
        return await this.getCommitment(params.commitId);

      case "list_commitments":
        return await this.listCommitments(guildId, params.status || "all");

      case "my_commitments":
        return await this.myCommitments(discordId);

      // Disputes
      case "open_dispute":
        return await this.openDispute({
          guildId,
          commitId: params.commitId,
          reason: params.reason,
          disputerDiscordId: discordId,
        });

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  }
}

export default ServerClient;
