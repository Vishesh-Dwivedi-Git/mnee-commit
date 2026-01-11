import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Discord Slash Commands for Commit Protocol
 * These mirror the MCP tools for traditional command usage
 */
const commands = [
  // ==================== Quick Query Commands ====================
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands"),

  new SlashCommandBuilder()
    .setName("whois")
    .setDescription("Look up a user's linked wallet")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Discord user to look up")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("myinfo")
    .setDescription("Check if you have linked your wallet"),

  new SlashCommandBuilder()
    .setName("serverstatus")
    .setDescription("Check if this server is registered with Commit Protocol"),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Get quick status of a commitment")
    .addStringOption((option) =>
      option
        .setName("commit_id")
        .setDescription("The commitment ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeleft")
    .setDescription("Check time remaining until commitment deadline")
    .addStringOption((option) =>
      option
        .setName("commit_id")
        .setDescription("The commitment ID")
        .setRequired(true)
    ),

  // ==================== Wallet Commands ====================
  new SlashCommandBuilder()
    .setName("linkwallet")
    .setDescription("Link your Ethereum wallet to Discord")
    .addStringOption((option) =>
      option
        .setName("address")
        .setDescription("Your Ethereum wallet address (0x...)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("mywallet")
    .setDescription("Show your linked wallet address"),

  // ==================== Balance Commands ====================
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check server's MNEE balance"),

  // ==================== Commitment Commands ====================
  new SlashCommandBuilder()
    .setName("commit")
    .setDescription("Create a new work commitment")
    .addUserOption((option) =>
      option
        .setName("contributor")
        .setDescription("Discord user who will do the work")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("Payment amount in MNEE")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("task")
        .setDescription("Description of the work")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days until deadline")
        .setRequired(false)
    )
    .addNumberOption((option) =>
      option
        .setName("deadline_seconds")
        .setDescription("Deadline in seconds from now (for quick demo)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("submit")
    .setDescription("Submit completed work for a commitment")
    .addStringOption((option) =>
      option
        .setName("commit_id")
        .setDescription("The commitment ID")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Brief description of completed work")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("URL to deliverable (GitHub, Google Doc, etc.)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("commitment")
    .setDescription("Get details of a specific commitment")
    .addStringOption((option) =>
      option
        .setName("commit_id")
        .setDescription("The commitment ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("list")
    .setDescription("List commitments for this server")
    .addStringOption((option) =>
      option
        .setName("filter")
        .setDescription("Filter by status")
        .addChoices(
          { name: "All", value: "all" },
          { name: "Active", value: "active" },
          { name: "Completed", value: "completed" },
          { name: "Disputed", value: "disputed" }
        )
    ),

  new SlashCommandBuilder()
    .setName("mycommits")
    .setDescription("List your commitments as a contributor"),

  new SlashCommandBuilder()
    .setName("myassignments")
    .setDescription(
      "List commitments assigned to you (where you are the contributor)"
    ),

  // ==================== Dispute Commands ====================
  new SlashCommandBuilder()
    .setName("dispute")
    .setDescription("Open a dispute for a commitment")
    .addStringOption((option) =>
      option
        .setName("commit_id")
        .setDescription("The commitment ID to dispute")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the dispute")
        .setRequired(true)
    ),

  // ==================== Admin Commands ====================
  new SlashCommandBuilder()
    .setName("settle")
    .setDescription("⚡ [ADMIN] Manually settle pending commitments")
    .addStringOption((option) =>
      option
        .setName("commit_id")
        .setDescription(
          "Optional: Specific commitment ID to settle (leave empty for all pending)"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("checkpending")
    .setDescription(
      "⚡ [ADMIN] Check which commitments are ready for settlement"
    ),

  // ==================== Utility Commands ====================
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is alive"),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

try {
  console.log("Registering slash commands...");

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );

  console.log(`✅ Successfully registered ${commands.length} slash commands!`);
  console.log("Commands:", commands.map((c) => `/${c.name}`).join(", "));
} catch (error) {
  console.error("Error registering commands:", error);
}
