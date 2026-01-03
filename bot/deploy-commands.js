import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const commands = [
  {
    name: "ping",
    description: "Replies with Pong!",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands }
);

console.log("Slash commands registered.");
