import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } from "discord.js";
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

// Initialize services
const geminiService = new GeminiService(process.env.GEMINI_API_KEY);
const serverClient = new ServerClient(process.env.SERVER_URL);

// Required role for creating commitments
const COMMIT_CREATOR_ROLE = process.env.COMMIT_CREATOR_ROLE || "commit-creator";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if user has required role
 */
function hasRole(member, roleName) {
  return member.roles.cache.some(role => 
    role.name.toLowerCase() === roleName.toLowerCase()
  );
}

/**
 * Format amount from wei to MNEE
 */
function formatMNEE(weiAmount) {
  const mnee = BigInt(weiAmount) / BigInt(10 ** 18);
  return `${mnee.toString()} MNEE`;
}

/**
 * Parse MNEE to wei
 */
function parseToWei(mneeAmount) {
  return (BigInt(Math.floor(Number(mneeAmount))) * BigInt(10 ** 18)).toString();
}

/**
 * Format data for Discord message (respects 2000 char limit)
 */
function formatDataForDiscord(data, success = true) {
  const prefix = success ? "✅ **Success!**\n" : "❌ **Error:**\n";

  if (data && data.balance) {
    // Format server balance response
    return `${prefix}**Server Balance:**
• Total Deposited: ${formatMNEE(data.balance.totalDeposited)}
• Total Spent: ${formatMNEE(data.balance.totalSpent)}
• Available: ${formatMNEE(data.balance.availableBalance)}`;
  }

  if (Array.isArray(data) && data.length > 0) {
    const formatted = data
      .slice(0, 5) // Limit to 5 items
      .map((item, idx) => {
        return `**${idx + 1}. Commitment ${item.id || item.commitId}**
• State: ${item.state}
• Amount: ${formatMNEE(item.amount)}
• Contributor: \`${item.contributorAddress?.substring(0, 10)}...\`
• Deadline: ${new Date(item.deadline * 1000).toLocaleString()}`;
      })
      .join("\n\n");

    const remaining = data.length > 5 ? `\n\n*...and ${data.length - 5} more*` : "";
    return prefix + formatted + remaining;
  } 
  
  if (typeof data === "object" && data !== null) {
    const jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.length > 1800) {
      return prefix + `\`\`\`json\n${jsonStr.substring(0, 1700)}\n...\`\`\`\n*(truncated)*`;
    }
    return prefix + `\`\`\`json\n${jsonStr}\n\`\`\``;
  }

  return prefix + String(data);
}

// ============================================================================
// Slash Commands Registration
// ============================================================================

const commands = [
  new SlashCommandBuilder()
    .setName("register-server")
    .setDescription("Register this Discord server with Commit Protocol (15 MNEE fee)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check server's MNEE balance"),
    
  new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposit MNEE to server balance")
    .addStringOption(option =>
      option.setName("amount")
        .setDescription("Amount of MNEE to deposit")
        .setRequired(true)),
        
  new SlashCommandBuilder()
    .setName("create-commitment")
    .setDescription("Create a new work commitment")
    .addUserOption(option =>
      option.setName("contributor")
        .setDescription("Discord user who will do the work")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("amount")
        .setDescription("MNEE amount to pay")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("description")
        .setDescription("Brief work description")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("days")
        .setDescription("Days until deadline")
        .setRequired(true)),
        
  new SlashCommandBuilder()
    .setName("commitments")
    .setDescription("List commitments for this server"),
    
  new SlashCommandBuilder()
    .setName("submit-work")
    .setDescription("Submit completed work for a commitment")
    .addStringOption(option =>
      option.setName("commit-id")
        .setDescription("Commitment ID")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("evidence")
        .setDescription("IPFS CID or link to deliverable")
        .setRequired(true)),
];

async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
  
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    console.log("Slash commands registered!");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

