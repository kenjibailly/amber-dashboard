const GuildModule = require("../models/GuildModule");
const userLastMessageTimestamps = require("./userLastMessageTimestamps");

async function kickInactiveVCUser(client) {
  setInterval(async () => {
    for (const [guildId, guild] of client.guilds.cache) {
      // Fetch level module config for this guild
      const moduleDoc = await GuildModule.findOne({
        guildId,
        moduleId: "level",
      }).catch(() => null);

      const voiceConfig = moduleDoc?.settings?.voice;

      if (moduleDoc?.settings?.enabled) continue;
      // Skip if kick muted is not enabled
      if (!voiceConfig?.kickMutedEnabled) continue;
      const kickAfterMinutes = voiceConfig.kickUserAfter
        ? parseInt(voiceConfig.kickUserAfter)
        : 10;
      const kickAfterMs = kickAfterMinutes * 60 * 1000;

      const voiceChannels = guild.channels.cache.filter(
        (ch) => ch.type === 2 && ch.members.size > 0,
      );

      // Skip ignored voice channels
      const ignoredChannels = voiceConfig.ignoredVoiceChannels || [];

      for (const channel of voiceChannels.values()) {
        if (ignoredChannels.includes(channel.id)) continue;

        for (const [userId, member] of channel.members) {
          if (member.user.bot) continue;

          const isMuted = member.voice.selfMute;
          const lastTextTime = userLastMessageTimestamps.get(userId) || 0;
          const cutoff = Date.now() - kickAfterMs;

          if (isMuted && lastTextTime < cutoff) {
            try {
              await member.voice.disconnect();
              logger.warn(
                `Disconnected ${member.user.tag} for inactivity in ${guild.name} (muted for ${kickAfterMinutes}min).`,
              );
            } catch (err) {
              logger.error(`Failed to disconnect ${member.user.tag}:`, err);
            }
          }
        }
      }
    }
  }, 60 * 1000); // check every minute so the custom time is accurate
}

module.exports = kickInactiveVCUser;
