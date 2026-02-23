const { Events, EmbedBuilder } = require("discord.js");
const GuildModule = require("../models/GuildModule");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const guildId = member.guild.id;

    try {
      // Check for Goodbye Message module
      const goodbyeModule = await GuildModule.findOne({
        guildId: guildId,
        moduleId: "goodbye",
        enabled: true,
      });

      if (
        goodbyeModule &&
        goodbyeModule.settings.goodbyeMessage &&
        goodbyeModule.settings.channelId
      ) {
        const channel = member.guild.channels.cache.get(
          goodbyeModule.settings.channelId
        );

        if (channel) {
          let message = goodbyeModule.settings.goodbyeMessage;

          // Replace placeholders
          message = message.replace(/{user}/g, `<@${member.id}>`);
          message = message.replace(/{username}/g, member.user.username);
          message = message.replace(/{server}/g, `**${member.guild.name}**`);

          const embed = new EmbedBuilder()
            .setTitle("Goodbye!")
            .setDescription(message)
            .setColor("Red");

          try {
            await channel.send({ embeds: [embed] });
            logger.success(
              `Sent goodbye message for ${member.user.tag} in ${member.guild.name}`
            );
          } catch (error) {
            logger.error(
              `Failed to send goodbye message in ${member.guild.name}:`,
              error
            );
          }
        } else {
          logger.warn(
            `Goodbye channel ${goodbyeModule.settings.channelId} not found in guild ${member.guild.name}`
          );
        }
      }
    } catch (error) {
      logger.error(
        `Error handling member leave in ${member.guild.name}:`,
        error
      );
    }
  },
};
