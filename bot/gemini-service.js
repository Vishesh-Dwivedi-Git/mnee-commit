import { GoogleGenerativeAI } from "@google/generative-ai";
import { MCP_TOOLS, getSystemInstruction } from "./mcp-server.js";

/**
 * Gemini API Service with MCP Integration
 */
class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Higher free tier quota than gemini-2.5-flash-lite
      systemInstruction: getSystemInstruction(),
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    // Initialize chat with MCP tools
    this.chat = null;
  }

  /**
   * Start a new chat session with MCP tools
   */
  startChat() {
    this.chat = this.model.startChat({
      tools: [
        {
          functionDeclarations: MCP_TOOLS,
        },
      ],
    });
    return this.chat;
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.status === 429 && i < maxRetries - 1) {
          // Rate limited - wait and retry
          const waitMs = Math.pow(2, i) * 1000 + Math.random() * 1000;
          console.log(`[Gemini] Rate limited, retrying in ${Math.round(waitMs)}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Process a user message and get Gemini's response with tool calls
   * @param {string} message - User's message
   * @returns {Promise<{type: 'text'|'tool_call', content: string|object}>}
   */
  async processMessage(message) {
    try {
      if (!this.chat) {
        this.startChat();
      }

      const result = await this.retryWithBackoff(async () => {
        return await this.chat.sendMessage(message);
      });
      
      if (!result || !result.response) {
        console.error("[Gemini] Empty response from API");
        return {
          type: "text",
          content: "I'm having trouble processing that request. Please try again.",
        };
      }
      
      const response = result.response;

      // Check if Gemini wants to call a function
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        // Return the first function call
        const functionCall = functionCalls[0];
        return {
          type: "tool_call",
          toolName: functionCall.name,
          params: functionCall.args,
        };
      }

      // Otherwise return text response
      let text = "";
      try {
        text = response.text();
      } catch (e) {
        console.error("[Gemini] Error getting text from response:", e);
      }

      // Handle empty text
      if (!text || text.trim() === "") {
        return {
          type: "text",
          content: "I understood your request but I'm not sure how to respond. Try rephrasing or ask for 'help'.",
        };
      }

      // Try to parse as JSON in case it's a structured response
      try {
        const jsonResponse = JSON.parse(text);
        if (jsonResponse.action) {
          return {
            type: "structured",
            action: jsonResponse.action,
            params: jsonResponse.params || {},
            response: jsonResponse.response,
          };
        }
      } catch (e) {
        // Not JSON, return as text
      }

      return {
        type: "text",
        content: text,
      };
    } catch (error) {
      console.error("Error processing message with Gemini:", error);
      throw error;
    }
  }

  /**
   * Send function response back to Gemini
   * @param {string} functionName - Name of the function that was called
   * @param {object} functionResponse - Response from the function
   * @returns {Promise<string>} - Gemini's natural language response
   */
  async sendFunctionResponse(functionName, functionResponse) {
    try {
      const result = await this.chat.sendMessage([
        {
          functionResponse: {
            name: functionName,
            response: functionResponse,
          },
        },
      ]);

      return result.response.text();
    } catch (error) {
      console.error("Error sending function response to Gemini:", error);
      throw error;
    }
  }

  /**
   * Reset the chat session
   */
  resetChat() {
    this.chat = null;
  }
}

export default GeminiService;
