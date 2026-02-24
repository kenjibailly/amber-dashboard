const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const AdminModule = require("../models/AdminModule"); // your new model

async function handleJoinLeave(message, targetUserId) {
  const { guild } = message;

  const member = await guild.members.fetch(targetUserId).catch(() => null);
  await message.delete().catch(() => {});

  if (!member) {
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("User not found in this server.")
      .setColor("Red");
    return message.reply({
      embeds: [embed],
    });
  }

  // Fetch config from your new AdminModule model
  const moduleDoc = await AdminModule.findOne({
    guildId: guild.id,
    moduleId: "joinleave",
  });

  if (!moduleDoc || !moduleDoc.settings?.channelId) {
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("Join/Leave is not configured for this server.")
      .setColor("Red");
    return message.reply({
      embeds: [createEmbed(embed)],
    });
  }

  const {
    channelId,
    extraChannels: extraChannelIds = [],
    user: authorizedUserId,
  } = moduleDoc.settings;

  // Check if the message author is the authorized user
  if (authorizedUserId && message.author.id !== authorizedUserId) {
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("You are not authorized to use this command.")
      .setColor("Red");
    return message.reply({
      embeds: [embed],
    });
  }

  const mainChannel = guild.channels.cache.get(channelId);
  if (!mainChannel) {
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("Configured main channel not found.")
      .setColor("Red");
    return message.reply({
      embeds: [embed],
    });
  }

  const extraChannels = extraChannelIds
    .map((id) => guild.channels.cache.get(id))
    .filter(Boolean);

  try {
    const hasMainView = member
      .permissionsIn(mainChannel)
      .has(PermissionsBitField.Flags.ViewChannel);
    const hasMainSend = member
      .permissionsIn(mainChannel)
      .has(PermissionsBitField.Flags.SendMessages);
    const shouldRevoke = hasMainView && hasMainSend;

    await mainChannel.permissionOverwrites.edit(member, {
      ViewChannel: !shouldRevoke,
      SendMessages: !shouldRevoke,
    });

    for (const channel of extraChannels) {
      await channel.permissionOverwrites.edit(member, {
        ViewChannel: !shouldRevoke,
        SendMessages: !shouldRevoke,
      });
    }

    const channelMentions = [
      `<#${mainChannel.id}>`,
      ...extraChannels.map((ch) => `<#${ch.id}>`),
    ].join(", ");

    const embed = new EmbedBuilder()
      .setTitle("Success")
      .setDescription(
        shouldRevoke
          ? `Noooo <@${member.id}> has left.\nAccess to ${channelMentions} has been **revoked** for <@${member.id}>.`
          : `Yaaay <@${member.id}> is back!\n<@${member.id}> now has access to ${channelMentions}.`,
        "",
      )
      .setColor("Green");

    await mainChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Error handling Join/Leave:", error);
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("Something went wrong while updating permissions")
      .setColor("Red");
    message.reply({
      embeds: [embed],
    });
  }
}

module.exports = handleJoinLeave;
