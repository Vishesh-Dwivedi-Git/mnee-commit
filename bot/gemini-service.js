import { GoogleGenerativeAI } from "@google/generative-ai";
import { MCP_TOOLS, getSystemInstruction } from "./mcp-server.js";

/**
 * Gemini API Service with MCP Integration
 */
class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
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
   * Process a user message and get Gemini's response with tool calls
   * @param {string} message - User's message
   * @returns {Promise<{type: 'text'|'tool_call', content: string|object}>}
   */
  async processMessage(message) {
    try {
      if (!this.chat) {
        this.startChat();
      }

      const result = await this.chat.sendMessage(message);
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
      const text = response.text();

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
