const Levels = require("../models/Levels");
const LevelConfig = require("../models/GuildModule");
const Wallet = require("../models/Wallet");
const { execute: handleLevelCommand } = require("../commands/level");

function getExpMultiplier(
  settings,
  userId,
  memberRoleIds,
  channelId,
  isVoice = false,
) {
  let multiplier = 1;

  const global = settings.expMultiplier;
  if (global?.multiplier && parseFloat(global.multiplier) > 0) {
    const channelList = isVoice
      ? (global.voiceChannelIds ?? [])
      : (global.channelIds ?? []);
    const appliesToChannel =
      !channelList.length || channelList.includes(channelId);

    if (appliesToChannel) {
      if (global.limitedTime?.enabled && global.limitedTime?.days) {
        multiplier *= parseFloat(global.multiplier);
      } else if (!global.limitedTime?.enabled) {
        multiplier *= parseFloat(global.multiplier);
      }
    }
  }

  const entries = settings.expMultiplierEntries || [];
  for (const entry of entries) {
    if (!entry.enabled) continue;
    if (!entry.multiplier || parseFloat(entry.multiplier) <= 0) continue;

    const channelList = isVoice
      ? (entry.voiceChannelIds ?? [])
      : (entry.channelIds ?? []);
    const appliesToChannel =
      !channelList.length || channelList.includes(channelId);
    if (!appliesToChannel) continue;

    if (entry.type === "user" && entry.targetId === userId) {
      multiplier *= parseFloat(entry.multiplier);
    } else if (
      entry.type === "role" &&
      memberRoleIds.includes(entry.targetId)
    ) {
      multiplier *= parseFloat(entry.multiplier);
    }
  }

  return multiplier;
}

async function giveExp(userId, channelId, guildId, client) {
  const config = await LevelConfig.findOne({ guildId, moduleId: "level" });
  if (!config) return;

  const settings = config.settings || {};

  if (settings.voice?.ignoredVoiceChannels?.includes(channelId)) return;

  try {
    const guild = client.guilds.cache.get(guildId);
    const member = await guild?.members.fetch(userId).catch(() => null);
    const memberRoleIds = member?.roles?.cache?.map((r) => r.id) || [];

    const multiplier = getExpMultiplier(
      settings,
      userId,
      memberRoleIds,
      channelId,
      true,
    );
    const increment = multiplier > 0 ? multiplier : 1;

    // Get level before increment to detect level up
    const before = await Levels.findOne({ guildId, userId });
    const msgCount = parseInt(settings.messageCount || 1);
    const levelBefore = before ? Math.floor(before.messageCount / msgCount) : 0;

    const update = await Levels.findOneAndUpdate(
      { guildId, userId },
      { $inc: { messageCount: increment } },
      { new: true, upsert: true },
    );

    const levelAfter = Math.floor(update.messageCount / msgCount);

    // Post level up image if leveled up
    if (levelAfter > levelBefore) {
      await handleLevelCommand(null, client, userId, null, guildId);
    }

    // Reward logic
    const rewardInterval = settings.reward ? parseInt(settings.reward) : 0;
    const extraInterval = settings.rewardExtra
      ? parseInt(settings.rewardExtra)
      : 0;

    let rewardCount = 0;
    let extraCount = 0;

    // Loop through all levels crossed
    for (let lvl = levelBefore + 1; lvl <= levelAfter; lvl++) {
      if (rewardInterval > 0 && lvl % rewardInterval === 0) {
        rewardCount++;
      }

      if (extraInterval > 0 && lvl % extraInterval === 0) {
        extraCount++;
      }
    }

    if (rewardCount > 0 || extraCount > 0) {
      const walletUpdate = {};

      if (rewardCount > 0) {
        walletUpdate.amount = rewardCount;
      }

      if (extraCount > 0) {
        walletUpdate.extra_amount = extraCount;
      }

      await Wallet.updateOne(
        { guildId, userId },
        { $inc: walletUpdate },
        { upsert: true },
      );
    }
  } catch (error) {
    console.error("Failed to process voice EXP:", error);
  }
}

module.exports = giveExp;
