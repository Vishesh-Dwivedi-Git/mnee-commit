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
    GatewayIntentBits.GuildMembers, // Required to access member roles
  ],
});

// Initialize Gemini and Server clients
const geminiService = new GeminiService(process.env.GEMINI_API_KEY);
const serverClient = new ServerClient(process.env.SERVER_URL);

/**
 * Format data for Discord message (respects 2000 char limit)
 */
function formatDataForDiscord(data, success = true) {
  const prefix = success ? "✅ **Success!**\n" : "❌ **Error:**\n";

  if (Array.isArray(data) && data.length > 0) {
    const formatted = data
      .map((item, idx) => {
        return `**${idx + 1}. Commitment ${item.id?.substring(0, 8)}...**
• State: ${item.state}
• Amount: ${item.amount} (token: ${item.tokenAddress || "N/A"})
• Creator: ${item.clientAddress?.substring(0, 10)}...
• Contributor: ${item.contributorAddress?.substring(0, 10)}...
• Deadline: ${new Date(item.deliveryDeadline).toLocaleString()}`;
      })
      .join("\n\n");

    if (formatted.length > 1900) {
      return prefix + formatted.substring(0, 1900) + "...\n*(truncated)*";
    }
    return prefix + formatted;
  } else if (typeof data === "object") {
    const jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.length > 1900) {
      return (
        prefix +
        `\`\`\`json\n${jsonStr.substring(0, 1800)}\n...\`\`\`\n*(truncated)*`
      );
    }
    return prefix + `\`\`\`json\n${jsonStr}\n\`\`\``;
  }

  return prefix + String(data);
}

client.on("clientReady", () => {
  console.log(`${client.user.tag} online`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.mentions.has(client.user)) {
    try {
      // Get member and their roles
      let member = message.member;
      if (!member && message.guild) {
        try {
          member = await message.guild.members.fetch(message.author.id);
        } catch (err) {
          console.error("Failed to fetch member:", err);
        }
      }

      // Extract role information
      const roles = member
        ? member.roles.cache.map((r) => ({ id: r.id, name: r.name }))
        : [];

      const isAdmin = member
        ? member.permissions.has("Administrator") ||
          member.roles.cache.some((r) => r.name.toLowerCase().includes("admin"))
        : false;

      console.log(`User: ${message.author.tag} (${message.author.id})`);
      console.log(`Roles:`, roles.map((r) => r.name).join(", "));
      console.log(`Is Admin:`, isAdmin);

      const userMessage = message.content
        .replace(`<@${client.user.id}>`, "")
        .trim();

      if (!userMessage) {
        await message.reply(
          "Hi! How can I help you with the Commit Protocol? I can help you create commitments, check status, and manage disputes."
        );
        return;
      }

      console.log(`User message: ${userMessage}`);

      await message.channel.sendTyping();
      const geminiResponse = await geminiService.processMessage(userMessage);

      console.log("Gemini response:", geminiResponse);

      if (geminiResponse.type === "tool_call") {
        const { toolName, params } = geminiResponse;

        await message.reply(`⚙️ Executing: ${toolName}...`);

        // Pass context with guildId, discordId, etc.
        const context = {
          guildId: message.guildId,
          discordId: message.author.id,
          discordUsername: message.author.tag,
          isAdmin,
          roles: roles.map((r) => r.name),
        };

        console.log(`[Bot] Tool call: ${toolName}`, params);
        console.log(`[Bot] Context:`, context);
        const toolResult = await serverClient.executeTool(
          toolName,
          params,
          context
        );

        console.log(`[Bot] Tool result:`, toolResult);

        const finalResponse = await geminiService.sendFunctionResponse(
          toolName,
          toolResult
        );

        if (!finalResponse || finalResponse.trim() === "") {
          const formatted = formatDataForDiscord(
            toolResult.data,
            toolResult.success
          );
          await message.reply(formatted);
        } else {
          await message.reply(finalResponse);
        }
      } else if (geminiResponse.type === "structured") {
        if (geminiResponse.action === "query") {
          await message.reply(geminiResponse.response);
        } else {
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

          if (toolResult.success) {
            await message.reply(
              `✅ Success! ${JSON.stringify(toolResult.data, null, 2)}`
            );
          } else {
            await message.reply(`❌ Error: ${toolResult.error}`);
          }
        }
      } else {
        await message.reply(geminiResponse.content);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      await message.reply(
        "Sorry, I encountered an error processing your request. Please try again."
      );
    }
  }
});

client.login(process.env.BOT_TOKEN);
