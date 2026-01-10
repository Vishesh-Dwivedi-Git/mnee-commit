import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import GeminiService from "./gemini-service.js";
import ServerClient from "./server-client.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Initialize Gemini and Server clients
const geminiService = new GeminiService(process.env.GEMINI_API_KEY);
const serverClient = new ServerClient(process.env.SERVER_URL);

/**
 * Format data for Discord message (respects 2000 char limit)
 */
function formatDataForDiscord(data, success = true) {
  const prefix = success ? "✅ " : "❌ **Error:** ";

  if (!data) {
    return prefix + "No data returned";
  }

  if (typeof data === "string") {
    return prefix + data;
  }

  if (data.message) {
    return prefix + data.message;
  }

  if (Array.isArray(data) && data.length > 0) {
    const formatted = data
      .map((item, idx) => {
        return `**${idx + 1}. Commitment ${item.id?.substring(0, 8) || item.commitId || "?"}**
• State: ${item.state || "N/A"}
• Amount: ${item.amount || "N/A"}`;
      })
      .join("\n");

    if (formatted.length > 1900) {
      return prefix + formatted.substring(0, 1900) + "...\n*(truncated)*";
    }
    return prefix + formatted;
  } else if (typeof data === "object") {
    const jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.length > 1900) {
      return prefix + `\`\`\`json\n${jsonStr.substring(0, 1800)}\n...\`\`\`\n*(truncated)*`;
    }
    return prefix + `\`\`\`json\n${jsonStr}\n\`\`\``;
  }

  return prefix + String(data);
}

/**
 * Get context from interaction
 */
function getContext(interaction) {
  return {
    guildId: interaction.guildId,
    discordId: interaction.user.id,
    discordUsername: interaction.user.tag,
    isAdmin: interaction.member?.permissions?.has("Administrator") || false,
    roles: interaction.member?.roles?.cache?.map((r) => r.name) || [],
  };
}

client.on("clientReady", () => {
  console.log(`${client.user.tag} online`);
});

// ============================================================================
// Slash Command Handlers
// ============================================================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  const context = getContext(interaction);

  try {
    await interaction.deferReply();

    let result;

    switch (commandName) {
      // ==================== Quick Query Commands ====================
      case "ping":
        await interaction.editReply("🏓 Pong!");
        return;

      case "help":
        result = await serverClient.executeTool("help", {}, context);
        break;

      case "whois": {
        const user = interaction.options.getUser("user");
        result = await serverClient.executeTool("who_is", { username: user.username }, context);
        break;
      }

      case "myinfo":
        result = await serverClient.executeTool("am_i_registered", {}, context);
        break;

      case "serverstatus":
        result = await serverClient.executeTool("is_server_active", {}, context);
        break;

      case "status": {
        const commitId = interaction.options.getString("commit_id");
        result = await serverClient.executeTool("commitment_status", { commitId }, context);
        break;
      }

      case "timeleft": {
        const commitId = interaction.options.getString("commit_id");
        result = await serverClient.executeTool("time_left", { commitId }, context);
        break;
      }

      // ==================== Wallet Commands ====================
      case "linkwallet": {
        const address = interaction.options.getString("address");
        result = await serverClient.executeTool("link_wallet", { walletAddress: address }, context);
        break;
      }

      case "mywallet":
        result = await serverClient.executeTool("get_my_wallet", {}, context);
        break;

      // ==================== Balance Commands ====================
      case "balance":
        result = await serverClient.executeTool("get_server_balance", {}, context);
        break;

      // ==================== Commitment Commands ====================
      case "commit": {
        const contributor = interaction.options.getUser("contributor");
        const amount = interaction.options.getNumber("amount");
        const task = interaction.options.getString("task");
        const days = interaction.options.getNumber("days");

        result = await serverClient.executeTool(
          "create_commitment",
          {
            contributorUsername: contributor.username,
            amountMNEE: amount,
            taskDescription: task,
            deadlineDays: days,
          },
          context
        );
        break;
      }

      case "submit": {
        const commitId = interaction.options.getString("commit_id");
        const description = interaction.options.getString("description");
        const url = interaction.options.getString("url");

        result = await serverClient.executeTool(
          "submit_work",
          { commitId, description, deliverableUrl: url },
          context
        );
        break;
      }

      case "commitment": {
        const commitId = interaction.options.getString("commit_id");
        result = await serverClient.executeTool("get_commitment", { commitId }, context);
        break;
      }

      case "list": {
        const filter = interaction.options.getString("filter") || "all";
        result = await serverClient.executeTool("list_commitments", { status: filter }, context);
        break;
      }

      case "mycommits":
        result = await serverClient.executeTool("my_commitments", {}, context);
        break;

      // ==================== Dispute Commands ====================
      case "dispute": {
        const commitId = interaction.options.getString("commit_id");
        const reason = interaction.options.getString("reason");

        result = await serverClient.executeTool(
          "open_dispute",
          { commitId, reason },
          context
        );
        break;
      }

      default:
        await interaction.editReply("Unknown command");
        return;
    }

    // Format and send response
    const formatted = formatDataForDiscord(result?.data, result?.success);
    await interaction.editReply(formatted);

  } catch (error) {
    console.error(`Error handling /${commandName}:`, error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
});

