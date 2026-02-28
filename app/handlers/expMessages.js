const Levels = require("../models/Levels");
const LevelConfig = require("../models/GuildModule");
const Wallet = require("../models/Wallet");
const {
  execute: handleLevelCommand,
  calculateExp,
} = require("../commands/level");

const lastMessageByUserInChannel = new Map();

function isEmojiOnly(content) {
  const customEmojiRegex = /<(a)?:\w+:\d+>/g;
  const stripped = content
    .replace(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu, "")
    .replace(customEmojiRegex, "")
    .trim();
  return stripped.length === 0;
}

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
    const channelList = isVoice ? global.voiceChannelIds : global.channelIds;
    const appliesToChannel =
      !channelList?.length || channelList.includes(channelId);

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

    const channelList = isVoice ? entry.voiceChannelIds : entry.channelIds;
    const appliesToChannel =
      !channelList?.length || channelList.includes(channelId);
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

async function handleExpMessages(message) {
  const { author, content, channelId, guildId, member } = message;
  if (author.bot || !content || isEmojiOnly(content.trim())) return;

  const config = await LevelConfig.findOne({
    guildId,
    moduleId: "level",
  });
  if (!config) return;

  const settings = config.settings || {};

  if (settings.ignoredChannels?.includes(channelId)) return;

  const lastUserId = lastMessageByUserInChannel.get(channelId);
  if (lastUserId === author.id) return;

  lastMessageByUserInChannel.set(channelId, author.id);

  try {
    // Get multiplier based on user, roles, and channel
    const memberRoleIds = member?.roles?.cache?.map((r) => r.id) || [];
    const multiplier = getExpMultiplier(
      settings,
      author.id,
      memberRoleIds,
      channelId,
      false,
    );

    // Get level before increment to detect level up
    const before = await Levels.findOne({ guildId, userId: author.id });
    const msgCount = parseInt(settings.messageCount || 1);
    const levelBefore = before ? Math.floor(before.messageCount / msgCount) : 0;

    // Increment message count with multiplier applied
    const increment = multiplier > 0 ? multiplier : 1;
    const update = await Levels.findOneAndUpdate(
      { guildId, userId: author.id },
      { $inc: { messageCount: increment } },
      { new: true, upsert: true },
    );

    const levelAfter = Math.floor(update.messageCount / msgCount);

    // Post level up image if leveled up
    if (levelAfter > levelBefore) {
      await handleLevelCommand(null, message.client, author.id, null, guildId);
    }

    const { level } = calculateExp(update.messageCount, settings);

    // // Handle level up
    // if (exp_percentage === 0) {
    //   handleLevelCommand("", message.client, author.id, message);
    // }

    // Reward logic
    const rewardInterval = settings.reward ? parseInt(settings.reward) : 0;
    const extraInterval = settings.rewardExtra
      ? parseInt(settings.rewardExtra)
      : 0;

    let rewardCount = 0;
    let extraCount = 0;

    // Check every level crossed
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
        { guildId, userId: author.id },
        { $inc: walletUpdate },
        { upsert: true },
      );
    }
  } catch (error) {
    console.error("Failed to process EXP message:", error);
  }
}

module.exports = handleExpMessages;
