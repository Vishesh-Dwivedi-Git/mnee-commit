import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

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
  // ignore messages from bots
  if (message.author.bot) return;

  // check if bot was mentioned
  if (message.mentions.has(client.user)) {
    message.channel.send(`Hey ${message.author.username}, I heard you!`);
  }
});

client.login(process.env.BOT_TOKEN);