// ============================================================================
// Natural Language (Mention) Handler with Gemini
// ============================================================================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.mentions.has(client.user)) {
    try {
      let member = message.member;
      if (!member && message.guild) {
        try {
          member = await message.guild.members.fetch(message.author.id);
        } catch (err) {
          console.error("Failed to fetch member:", err);
        }
      }

      const roles = member ? member.roles.cache.map((r) => ({ id: r.id, name: r.name })) : [];
      const isAdmin = member
        ? member.permissions.has("Administrator") ||
          member.roles.cache.some((r) => r.name.toLowerCase().includes("admin"))
        : false;

      const userMessage = message.content.replace(`<@${client.user.id}>`, "").trim();

      if (!userMessage) {
        await message.reply(
          "Hi! I'm the Commit Protocol bot. Use `/help` for commands, or just tell me what you need!"
        );
        return;
      }

      console.log(`[NL] User: ${message.author.tag}, Message: ${userMessage}`);

      await message.channel.sendTyping();
      const geminiResponse = await geminiService.processMessage(userMessage);

      console.log("[NL] Gemini response:", geminiResponse);

      if (geminiResponse.type === "tool_call") {
        const { toolName, params } = geminiResponse;

        const context = {
          guildId: message.guildId,
          discordId: message.author.id,
          discordUsername: message.author.tag,
          isAdmin,
          roles: roles.map((r) => r.name),
        };

        console.log(`[NL] Tool call: ${toolName}`, params);
        const toolResult = await serverClient.executeTool(toolName, params, context);
        console.log(`[NL] Tool result:`, toolResult);

        const finalResponse = await geminiService.sendFunctionResponse(toolName, toolResult);

        if (!finalResponse || finalResponse.trim() === "") {
          const formatted = formatDataForDiscord(toolResult?.data, toolResult?.success);
          await message.reply(formatted);
        } else {
          await message.reply(finalResponse.substring(0, 2000));
        }
      } else if (geminiResponse.type === "structured") {
        const context = {
          guildId: message.guildId,
          discordId: message.author.id,
          discordUsername: message.author.tag,
          isAdmin,
          roles: roles.map((r) => r.name),
        };

        const toolResult = await serverClient.executeTool(
          geminiResponse.action,
          geminiResponse.params,
          context
        );

        const formatted = formatDataForDiscord(toolResult?.data, toolResult?.success);
        await message.reply(formatted);
      } else {
        await message.reply(geminiResponse.content?.substring(0, 2000) || "I'm not sure how to help with that.");
      }
    } catch (error) {
      console.error("Error processing message:", error);
      await message.reply(
        "Sorry, I encountered an error. Try using slash commands like `/help` or `/balance`."
      );
    }
  }
});

client.login(process.env.BOT_TOKEN);
