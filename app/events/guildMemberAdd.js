const { Events, EmbedBuilder } = require("discord.js");
const GuildModule = require("../models/GuildModule");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const guildId = member.guild.id;

    try {
      // Check for Auto Role module
      const autoRoleModule = await GuildModule.findOne({
        guildId: guildId,
        moduleId: "autorole",
        enabled: true,
      });

      if (autoRoleModule && autoRoleModule.settings.roleId) {
        const roleId = autoRoleModule.settings.roleId;
        const role = member.guild.roles.cache.get(roleId);

        if (role) {
          try {
            await member.roles.add(role);
            logger.success(
              `Added role "${role.name}" to ${member.user.tag} in ${member.guild.name}`
            );
          } catch (error) {
            logger.error(
              `Failed to add role to ${member.user.tag} in ${member.guild.name}:`,
              error
            );
          }
        } else {
          logger.warn(
            `Auto role ${roleId} not found in guild ${member.guild.name}`
          );
        }
      }

      // Check for Welcome Message module
      const welcomeModule = await GuildModule.findOne({
        guildId: guildId,
        moduleId: "welcome",
        enabled: true,
      });

      if (
        welcomeModule &&
        welcomeModule.settings.welcomeMessage &&
        welcomeModule.settings.channelId
      ) {
        const channel = member.guild.channels.cache.get(
          welcomeModule.settings.channelId
        );

        if (channel) {
          let message = welcomeModule.settings.welcomeMessage;

          // Replace placeholders
          message = message.replace(/{user}/g, `<@${member.id}>`);
          message = message.replace(/{username}/g, member.user.username);
          message = message.replace(/{server}/g, `**${member.guild.name}**`);

          const embed = new EmbedBuilder()
            .setTitle("Welcome!")
            .setDescription(message)
            .setColor("Green");

          try {
            await channel.send({ embeds: [embed] });
            logger.success(
              `Sent welcome message for ${member.user.tag} in ${member.guild.name}`
            );
          } catch (error) {
            logger.error(
              `Failed to send welcome message in ${member.guild.name}:`,
              error
            );
          }
        } else {
          logger.warn(
            `Welcome channel ${welcomeModule.settings.channelId} not found in guild ${member.guild.name}`
          );
        }
      }
    } catch (error) {
      logger.error(
        `Error handling member join in ${member.guild.name}:`,
        error
      );
    }
  },
};
