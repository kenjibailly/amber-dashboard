require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const express = require("express");
const botApiRoutes = require("./routes/botApi");
// Utilities
const Logger = require("./utilities/logger.js");
global.logger = new Logger("Bot");

// MongoDB connection
const mongodb_URI = require("./mongodb/URI");
mongoose
  .connect(mongodb_URI)
  .then(() => logger.success("DB connected!"))
  .catch((err) => logger.error(err));

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessagePolls,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ("data" in command && "name" in command.data) {
    client.commands.set(command.data.name, command);
  } else {
    logger.warn(
      `[WARNING] The command at ${file} is missing a required "data" or "name" property.`
    );
  }
}

// Load events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  logger.success(`Loaded event: ${event.name}`);
}

// Login Discord
client.login(process.env.DISCORD_TOKEN);

// Create Express app for internal API
const app = express();
app.use(express.json());

// Make Discord client available to routes
app.set("discordClient", client);

// Register bot API routes
app.use("/api/bot", botApiRoutes);

// Start Express server
const PORT = process.env.BOT_API_PORT || 3000;
app.listen(PORT, () => {
  logger.success(`Bot API listening on port ${PORT}`);
});
