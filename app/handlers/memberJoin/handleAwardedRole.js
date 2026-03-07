const AwardedReward = require("../../models/AwardedReward");

module.exports = async function handleAwardedRole(member, guildId) {
  const awardedRole = await AwardedReward.findOne({
    guildId,
    awardedUserId: member.id,
    reward: "addRole",
  });

  if (!awardedRole?.value) return;

  const role = member.guild.roles.cache.find(
    (r) => r.name === awardedRole.value,
  );
  if (!role) {
    logger.warn(
      `Awarded role "${awardedRole.value}" not found in guild ${member.guild.name}`,
    );
    return;
  }

  try {
    await member.roles.add(role);
    logger.info(
      `Restored awarded role "${role.name}" to rejoining user ${member.user.tag}`,
    );
  } catch (err) {
    logger.error(`Failed to restore awarded role to ${member.user.tag}:`, err);
  }
};
