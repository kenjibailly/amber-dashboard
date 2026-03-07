const GuildModule = require("../../models/GuildModule");

module.exports = async function handleAutoRole(member, guildId) {
  const autoRoleModule = await GuildModule.findOne({
    guildId,
    moduleId: "autorole",
    enabled: true,
  });

  if (!autoRoleModule?.settings?.roleId) return;

  const role = member.guild.roles.cache.get(autoRoleModule.settings.roleId);
  if (!role) {
    logger.warn(
      `Auto role ${autoRoleModule.settings.roleId} not found in guild ${member.guild.name}`,
    );
    return;
  }

  try {
    await member.roles.add(role);
    logger.success(
      `Added role "${role.name}" to ${member.user.tag} in ${member.guild.name}`,
    );
  } catch (error) {
    logger.error(
      `Failed to add role to ${member.user.tag} in ${member.guild.name}:`,
      error,
    );
  }
};
