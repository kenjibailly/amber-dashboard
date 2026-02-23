require("dotenv/config");
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const CustomCommand = require("./models/CustomCommand");

async function deployCommands(guildId) {
  const commands = [];

  // Load all command files from the "commands" folder
  const commandsPath = path.join(__dirname + "/commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js") && file !== "deploy-commands.js");

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));

    // Each command exports { data, execute }
    commands.push(command.data.toJSON());
  }

  logger.info(`Loaded ${commands.length} static commands`);

  // Fetch custom commands from database for this guild
  try {
    const customCommands = await CustomCommand.find({ guildId });

    if (customCommands.length > 0) {
      logger.info(
        `Found ${customCommands.length} custom commands for guild ${guildId}`
      );

      for (const customCmd of customCommands) {
        const commandData = {
          name: customCmd.command,
          description: customCmd.description || "Custom command",
          type: 1, // CHAT_INPUT type
        };

        // Add user option if tagUser is enabled
        if (customCmd.tagUser) {
          commandData.options = [
            {
              name: "user",
              description: "The user to mention",
              type: 6, // USER type
              required: true,
            },
          ];
        }

        commands.push(commandData);
      }
    }
  } catch (error) {
    logger.error("Error fetching custom commands:", error);
    // Continue with static commands even if custom commands fail
  }

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    logger.info(
      `Started refreshing ${commands.length} application (/) commands (${
        commandFiles.length
      } static + ${commands.length - commandFiles.length} custom).`
    );

    await rest.put(
      Routes.applicationGuildCommands(process.env.APP_ID, guildId),
      { body: commands }
    );

    logger.success(
      `Successfully reloaded ${commands.length} application (/) commands for guild ${guildId}.`
    );
  } catch (error) {
    logger.error("Error deploying commands:", error);
    throw error;
  }
}

module.exports = deployCommands;
