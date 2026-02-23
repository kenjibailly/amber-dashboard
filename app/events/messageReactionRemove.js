const { Events } = require("discord.js");
const ReactionRole = require("../models/ReactionRole");
const GuildModule = require("../models/GuildModule");

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    // Ignore bot reactions
    if (user.bot) return;

    // Fetch partial reactions
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        logger.error("Error fetching reaction:", err);
        return;
      }
    }

    const messageId = reaction.message.id;
    const guildId = reaction.message.guild.id;

    try {
      // Check if reaction roles module is enabled
      const reactionRolesModule = await GuildModule.findOne({
        guildId: guildId,
        moduleId: "reactionroles",
        enabled: true,
      });

      if (!reactionRolesModule) {
        // Module is disabled, don't process reactions
        return;
      }

      // Find reaction role from database
      const reactionRole = await ReactionRole.findOne({ messageId });
      if (!reactionRole) return;

      // Only process if type is "normal" (remove_only and add_only don't remove roles on reaction remove)
      if (reactionRole.type !== "normal") return;

      const member = await reaction.message.guild.members.fetch(user.id);

      // Find the matching reaction
      const emojiStr = reaction.emoji.id || reaction.emoji.name;
      const reactionData = reactionRole.reactions.find(
        (r) =>
          (r.isCustom && r.emoji === emojiStr) ||
          (!r.isCustom && r.emoji === emojiStr)
      );

      if (!reactionData) return;

      // Remove roles
      for (const roleId of reactionData.roleIds) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          logger.success(`Removed role from ${user.tag} via reaction remove`);
        }
      }
    } catch (err) {
      logger.error("Error handling reaction remove:", err);
    }
  },
};
