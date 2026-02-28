const { Events } = require("discord.js");
const activeVoiceChannelsData = require("../helpers/activeVoiceChannelsData");
const giveExp = require("../helpers/giveExp");
const LevelConfig = require("../models/GuildModule");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const channel = newState.channel || oldState.channel;
    if (!channel || channel.type !== 2) return;

    const guildId = newState.guild?.id || oldState.guild?.id;
    if (!guildId) return;

    const nonBotMembers = channel.members.filter((m) => !m.user.bot);

    if (nonBotMembers.size >= 2) {
      if (!activeVoiceChannelsData.has(channel.id)) {
        // Fetch interval from config, default to 1 minute
        const config = await LevelConfig.findOne({
          guildId,
          moduleId: "level",
        }).catch(() => null);
        const intervalMinutes = config?.settings?.voice?.voiceExpInterval
          ? parseInt(config.settings.voice.voiceExpInterval)
          : 1;
        const intervalMs = intervalMinutes * 60_000;

        const intervalId = setInterval(async () => {
          const updatedChannel = await newState.client.channels.fetch(
            channel.id,
          );
          const updatedMembers = updatedChannel.members.filter(
            (m) => !m.user.bot,
          );

          if (updatedMembers.size < 2) {
            clearInterval(activeVoiceChannelsData.get(channel.id));
            activeVoiceChannelsData.delete(channel.id);
            return;
          }

          for (const member of updatedMembers.values()) {
            await giveExp(member.user.id, channel.id, guildId, newState.client);
          }
        }, intervalMs);

        activeVoiceChannelsData.set(channel.id, intervalId);
      }
    } else {
      if (activeVoiceChannelsData.has(channel.id)) {
        clearInterval(activeVoiceChannelsData.get(channel.id));
        activeVoiceChannelsData.delete(channel.id);
      }
    }
  },
};
