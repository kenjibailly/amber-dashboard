function logContext(user, guild) {
  const userName = user?.globalName || user?.username || "UnknownUser";
  const guildName = guild?.name || "DM";
  const guildId = guild?.id || "DM";

  return `[${guildName}:${guildId}] ${userName} (${user?.id})`;
}

module.exports = logContext;
