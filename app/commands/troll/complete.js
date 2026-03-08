const { EmbedBuilder } = require("discord.js");
const TrolledUser = require("../../models/TrolledUser");
const GuildModule = require("../../models/GuildModule");
const { getTrollMissions } = require("../shop/trollSomeone");
const userExchangeData = require("../../helpers/userExchangeData");

async function handleComplete(interaction) {
  await interaction.deferReply({ flags: 64 });
  const guildId = interaction.guildId;
  const channelId = interaction.channelId;
  const guild = interaction.guild;
  const client = interaction.client;
  // Check if user is server owner or has the staff role
  const userId = interaction.member.user.id;
  const isOwner = guild.ownerId === userId;

  if (!isOwner) {
    const staffModule = await GuildModule.findOne({
      guildId,
      moduleId: "staffrole",
      enabled: true,
    });

    const staffRoleId = staffModule?.settings?.roleId;
    const hasStaffRole = staffRoleId
      ? interaction.member.roles.cache.has(staffRoleId)
      : false;

    if (!hasStaffRole) {
      const embed = new EmbedBuilder()
        .setTitle("Permission Denied")
        .setDescription("You do not have permission to use this command.")
        .setColor("Red");
      await interaction.editReply({ embeds: [embed] });
      return;
    }
  }

  // Find trolled user by the channel this command was used in
  const trolledUserData = await TrolledUser.findOne({ guildId, channelId });

  if (!trolledUserData) {
    const embed = new EmbedBuilder()
      .setTitle("Troll Complete")
      .setDescription(
        "No trolled user found for this channel. Use this command inside a troll channel.",
      )
      .setColor("Red");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const messageLink = interaction.options.getString("message-link");

  // Fetch the trolled member
  let trolledMember;
  try {
    trolledMember = await guild.members.fetch(trolledUserData.userId);
  } catch (err) {
    const embed = new EmbedBuilder()
      .setTitle("Troll Complete")
      .setDescription(
        "Could not find the trolled user — they may have left the server. Cleaning up anyway.",
      )
      .setColor("Orange");
    await interaction.editReply({ embeds: [embed] });
    await cleanup(guild, trolledUserData, null, channelId, client);
    return;
  }

  // Get the mission details if one was chosen
  let missionTitle = null;
  let missionDescription = null;
  if (trolledUserData.missionId) {
    const missions = await getTrollMissions(guildId);
    const mission = missions.find((m) => m.id === trolledUserData.missionId);
    if (mission) {
      missionTitle = mission.title;
      missionDescription = mission.description || null;
    }
  }

  // Post to reward channel if message link provided
  if (messageLink) {
    await postCompletionToRewardChannel({
      client,
      guildId,
      guild,
      trolledMember,
      missionTitle,
      missionDescription,
      messageLink,
      interaction,
    });
  }

  // Restore previous roles
  try {
    const rolesToRestore = trolledUserData.previousRoles.filter((roleId) => {
      const role = guild.roles.cache.get(roleId);
      return role && !role.managed;
    });

    await trolledMember.roles.set(rolesToRestore);
  } catch (err) {
    logger.error("Failed to restore roles:", err);
  }

  // Clean up channel and DB
  await cleanup(guild, trolledUserData, trolledMember, channelId, client);

  const embed = new EmbedBuilder()
    .setTitle("Troll Complete")
    .setDescription(
      `**${trolledMember.user.globalName || trolledMember.user.username}** has completed their mission. ` +
        `Their roles have been restored and the troll channel has been removed.`,
    )
    .setColor("Green");

  // Reply before deleting the channel
  await interaction.editReply({ embeds: [embed] });

  // Delete the troll channel
  try {
    const trollChannel = await guild.channels.fetch(channelId);
    if (trollChannel) await trollChannel.delete("Troll mission completed");
  } catch (err) {
    logger.error("Failed to delete troll channel:", err);
  }
}

async function postCompletionToRewardChannel({
  client,
  guildId,
  guild,
  trolledMember,
  missionTitle,
  missionDescription,
  messageLink,
  interaction,
}) {
  try {
    // Get reward channel from economy module
    const economyModule = await GuildModule.findOne({
      guildId,
      moduleId: "economy",
    });
    const rewardChannelId = economyModule?.settings?.rewardChannelId;

    if (!rewardChannelId) {
      logger.warn(
        "No rewardChannelId configured in economy module, skipping reward post.",
      );
      return;
    }

    const rewardChannel = await guild.channels
      .fetch(rewardChannelId)
      .catch(() => null);
    if (!rewardChannel) {
      logger.warn("Reward channel not found:", rewardChannelId);
      return;
    }

    // Parse the message link to fetch the original message
    // Format: https://discord.com/channels/guildId/channelId/messageId
    const linkMatch = messageLink.match(/\/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (!linkMatch) {
      logger.warn("Invalid message link format:", messageLink);
      return;
    }

    const [, , linkedChannelId, linkedMessageId] = linkMatch;

    const linkedChannel = await guild.channels
      .fetch(linkedChannelId)
      .catch(() => null);
    if (!linkedChannel) {
      logger.warn("Linked channel not found:", linkedChannelId);
      return;
    }

    const linkedMessage = await linkedChannel.messages
      .fetch(linkedMessageId)
      .catch(() => null);
    if (!linkedMessage) {
      logger.warn("Linked message not found:", linkedMessageId);
      return;
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle("Troll Mission Completed! 🎉")
      .setColor("Green");

    let description = `<@${trolledMember.id}> has completed their troll mission!`;
    if (missionTitle) {
      description += `\n\n**Mission:** ${missionTitle}`;
    }
    if (missionDescription) {
      description += `\n${missionDescription}`;
    }
    embed.setDescription(description);

    // Collect attachments from the linked message
    const attachments = [...linkedMessage.attachments.values()];
    const files = attachments.map((a) => a.url);

    // If there's an image attachment, set it as the embed image
    const imageAttachment = attachments.find(
      (a) =>
        a.contentType?.startsWith("image/") ||
        a.contentType?.startsWith("video/"),
    );

    // Files to send separately = attachments that aren't already shown in the embed
    let filesToSend = [];

    if (imageAttachment) {
      embed.setImage(imageAttachment.url);
      // Only send non-image attachments as separate files
      filesToSend = attachments
        .filter((a) => a.url !== imageAttachment.url)
        .map((a) => a.url);
    } else {
      filesToSend = files;
    }

    // Also include any text content from the linked message
    if (linkedMessage.content) {
      embed.addFields({
        name: "Message",
        value: linkedMessage.content.slice(0, 1024),
      });
    }

    await rewardChannel.send({
      embeds: [embed],
      files: filesToSend.length > 0 ? filesToSend : undefined,
    });
  } catch (err) {
    logger.error("Failed to post to reward channel:", err);
  }
}

async function cleanup(
  guild,
  trolledUserData,
  trolledMember,
  channelId,
  client,
) {
  // Remove Trolled role from user
  if (trolledMember) {
    try {
      const trolledRole = guild.roles.cache.find((r) => r.name === "Trolled");
      if (trolledRole) {
        await trolledMember.roles.remove(trolledRole);
      }
    } catch (err) {
      logger.error("Failed to remove Trolled role:", err);
    }
  }

  // Delete from DB
  try {
    await TrolledUser.deleteOne({
      guildId: trolledUserData.guildId,
      userId: trolledUserData.userId,
    });
  } catch (err) {
    logger.error("Failed to delete TrolledUser from DB:", err);
  }

  // Clean up userExchangeData for the trolled user
  try {
    const userExchangeData = require("../helpers/userExchangeData");
    const key = `${trolledUserData.userId}_${channelId}`;
    userExchangeData.delete(key);
  } catch (err) {
    // Non-fatal
  }
}

module.exports = handleComplete;
