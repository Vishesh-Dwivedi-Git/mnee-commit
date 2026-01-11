import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import GeminiService from "./gemini-service.js";
import ServerClient from "./server-client.js";
import { verifyWork, formatVerificationMessage } from "./ai-verifier.js";

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
 * Format MNEE amount for display (18 decimals)
 */
function formatMNEE(weiAmount) {
  if (!weiAmount) return "0";
  const num = BigInt(weiAmount);
  const whole = num / BigInt(10 ** 18);
  const decimal = (num % BigInt(10 ** 18)) / BigInt(10 ** 16); // 2 decimal places
  if (decimal > 0) {
    return `${whole}.${String(decimal).padStart(2, "0")}`;
  }
  return whole.toString();
}

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp) {
  if (!timestamp || timestamp === 0) return "N/A";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format data for Discord message - user-friendly, no JSON dumps
 */
function formatDataForDiscord(data, success = true) {
  if (!data) {
    return success ? "✅ Done!" : "❌ Something went wrong. Please try again.";
  }

  // Unwrap nested { success, data } structures from API responses
  if (typeof data === "object" && data.data && typeof data.data === "object") {
    // Use nested data, but check for message on outer level first
    if (data.message && !data.data.message) {
      data.data.message = data.message;
    }
    data = data.data;
  }

  // String message - just return it
  if (typeof data === "string") {
    return success ? `✅ ${data}` : `❌ ${data}`;
  }

  // Has a message field - use it
  if (data.message) {
    return success ? `✅ ${data.message}` : `❌ ${data.message}`;
  }

  // Server info (from /balance, /serverstatus, etc.)
  if (data.guildId && data.availableBalance !== undefined) {
    return `**📊 Server Balance**

💰 **Available:** ${formatMNEE(data.availableBalance)} MNEE
📥 **Total Deposited:** ${formatMNEE(data.totalDeposited)} MNEE
📤 **Total Spent:** ${formatMNEE(data.totalSpent)} MNEE
${data.isActive ? "✅ Server is active" : "⚠️ Server is inactive"}`;
  }

  // User wallet info
  if (data.walletAddress && data.username) {
    return `**👤 ${data.username}**
    
🔗 **Wallet:** \`${data.walletAddress}\`
🆔 **Discord ID:** ${data.discordId || "Not linked"}`;
  }

  // Commitment info (check for state - can be number or string)
  if (data.state !== undefined && data.amount !== undefined) {
    const stateEmoji = {
      0: "📝",
      1: "💰",
      2: "📤",
      3: "⚠️",
      4: "✅",
      5: "🔙",
      CREATED: "📝",
      FUNDED: "💰",
      SUBMITTED: "📤",
      DISPUTED: "⚠️",
      SETTLED: "✅",
      REFUNDED: "🔙",
    };
    const stateLabels = {
      0: "CREATED",
      1: "FUNDED",
      2: "SUBMITTED",
      3: "DISPUTED",
      4: "SETTLED",
      5: "REFUNDED",
    };

    const state =
      typeof data.state === "number" ? stateLabels[data.state] : data.state;
    const emoji = stateEmoji[data.state] || "📋";

    return `**${emoji} Commitment #${data.id || data.commitId || "?"}**

📍 **Status:** ${state}
💵 **Amount:** ${formatMNEE(data.amount)} MNEE
👷 **Contributor:** ${
      data.contributor?.slice(0, 10) ||
      data.contributorAddress?.slice(0, 10) ||
      "N/A"
    }...
📅 **Deadline:** ${formatDate(data.deliveryDeadline || data.deadline)}`;
  }

  // Commitment list from server (nested structure)
  if (data.commitments && Array.isArray(data.commitments)) {
    return formatCommitmentList(data.commitments, data.count);
  }

  // Array of commitments (direct)
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    (data[0].state !== undefined || data[0].amount)
  ) {
    return formatCommitmentList(data, data.length);
  }

  // Empty array
  if (Array.isArray(data) && data.length === 0) {
    return "📭 No commitments found.";
  }

  // Pending settlements list (check for settlements array)
  if (data.settlements && Array.isArray(data.settlements)) {
    if (data.settlements.length === 0) {
      return "✅ No commitments ready for settlement!";
    }

    let result = `**⏰ Pending Settlements (${data.settlements.length})**\n`;
    result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    data.settlements
      .slice(0, 20)
      .forEach(({ commitId, amount, contributor }) => {
        const mneeAmount = formatMNEE(amount);
        const shortContrib =
          contributor.slice(0, 6) + "..." + contributor.slice(-4);
        result += `✅ **#${commitId}** → ${mneeAmount} MNEE to \`${shortContrib}\`\n`;
      });

    if (data.settlements.length > 20) {
      result += `\n*...and ${data.settlements.length - 20} more*`;
    }

    result += `\n\n💡 Use \`/settle\` to settle all pending commitments`;
    return result;
  }

  // Pending settlements list (legacy format - array at top level)
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0].commitId !== undefined &&
    data[0].commitment
  ) {
    let result = `**⏰ Pending Settlements (${data.length})**\n`;
    result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    data.slice(0, 20).forEach(({ commitId, commitment }) => {
      const amount = formatMNEE(commitment.amount);
      const contributor =
        commitment.contributor.slice(0, 6) +
        "..." +
        commitment.contributor.slice(-4);
      result += `✅ **#${commitId}** → ${amount} MNEE to \`${contributor}\`\n`;
    });

    if (data.length > 20) {
      result += `\n*...and ${data.length - 20} more*`;
    }

    result += `\n\n💡 Use \`/settle\` to settle all pending commitments`;
    return result;
  }

  // Empty array
  if (Array.isArray(data) && data.length === 0) {
    return "📭 No commitments found.";
  }
  // Help response (check if it looks like help text)
  if (data.commands || data.help) {
    return typeof data.help === "string"
      ? data.help
      : "Use `/help` to see available commands.";
  }

  // Fallback: try to make something readable
  if (typeof data === "object") {
    let result = success ? "✅ **Success**\n\n" : "❌ **Error**\n\n";
    for (const [key, value] of Object.entries(data)) {
      if (key === "success" || key === "data") continue;
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());
      result += `• **${label}:** ${value}\n`;
    }
    return result.trim() || (success ? "✅ Done!" : "❌ Something went wrong.");
  }

  return success ? `✅ ${String(data)}` : `❌ ${String(data)}`;
}

