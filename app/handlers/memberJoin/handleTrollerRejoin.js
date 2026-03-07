// Re-adds a rejoining user to any troll channels they were the troller in,
// by checking for existing permission overwrites on troll-* channels.
module.exports = async function handleTrollerRejoin(member, guildId) {
  const guild = member.guild;

  const trollChannels = guild.channels.cache.filter((c) =>
    c.name?.startsWith("troll-"),
  );

  for (const [, channel] of trollChannels) {
    try {
      const overwrite = channel.permissionOverwrites.cache.get(member.id);
      if (overwrite) {
        await channel.permissionOverwrites.edit(member.id, {
          ViewChannel: true,
          ReadMessageHistory: true,
        });
        logger.info(
          `Re-added troller ${member.user.tag} to troll channel ${channel.name}`,
        );
      }
    } catch (err) {
      logger.error(
        `Failed to re-add troller ${member.user.tag} to ${channel.name}:`,
        err,
      );
    }
  }
};
