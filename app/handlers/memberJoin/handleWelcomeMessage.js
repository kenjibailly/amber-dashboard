const { EmbedBuilder } = require("discord.js");
const GuildModule = require("../../models/GuildModule");

module.exports = async function handleWelcomeMessage(member, guildId) {
  const welcomeModule = await GuildModule.findOne({
    guildId,
    moduleId: "welcome",
    enabled: true,
  });

  if (
    !welcomeModule?.settings?.welcomeMessage ||
    !welcomeModule?.settings?.channelId
  )
    return;

  const channel = member.guild.channels.cache.get(
    welcomeModule.settings.channelId,
  );
  if (!channel) {
    logger.warn(
      `Welcome channel ${welcomeModule.settings.channelId} not found in guild ${member.guild.name}`,
    );
    return;
  }

  let message = welcomeModule.settings.welcomeMessage;
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
      `Sent welcome message for ${member.user.tag} in ${member.guild.name}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send welcome message in ${member.guild.name}:`,
      error,
    );
  }
};
