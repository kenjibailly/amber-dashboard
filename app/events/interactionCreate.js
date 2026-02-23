const { Events, EmbedBuilder } = require("discord.js");
const CustomCommand = require("../models/CustomCommand");
const GuildModule = require("../models/GuildModule");
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle autocomplete FIRST
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      console.log("Button clicked:", interaction.customId);

      const ticketCommand = interaction.client.commands.get("tickets");
      if (
        ticketCommand &&
        ticketCommand.handleButton &&
        interaction.customId.startsWith("tickets_")
      ) {
        try {
          return await ticketCommand.handleButton(interaction);
        } catch (error) {
          console.error("Button interaction error:", error);
          if (!interaction.replied && !interaction.deferred) {
            return await interaction.reply({
              content: "There was an error processing your selection!",
              ephemeral: true,
            });
          }
        }
      }
      // Find the party command to handle button interactions
      const partyCommand = interaction.client.commands.get("party");
      if (partyCommand && partyCommand.handleButton) {
        try {
          await partyCommand.handleButton(interaction);
        } catch (error) {
          console.error("Button interaction error:", error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "There was an error processing your selection!",
              ephemeral: true,
            });
          }
        }
      }
      return;
    }

    // Then handle commands
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    if (!commandName) return;
    try {
      // First, try to find a static command
      const staticCommand = interaction.client.commands.get(commandName);
      if (staticCommand) {
        try {
          await staticCommand.execute(interaction);
          return;
        } catch (error) {
          logger.error("Error executing static command:", error);
          return;
        }
      }

      // If not found, check for custom command
      try {
        const guildId = interaction.guild.id;
        const customCommand = await CustomCommand.findOne({
          guildId,
          command: commandName,
        });

        const guildModule = await GuildModule.findOne({
          guildId,
          moduleId: "customcommands",
        });

        if (guildModule && guildModule?.enabled == false) {
          const embed = new EmbedBuilder()
            .setTitle("❌ Module Disabled")
            .setDescription(
              "This module has been disabled, custom commands cannot be used."
            )
            .setColor("Red");
          return await interaction.reply({ embeds: [embed] });
        }

        // In your interaction handler for custom commands
        if (customCommand) {
          // Check if user has required roles (if any)
          if (
            customCommand.allowedRoles &&
            customCommand.allowedRoles.length > 0
          ) {
            const member = interaction.member;
            const hasRole = customCommand.allowedRoles.some((roleId) =>
              member.roles.cache.has(roleId)
            );

            if (!hasRole) {
              return interaction.reply({
                content: "You do not have permission to use this command.",
                ephemeral: true,
              });
            }
          }

          // Get the tagged user if tagUser is enabled
          let taggedUser = null;
          if (customCommand.tagUser) {
            taggedUser = interaction.options.getUser("user");
            if (!taggedUser) {
              return interaction.reply({
                content: "Please mention a user.",
                ephemeral: true,
              });
            }
          }

          // Pick a random reply if multiple exist
          let reply =
            customCommand.replies[
              Math.floor(Math.random() * customCommand.replies.length)
            ];

          // Replace placeholders
          if (taggedUser) {
            reply = reply.replace(/{user}/g, `<@${taggedUser.id}>`);
            reply = reply.replace(/{username}/g, taggedUser.username);
          }

          // Replace other placeholders
          reply = reply.replace(/{server}/g, interaction.guild.name);

          // Send the reply
          if (customCommand.embedColor) {
            const embed = {
              description: reply,
              color: parseInt(customCommand.embedColor.replace("#", ""), 16),
            };
            if (taggedUser) {
              await interaction.reply({
                content: `<@${taggedUser.id}>`,
                embeds: [embed],
              });
            } else {
              await interaction.reply({ embeds: [embed] });
            }
          } else {
            await interaction.reply(reply);
          }
        }
      } catch (error) {
        logger.error("Error executing custom command:", error);
        await interaction.reply({
          content: "There was an error executing this command.",
          ephemeral: true,
        });
      }
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
