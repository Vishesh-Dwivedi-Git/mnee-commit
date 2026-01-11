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
  // Server Balance (Read Only)
  // ============================================================================

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
  // Settlement
  // ============================================================================

  /**
   * Get pending settlements
   */
  async getPendingSettlements() {
    try {
      const response = await this.client.get("/settlement/pending");
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "get pending settlements");
    }
  }

  /**
   * Batch settle all pending commitments
   */
  async batchSettleAll() {
    try {
      // First get pending settlements
      const pendingResult = await this.getPendingSettlements();
      if (!pendingResult.success || !pendingResult.data?.data) {
        return { success: false, error: "Could not fetch pending settlements" };
      }

      // The API returns { success: true, data: { count: X, settlements: [...] } }
      const settlements = pendingResult.data.data.settlements || [];

      if (settlements.length === 0) {
        return {
          success: true,
          data: { message: "No commitments ready for settlement" },
        };
      }

      const commitIds = settlements.map((s) => s.commitId);

      const response = await this.client.post("/settlement/batch", {
        commitIds,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "batch settle");
    }
  }

  /**
   * Settle a specific commitment
   */
  async settleCommitment(commitId) {
    try {
      const response = await this.client.post("/settlement/batch", {
        commitIds: [parseInt(commitId)],
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "settle commitment");
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
   *
   * IMPORTANT: guildId comes from context, NOT from Gemini params
   */
  async executeTool(toolName, params, context = {}) {
    const { guildId, discordId, discordUsername } = context;

    switch (toolName) {
      // ==================== Quick Query Tools ====================

      case "help":
        return {
          success: true,
          data: {
            message: "Here's what I can help with:",
            commands: [
              "**Wallet**: link my wallet, check my wallet",
              "**Commitments**: create commitment, submit work, list commitments, my commitments",
              "**Status**: check commitment status, time left on commitment",
              "**Server**: check server balance, is server registered",
              "**Disputes**: open dispute",
            ],
            tip: "Try saying 'create a commitment for @username, 500 MNEE, for building a website, due in 7 days'",
          },
        };

      case "who_is":
        return await this.getWalletByUsername(params.username);

      case "am_i_registered":
        return await this.getWalletByDiscordId(discordId);

      case "is_server_active": {
        const serverResult = await this.getServerBalance(guildId);
        if (!serverResult.success) {
          return {
            success: true,
            data: {
              isActive: false,
              message:
                "This server is not registered. Register at https://commit.protocol/ to get started.",
            },
          };
        }
        return {
          success: true,
          data: {
            isActive: true,
            balance: serverResult.data?.data?.availableBalance || "0",
            message: "This server is registered and active!",
          },
        };
      }

      case "commitment_status": {
        const commitment = await this.getCommitment(params.commitId);
        if (!commitment.success) return commitment;

        const data = commitment.data?.data;
        return {
          success: true,
          data: {
            commitId: params.commitId,
            state: data?.state || "Unknown",
            amount: data?.amount || "0",
            deadline: data?.deadline,
            contributor: data?.contributor,
            summary: `Commitment ${params.commitId}: ${data?.state} - ${data?.amount} MNEE`,
          },
        };
      }

      case "time_left": {
        const commitment = await this.getCommitment(params.commitId);
        if (!commitment.success) return commitment;

        const deadline = commitment.data?.data?.deadline;
        if (!deadline) {
          return { success: false, error: "Could not find deadline" };
        }

        const now = Math.floor(Date.now() / 1000);
        const deadlineTs =
          typeof deadline === "number" ? deadline : parseInt(deadline);
        const diff = deadlineTs - now;

        if (diff <= 0) {
          return {
            success: true,
            data: { timeLeft: "Expired", expired: true },
          };
        }

        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);

        return {
          success: true,
          data: {
            timeLeft: `${days}d ${hours}h ${minutes}m`,
            expired: false,
            deadlineTimestamp: deadlineTs,
          },
        };
      }

      // ==================== Wallet Tools ====================

      case "link_wallet":
        return await this.linkWallet(
          discordId,
          discordUsername,
          params.walletAddress
        );

      case "get_my_wallet":
        return await this.getWalletByDiscordId(discordId);

      // ==================== Server Balance ====================

      case "get_server_balance":
        return await this.getServerBalance(guildId);

      // ==================== Commitments ====================

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
      case "my_assignments":
        // Both commands show commits where user is the contributor
        return await this.myCommitments(discordId);

      // ==================== Disputes ====================

      case "calculate_stake":
        return await this.calculateStake(params.commitId);

      case "open_dispute":
        return await this.openDispute({
          guildId,
          commitId: params.commitId,
          reason: params.reason,
          disputerDiscordId: discordId,
        });

      // ==================== Settlement ====================

      case "get_pending_settlements":
        return await this.getPendingSettlements();

      case "batch_settle_all":
        return await this.batchSettleAll();

      case "settle_commitment":
        return await this.settleCommitment(params.commitId);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  }
}

export default ServerClient;
