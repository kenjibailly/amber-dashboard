const { EmbedBuilder } = require("discord.js");
const GuildModule = require("../models/GuildModule");
const AwardedReward = require("../models/AwardedReward");
const TrolledUser = require("../models/TrolledUser");

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour

const REWARD_LABELS = {
  changeOwnNickname: "Change Nickname",
  changeOtherNickname: "Change Someone's Nickname",
  addEmoji: "Add Emoji",
  addRole: "Add Role",
  addChannel: "Add Channel",
  trollSomeone: "Troll Someone",
};

// Maps awarded reward names to the key used in economy module settings
const REWARD_CONFIG_KEY = {
  changeOwnNickname: "changeNickname",
  changeOtherNickname: "changeOtherNickname",
  addEmoji: "addEmoji",
  addRole: "addRole",
  addChannel: "addChannel",
  trollSomeone: "trollSomeone",
};

async function postRewardExpired(
  guild,
  guildId,
  awardedUserId,
  reward,
  description,
) {
  try {
    const economyModule = await GuildModule.findOne({
      guildId,
      moduleId: "economy",
    });
    const rewardChannelId = economyModule?.settings?.rewardChannelId;
    if (!rewardChannelId) return;

    const rewardChannel = await guild.channels
      .fetch(rewardChannelId)
      .catch(() => null);
    if (!rewardChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("Reward Expired")
      .setDescription(
        `<@${awardedUserId}>'s **${REWARD_LABELS[reward] || reward}** reward has expired.\n${description}`,
      )
      .setColor("Orange")
      .setTimestamp();

    await rewardChannel.send({ embeds: [embed] });
  } catch (err) {
    logger.error("Failed to post reward expiry message:", err);
  }
}

async function processExpiredRewards(client) {
  try {
    const economyModules = await GuildModule.find({
      moduleId: "economy",
      enabled: true,
    });

    for (const economyModule of economyModules) {
      const guildId = economyModule.guildId;
      const rewards = economyModule.settings?.rewards || {};
      const allRewardsTime = economyModule.settings?.allRewards?.time;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const awardedRewards = await AwardedReward.find({ guildId });

      for (const awarded of awardedRewards) {
        // Map the awarded reward name to the config key in the economy module
        const configKey = REWARD_CONFIG_KEY[awarded.reward] || awarded.reward;
        const rewardConfig = rewards[configKey];
        if (!rewardConfig?.enabled) continue;

        // allRewards.time overrides individual reward time
        const timeDays = allRewardsTime
          ? parseFloat(allRewardsTime)
          : parseFloat(rewardConfig.time);

        // 0 or unset = permanent, skip
        if (!timeDays || timeDays <= 0) continue;

        const expiresAt = new Date(
          awarded.date.getTime() + timeDays * 24 * 60 * 60 * 1000,
        );
        if (new Date() < expiresAt) continue;

        // Expired — handle removal
        try {
          await handleExpiredReward(client, guild, awarded, guildId);
          await AwardedReward.deleteOne({ _id: awarded._id });
          logger.info(
            `Expired reward "${awarded.reward}" removed for user ${awarded.awardedUserId} in guild ${guildId}`,
          );
        } catch (err) {
          logger.error(
            `Failed to process expired reward "${awarded.reward}" for ${awarded.awardedUserId}:`,
            err,
          );
        }
      }
    }
  } catch (err) {
    logger.error("Error in reward expiry scheduler:", err);
  }
}

async function handleExpiredReward(client, guild, awarded, guildId) {
  const { reward, awardedUserId, value } = awarded;

  switch (reward) {
    case "changeOwnNickname":
    case "changeOtherNickname": {
      const member = await guild.members.fetch(awardedUserId).catch(() => null);
      if (!member) return;
      try {
        await member.setNickname(null);
        logger.info(
          `Removed nickname from ${member.user.tag} in ${guild.name}`,
        );
      } catch (err) {
        if (err.code !== 50013) logger.error(`Failed to remove nickname:`, err);
      }
      await postRewardExpired(
        guild,
        guildId,
        awardedUserId,
        reward,
        `Their nickname \`${value}\` has been removed.`,
      );
      break;
    }

    case "addEmoji": {
      const emoji = guild.emojis.cache.find((e) => e.name === value);
      if (!emoji) {
        logger.warn(
          `Expired emoji "${value}" not found in guild ${guild.name}`,
        );
        return;
      }
      try {
        await emoji.delete("Reward expired");
        logger.info(`Deleted expired emoji "${value}" in ${guild.name}`);
      } catch (err) {
        logger.error(`Failed to delete emoji "${value}":`, err);
      }
      await postRewardExpired(
        guild,
        guildId,
        awardedUserId,
        reward,
        `The emoji \`${value}\` has been removed from the server.`,
      );
      break;
    }

    case "addRole": {
      const role = guild.roles.cache.find((r) => r.name === value);
      if (!role) {
        logger.warn(`Expired role "${value}" not found in guild ${guild.name}`);
        return;
      }
      try {
        await role.delete("Reward expired");
        logger.info(`Deleted expired role "${value}" in ${guild.name}`);
      } catch (err) {
        logger.error(`Failed to delete role "${value}":`, err);
      }
      await postRewardExpired(
        guild,
        guildId,
        awardedUserId,
        reward,
        `The role \`${value}\` has been removed from the server.`,
      );
      break;
    }

    case "addChannel": {
      const channel = guild.channels.cache.find((c) => c.name === value);
      if (!channel) {
        logger.warn(
          `Expired channel "${value}" not found in guild ${guild.name}`,
        );
        return;
      }
      try {
        await channel.delete("Reward expired");
        logger.info(`Deleted expired channel "${value}" in ${guild.name}`);
      } catch (err) {
        logger.error(`Failed to delete channel "${value}":`, err);
      }
      await postRewardExpired(
        guild,
        guildId,
        awardedUserId,
        reward,
        `The channel \`${value}\` has been removed from the server.`,
      );
      break;
    }

    case "trollSomeone": {
      const trolledUserId = value;
      const trolledUserData = await TrolledUser.findOne({
        guildId,
        userId: trolledUserId,
      });
      if (!trolledUserData) return;

      const trolledMember = await guild.members
        .fetch(trolledUserId)
        .catch(() => null);

      if (trolledMember) {
        const rolesToRestore = trolledUserData.previousRoles.filter(
          (roleId) => {
            const r = guild.roles.cache.get(roleId);
            return r && !r.managed;
          },
        );
        try {
          await trolledMember.roles.set(rolesToRestore);
        } catch (err) {
          logger.error(
            `Failed to restore roles for untrolled user ${trolledMember.user.tag}:`,
            err,
          );
        }

        const trolledRole = guild.roles.cache.find((r) => r.name === "Trolled");
        if (trolledRole) {
          try {
            await trolledMember.roles.remove(trolledRole);
          } catch (err) {
            logger.error(`Failed to remove Trolled role:`, err);
          }
        }
      }

      try {
        const trollChannel = await guild.channels
          .fetch(trolledUserData.channelId)
          .catch(() => null);
        if (trollChannel) await trollChannel.delete("Troll reward expired");
      } catch (err) {
        logger.error(`Failed to delete troll channel:`, err);
      }

      try {
        const userExchangeData = require("../helpers/userExchangeData");
        userExchangeData.delete(
          `${trolledUserId}_${trolledUserData.channelId}`,
        );
      } catch (err) {
        // Non-fatal
      }

      await TrolledUser.deleteOne({ guildId, userId: trolledUserId });
      logger.info(
        `Auto-untrolled user ${trolledUserId} in ${guild.name} (reward expired)`,
      );
      await postRewardExpired(
        guild,
        guildId,
        awardedUserId,
        reward,
        `<@${trolledUserId}> has been untrolled and their access has been restored.`,
      );
      break;
    }

    default:
      break;
  }
}

function startRewardExpiryScheduler(client) {
  logger.info("Starting reward expiry scheduler...");
  processExpiredRewards(client);
  setInterval(() => processExpiredRewards(client), CHECK_INTERVAL_MS);
}

module.exports = { startRewardExpiryScheduler };
