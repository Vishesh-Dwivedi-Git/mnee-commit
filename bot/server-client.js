import axios from "axios";

/**
 * Client for interacting with MNEE Commit Protocol Server
 */
class ServerClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || "http://localhost:3000";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  /**
   * Create a new commitment
   */
  async createCommitment(params) {
    try {
      const response = await this.client.post("/commit/create", params);
      return response.data;
    } catch (error) {
      return this.handleError(error, "create commitment");
    }
  }

  /**
   * Mark a commitment as delivered
   */
  async markDelivered(params) {
    try {
      const response = await this.client.post("/commit/deliver", params);
      return response.data;
    } catch (error) {
      return this.handleError(error, "mark delivered");
    }
  }

  /**
   * Get commitment details by ID
   */
  async getCommitment(id) {
    try {
      const response = await this.client.get(`/commit/${id}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, "get commitment");
    }
  }

  /**
   * List commitments for an address
   */
  async listCommitments(address) {
    try {
      const response = await this.client.get(`/commit/list/${address}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, "list commitments");
    }
  }

  /**
   * Open a dispute
   */
  async openDispute(params) {
    try {
      const response = await this.client.post("/dispute/open", params);
      return response.data;
    } catch (error) {
      return this.handleError(error, "open dispute");
    }
  }

  /**
   * Resolve a dispute (admin only)
   */
  async resolveDispute(params) {
    try {
      const response = await this.client.post("/dispute/resolve", params);
      return response.data;
    } catch (error) {
      return this.handleError(error, "resolve dispute");
    }
  }

  /**
   * Get dispute details for a commitment
   */
  async getDispute(commitId) {
    try {
      const response = await this.client.get(`/dispute/${commitId}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, "get dispute");
    }
  }

  /**
   * Create a confirmation record for funding
   */
  async confirmCommitment(params) {
    try {
      const response = await this.client.post("/commit/confirm", params);
      return response.data;
    } catch (error) {
      return this.handleError(error, "confirm commitment");
    }
  }

  /**
   * Fund a commitment using the bot wallet
   */
  async fundCommitment(params) {
    try {
      const response = await this.client.post("/commit/fund", params);
      return response.data;
    } catch (error) {
      return this.handleError(error, "fund commitment");
    }
  }

  /**
   * Fund a dispute stake using the bot wallet
   */
  async fundDispute(params) {
    try {
      const response = await this.client.post("/dispute/fund", params);
      return response.data;
    } catch (error) {
      return this.handleError(error, "fund dispute");
    }
  }

  /**
   * Handle errors from API calls
   */
  handleError(error, action) {
    console.error(`Error during ${action}:`, error.message);

    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        error: error.response.data?.error || error.response.statusText,
        statusCode: error.response.status,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        success: false,
        error:
          "Server is not responding. Please check if the server is running.",
      };
    } else {
      // Something else happened
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a tool call from Gemini
   */
  async executeTool(toolName, params) {
    switch (toolName) {
      case "create_commitment":
        return await this.createCommitment(params);

      case "fund_commitment":
        return await this.fundCommitment(params);

      case "mark_delivered":
        return await this.markDelivered(params);

      case "get_commitment":
        return await this.getCommitment(params.id);

      case "list_commitments":
        return await this.listCommitments(params.address);

      case "open_dispute":
        return await this.openDispute(params);

      case "fund_dispute":
        return await this.fundDispute(params);

      case "resolve_dispute":
        return await this.resolveDispute(params);

      case "get_dispute":
        return await this.getDispute(params.commitId);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  }
}

export default ServerClient;