client.on("ready", async () => {
  console.log(`${client.user.tag} online`);
  await registerSlashCommands();
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const guildId = interaction.guildId;
  
  try {
    switch (interaction.commandName) {
      case "register-server": {
        await interaction.deferReply();
        const result = await serverClient.registerServer(guildId, interaction.user.id);
        await interaction.editReply(formatDataForDiscord(result.data, result.success));
        break;
      }
      
      case "balance": {
        await interaction.deferReply();
        const result = await serverClient.getServerBalance(guildId);
        await interaction.editReply(formatDataForDiscord(result.data, result.success));
        break;
      }
      
      case "deposit": {
        await interaction.deferReply();
        const amount = parseToWei(interaction.options.getString("amount"));
        const result = await serverClient.depositBalance(guildId, amount);
        await interaction.editReply(formatDataForDiscord(result.data, result.success));
        break;
      }
      
      case "create-commitment": {
        // Check role
        if (!hasRole(interaction.member, COMMIT_CREATOR_ROLE)) {
          await interaction.reply({
            content: `❌ You need the \`${COMMIT_CREATOR_ROLE}\` role to create commitments.`,
            ephemeral: true,
          });
          return;
        }
        
        await interaction.deferReply();
        
        const contributor = interaction.options.getUser("contributor");
        const amount = parseToWei(interaction.options.getString("amount"));
        const description = interaction.options.getString("description");
        const days = interaction.options.getInteger("days");
        
        // Note: In production, you'd store contributor's ETH address
        // For now, we use a placeholder - backend should handle Discord ID lookup
        const result = await serverClient.createCommitment({
          guildId,
          contributorAddress: "0x0000000000000000000000000000000000000000", // Placeholder
          amount,
          deadlineTimestamp: Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60),
          disputeWindowSeconds: 3 * 24 * 60 * 60, // 3 days default
          specCid: description, // In production, upload to IPFS
          discordUserId: interaction.user.id,
        });
        
        if (result.success) {
          await interaction.editReply(
            `✅ **Commitment Created!**\n` +
            `• ID: \`${result.data.commitId}\`\n` +
            `• Amount: ${formatMNEE(amount)}\n` +
            `• Contributor: ${contributor}\n` +
            `• Deadline: ${days} days`
          );
        } else {
          await interaction.editReply(`❌ Error: ${result.error}`);
        }
        break;
      }
      
      case "commitments": {
        await interaction.deferReply();
        const result = await serverClient.listServerCommitments(guildId);
        await interaction.editReply(formatDataForDiscord(result.data, result.success));
        break;
      }
      
      case "submit-work": {
        await interaction.deferReply();
        const commitId = interaction.options.getString("commit-id");
        const evidence = interaction.options.getString("evidence");
        const result = await serverClient.submitWork(guildId, commitId, evidence);
        await interaction.editReply(formatDataForDiscord(result.data, result.success));
        break;
      }
    }
  } catch (error) {
    console.error("Error handling command:", error);
    const reply = interaction.deferred 
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);
    await reply("❌ An error occurred processing your command.");
  }
});

// Handle mentions (natural language via Gemini)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.mentions.has(client.user)) {
    try {
      const userMessage = message.content
        .replace(`<@${client.user.id}>`, "")
        .trim();

      if (!userMessage) {
        await message.reply(
          "Hi! I'm the Commit Protocol bot. I can help you:\n" +
          "• `/register-server` - Register server (15 MNEE)\n" +
          "• `/balance` - Check MNEE balance\n" +
          "• `/create-commitment` - Create work commitment\n" +
          "• `/commitments` - List commitments\n" +
          "• `/submit-work` - Submit completed work\n\n" +
          "Or just ask me anything!"
        );
        return;
      }

      const guildId = message.guildId;
      
      await message.channel.sendTyping();
      
      // Process with Gemini, injecting guild context
      const contextMessage = `[Context: Discord Guild ID: ${guildId}, User ID: ${message.author.id}]\n\n${userMessage}`;
      const geminiResponse = await geminiService.processMessage(contextMessage);

      if (geminiResponse.type === "tool_call") {
        const { toolName, params } = geminiResponse;
        
        // Inject guildId if not present
        if (!params.guildId && guildId) {
          params.guildId = guildId;
        }

        await message.reply(`⚙️ Executing: ${toolName}...`);

        const toolResult = await serverClient.executeTool(toolName, params);

        const finalResponse = await geminiService.sendFunctionResponse(
          toolName,
          toolResult
        );

        if (!finalResponse || finalResponse.trim() === "") {
          const formatted = formatDataForDiscord(toolResult.data, toolResult.success);
          await message.reply(formatted);
        } else {
          // Truncate if needed
          const reply = finalResponse.length > 1900 
            ? finalResponse.substring(0, 1900) + "..." 
            : finalResponse;
          await message.reply(reply);
        }
      } else {
        // Text response
        const reply = geminiResponse.content.length > 1900
          ? geminiResponse.content.substring(0, 1900) + "..."
          : geminiResponse.content;
        await message.reply(reply);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      await message.reply(
        "Sorry, I encountered an error processing your request. Please try again."
      );
    }
  }
});

// ============================================================================
// Start Bot
// ============================================================================

client.login(process.env.BOT_TOKEN);