function formatCommitmentList(commitments, count) {
  const stateEmoji = {
    0: "📝",
    1: "💰",
    2: "📤",
    3: "⚠️",
    4: "✅",
    5: "🔙",
    CREATED: "📝",
    FUNDED: "💰",
    SUBMITTED: "📤",
    DISPUTED: "⚠️",
    SETTLED: "✅",
    REFUNDED: "🔙",
  };
  const stateLabels = {
    0: "CREATED",
    1: "FUNDED",
    2: "SUBMITTED",
    3: "DISPUTED",
    4: "SETTLED",
    5: "REFUNDED",
  };

  let result = `**📋 Commitments (${count || commitments.length})**\n`;
  result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  commitments.slice(0, 10).forEach((c) => {
    const state = typeof c.state === "number" ? stateLabels[c.state] : c.state;
    const emoji = stateEmoji[c.state] || "📋";
    const id = c.id || c.commitId;
    const amount = formatMNEE(c.amount);
    const contributor = c.contributor || c.contributorAddress || "Unknown";
    const shortContrib =
      contributor.length > 10
        ? contributor.slice(0, 6) + "..." + contributor.slice(-4)
        : contributor;
    const deadline = formatDate(c.deadline || c.deliveryDeadline);

    result += `${emoji} **#${id}** | ${state}\n`;
    result += `   💵 ${amount} MNEE → \`${shortContrib}\`\n`;
    result += `   📅 Due: ${deadline}\n\n`;
  });

  if (commitments.length > 10) {
    result += `\n*...and ${commitments.length - 10} more*`;
  }

  return result;
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
        result = await serverClient.executeTool(
          "who_is",
          { username: user.username },
          context
        );
        break;
      }

      case "myinfo":
        result = await serverClient.executeTool("am_i_registered", {}, context);
        break;

      case "serverstatus":
        result = await serverClient.executeTool(
          "is_server_active",
          {},
          context
        );
        break;

      case "status": {
        const commitId = interaction.options.getString("commit_id");
        result = await serverClient.executeTool(
          "commitment_status",
          { commitId },
          context
        );
        break;
      }

      case "timeleft": {
        const commitId = interaction.options.getString("commit_id");
        result = await serverClient.executeTool(
          "time_left",
          { commitId },
          context
        );
        break;
      }

      // ==================== Wallet Commands ====================
      case "linkwallet": {
        const address = interaction.options.getString("address");
        result = await serverClient.executeTool(
          "link_wallet",
          { walletAddress: address },
          context
        );
        break;
      }

      case "mywallet":
        result = await serverClient.executeTool("get_my_wallet", {}, context);
        break;

      // ==================== Balance Commands ====================
      case "balance":
        result = await serverClient.executeTool(
          "get_server_balance",
          {},
          context
        );
        break;

      // ==================== Commitment Commands ====================
      case "commit": {
        // Check for commit-creator role
        const hasRole = interaction.member?.roles?.cache?.some(
          (role) => role.name.toLowerCase() === "commit-creator"
        );

        if (!hasRole) {
          await interaction.editReply(
            "❌ You need the **commit-creator** role to create commitments. Please ask a server admin to assign you this role."
          );
          return;
        }

        const contributor = interaction.options.getUser("contributor");
        const amount = interaction.options.getNumber("amount");
        const task = interaction.options.getString("task");
        const days = interaction.options.getNumber("days");
        const deadlineSeconds =
          interaction.options.getNumber("deadline_seconds");

        // Validate that at least one deadline option is provided
        if (!days && !deadlineSeconds) {
          await interaction.editReply(
            "❌ Please provide either `days` or `deadline_seconds` parameter."
          );
          return;
        }

        // Use deadline_seconds if provided, otherwise convert days to seconds
        const finalDeadlineDays = deadlineSeconds
          ? deadlineSeconds / 86400 // Convert seconds to days for the tool
          : days;

        result = await serverClient.executeTool(
          "create_commitment",
          {
            contributorUsername: contributor.username,
            amountMNEE: amount,
            taskDescription: task,
            deadlineDays: finalDeadlineDays,
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

        // After successful submission, trigger AI verification
        if (result.success) {
          try {
            // Get commitment details to fetch spec and evidence CIDs
            const commitment = await serverClient.executeTool(
              "get_commitment",
              { commitId },
              context
            );

            if (commitment.success && commitment.data) {
              const { specCid, evidenceCid } = commitment.data;

              console.log(
                `[Bot] Verifying work - specCid: ${specCid}, evidenceCid: ${evidenceCid}`
              );

              // Only run verification if both CIDs are present
              if (!specCid || !evidenceCid) {
                console.warn(`[Bot] Missing CIDs - skipping verification`);
                break;
              }

              // Run AI verification
              const verificationResult = await verifyWork(specCid, evidenceCid);
              const verificationMsg =
                formatVerificationMessage(verificationResult);

              // Post verification results to channel
              await interaction.followUp(verificationMsg);
            }
          } catch (error) {
            console.error("AI verification error:", error);
            // Don't fail the submission if AI verification fails
          }
        }
        break;
      }

      case "commitment": {
        const commitId = interaction.options.getString("commit_id");
        result = await serverClient.executeTool(
          "get_commitment",
          { commitId },
          context
        );
        break;
      }

      case "list": {
        const filter = interaction.options.getString("filter") || "all";
        result = await serverClient.executeTool(
          "list_commitments",
          { status: filter },
          context
        );
        break;
      }

      case "mycommits":
        result = await serverClient.executeTool("my_commitments", {}, context);
        break;

      case "myassignments":
        result = await serverClient.executeTool("my_assignments", {}, context);
        break;

      // ==================== Dispute Commands ====================
      case "dispute": {
        const commitId = interaction.options.getString("commit_id");
        const reason = interaction.options.getString("reason");

        try {
          // First, calculate the stake amount
          const stakeResult = await serverClient.executeTool(
            "calculate_stake",
            { commitId },
            context
          );

          if (!stakeResult.success) {
            result = stakeResult;
            break;
          }

          const stakeAmount = stakeResult.data;
          const stakeMNEE = (parseFloat(stakeAmount) / 1e18).toFixed(2);

          // Show confirmation message
          await interaction.editReply(
            `⚠️ **Dispute Confirmation Required**\n\n` +
              `Opening a dispute for commitment #${commitId} requires:\n` +
              `💰 **Stake:** ${stakeMNEE} MNEE (deducted from server balance)\n\n` +
              `**Reason:** ${reason}\n\n` +
              `This stake will be returned to the server balance after the dispute is resolved.\n\n` +
              `**Type \`yes\` to confirm or \`no\` to cancel** (30 seconds)`
          );

          // Wait for user confirmation
          const filter = (m) =>
            m.author.id === interaction.user.id &&
            ["yes", "no"].includes(m.content.toLowerCase());

          const collected = await interaction.channel
            .awaitMessages({
              filter,
              max: 1,
              time: 30000,
              errors: ["time"],
            })
            .catch(() => null);

          if (
            !collected ||
            collected.first()?.content.toLowerCase() !== "yes"
          ) {
            await interaction.followUp("❌ Dispute cancelled.");
            return;
          }

          // User confirmed, proceed with dispute
          result = await serverClient.executeTool(
            "open_dispute",
            { commitId, reason },
            context
          );

          if (result.success) {
            await interaction.followUp(
              `✅ Dispute opened successfully!\n` +
                `💰 Stake of ${stakeMNEE} MNEE deducted from server balance.`
            );
          }
        } catch (error) {
          result = {
            success: false,
            error: error.message || "Failed to open dispute",
          };
        }
        break;
      }

      // ==================== Admin Commands ====================
      case "settle": {
        // Check if user is admin
        if (!context.isAdmin) {
          await interaction.editReply(
            "❌ This command requires Administrator permissions."
          );
          return;
        }

        const commitId = interaction.options.getString("commit_id");

        if (commitId) {
          // Settle specific commitment
          result = await serverClient.executeTool(
            "settle_commitment",
            { commitId },
            context
          );
        } else {
          // Batch settle all pending
          result = await serverClient.executeTool(
            "batch_settle_all",
            {},
            context
          );
        }
        break;
      }

      case "checkpending": {
        // Check if user is admin
        if (!context.isAdmin) {
          await interaction.editReply(
            "❌ This command requires Administrator permissions."
          );
          return;
        }

        result = await serverClient.executeTool(
          "get_pending_settlements",
          {},
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

      const roles = member
        ? member.roles.cache.map((r) => ({ id: r.id, name: r.name }))
        : [];
      const isAdmin = member
        ? member.permissions.has("Administrator") ||
          member.roles.cache.some((r) => r.name.toLowerCase().includes("admin"))
        : false;

      const userMessage = message.content
        .replace(`<@${client.user.id}>`, "")
        .trim();

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
        const toolResult = await serverClient.executeTool(
          toolName,
          params,
          context
        );
        console.log(`[NL] Tool result:`, toolResult);

        const finalResponse = await geminiService.sendFunctionResponse(
          toolName,
          toolResult
        );

        if (!finalResponse || finalResponse.trim() === "") {
          const formatted = formatDataForDiscord(
            toolResult?.data,
            toolResult?.success
          );
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

        const formatted = formatDataForDiscord(
          toolResult?.data,
          toolResult?.success
        );
        await message.reply(formatted);
      } else {
        await message.reply(
          geminiResponse.content?.substring(0, 2000) ||
            "I'm not sure how to help with that."
        );
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
