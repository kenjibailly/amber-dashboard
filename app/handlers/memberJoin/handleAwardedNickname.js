const AwardedReward = require("../../models/AwardedReward");

module.exports = async function handleAwardedNickname(member, guildId) {
  // Get most recent nickname award for this user (own or set by someone else)
  const awardedNickname = await AwardedReward.findOne({
    guildId,
    awardedUserId: member.id,
    reward: { $in: ["changeNickname", "changeOtherNickname"] },
  }).sort({ date: -1 });

  if (!awardedNickname?.value) return;

  try {
    await member.setNickname(awardedNickname.value);
    logger.info(
      `Restored nickname "${awardedNickname.value}" to rejoining user ${member.user.tag}`,
    );
  } catch (err) {
    if (err.code === 50013) {
      logger.warn(
        `Cannot set nickname for ${member.user.tag} — likely server owner or missing permissions`,
      );
    } else {
      logger.error(`Failed to restore nickname to ${member.user.tag}:`, err);
    }
  }
};
