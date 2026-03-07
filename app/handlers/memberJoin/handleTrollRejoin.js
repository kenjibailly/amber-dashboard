const TrolledUser = require("../../models/TrolledUser");

// Returns true if the user is currently being trolled (so caller can skip auto role/welcome)
module.exports = async function handleTrollRejoin(member, guildId) {
  const trolledUserData = await TrolledUser.findOne({
    guildId,
    userId: member.id,
  });
  if (!trolledUserData) return false;

  const guild = member.guild;

  // Get or create Trolled role
  let trolledRole = guild.roles.cache.find((r) => r.name === "Trolled");
  if (!trolledRole) {
    trolledRole = await guild.roles.create({
      name: "Trolled",
      color: 0x808080,
      reason: "Auto-created for troll shop reward",
    });
  }

  // Re-apply only @everyone + Trolled role
  try {
    await member.roles.set([guild.id, trolledRole.id]);
  } catch (err) {
    logger.error(`Failed to re-apply Trolled role to ${member.user.tag}:`, err);
  }

  // Re-add view permission to their troll channel
  try {
    const trollChannel = await guild.channels
      .fetch(trolledUserData.channelId)
      .catch(() => null);
    if (trollChannel) {
      await trollChannel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
      });
    }
  } catch (err) {
    logger.error(`Failed to re-add ${member.user.tag} to troll channel:`, err);
  }

  logger.info(
    `Re-applied troll restrictions to rejoining user ${member.user.tag}`,
  );
  return true;
};
