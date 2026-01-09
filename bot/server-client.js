import axios from "axios";

/**
 * Client for interacting with MNEE Commit Protocol Backend
 * Updated for Discord server integration with prepaid balance system
 */
class ServerClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || "http://localhost:3000";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  // ============================================================================
  // Server Registration & Balance
  // ============================================================================

  /**
   * Register a Discord server
   * @param {string} guildId - Discord guild ID
   * @param {string} adminDiscordId - Admin's Discord user ID
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
   * Deposit MNEE to server balance
   * @param {string} guildId - Discord guild ID
   * @param {string} amount - Amount in wei
   */
  async depositBalance(guildId, amount) {
    try {
      const response = await this.client.post(`/server/${guildId}/deposit`, {
        amount,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "deposit balance");
    }
  }

  /**
   * Get server balance
   * @param {string} guildId - Discord guild ID
   */
  async getServerBalance(guildId) {
    try {
      const response = await this.client.get(`/server/${guildId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "get server balance");
    }
  }

  /**
   * Withdraw from server balance
   * @param {string} guildId - Discord guild ID
   * @param {string} toAddress - Destination ETH address
   * @param {string} amount - Amount in wei
   */
  async withdrawBalance(guildId, toAddress, amount) {
    try {
      const response = await this.client.post(`/server/${guildId}/withdraw`, {
        toAddress,
        amount,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "withdraw balance");
    }
  }

  // ============================================================================
  // Commitment Management
  // ============================================================================

  /**
   * Create a new commitment
   */
  async createCommitment(params) {
    try {
      const response = await this.client.post("/commit/create", {
        guildId: params.guildId,
        contributorAddress: params.contributorAddress,
        amount: params.amount,
        deadlineTimestamp: params.deadlineTimestamp,
        disputeWindowSeconds: params.disputeWindowSeconds,
        specCid: params.specCid,
        discordUserId: params.discordUserId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "create commitment");
    }
  }

  /**
   * Submit work for a commitment
   */
  async submitWork(guildId, commitId, evidenceCid) {
    try {
      const response = await this.client.post(`/commit/${commitId}/submit`, {
        guildId,
        evidenceCid,
      });
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
  async listServerCommitments(guildId, state = "ALL") {
    try {
      const response = await this.client.get(`/commit/server/${guildId}`, {
        params: { state },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "list server commitments");
    }
  }

  /**
   * List commitments for a contributor
   */
  async listContributorCommitments(contributorAddress) {
    try {
      const response = await this.client.get(`/commit/contributor/${contributorAddress}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "list contributor commitments");
    }
  }

  // ============================================================================
  // Disputes
  // ============================================================================

  /**
   * Open a dispute
   */
  async openDispute(guildId, commitId, reason) {
    try {
      const response = await this.client.post("/dispute/open", {
        guildId,
        commitId,
        reason,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "open dispute");
    }
  }

  /**
   * Get dispute details
   */
  async getDispute(commitId) {
    try {
      const response = await this.client.get(`/dispute/${commitId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "get dispute");
    }
  }

  // ============================================================================
  // Settlement
  // ============================================================================

  /**
   * Get pending settlements
   */
  async getPendingSettlements(guildId = null) {
    try {
      const params = guildId ? { guildId } : {};
      const response = await this.client.get("/settlement/pending", { params });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, "get pending settlements");
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
        error: error.response.data?.error || error.response.data?.message || error.response.statusText,
        statusCode: error.response.status,
      };
    } else if (error.request) {
      return {
        success: false,
        error: "Server is not responding. Please check if the server is running.",
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
   */
  async executeTool(toolName, params) {
    switch (toolName) {
      // Server management
      case "register_server":
        return await this.registerServer(params.guildId, params.adminDiscordId);

      case "deposit_balance":
        return await this.depositBalance(params.guildId, params.amount);

      case "get_server_balance":
        return await this.getServerBalance(params.guildId);

      case "withdraw_balance":
        return await this.withdrawBalance(params.guildId, params.toAddress, params.amount);

      // Commitments
      case "create_commitment":
        return await this.createCommitment(params);

      case "submit_work":
        return await this.submitWork(params.guildId, params.commitId, params.evidenceCid);

      case "get_commitment":
        return await this.getCommitment(params.commitId);

      case "list_server_commitments":
        return await this.listServerCommitments(params.guildId, params.state);

      case "list_contributor_commitments":
        return await this.listContributorCommitments(params.contributorAddress);

      // Disputes
      case "open_dispute":
        return await this.openDispute(params.guildId, params.commitId, params.reason);

      case "get_dispute":
        return await this.getDispute(params.commitId);

      // Settlement
      case "get_pending_settlements":
        return await this.getPendingSettlements(params.guildId);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  }
}

export default ServerClient;
