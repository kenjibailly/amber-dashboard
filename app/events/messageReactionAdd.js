const { Events } = require("discord.js");
const ReactionRole = require("../models/ReactionRole");
const GuildModule = require("../models/GuildModule");

// Helper function to check if member can receive roles
function canReceiveRoles(member, reactionRole) {
  // Check allowed roles
  if (reactionRole.allowedRoles.length > 0) {
    const hasAllowedRole = reactionRole.allowedRoles.some((roleId) =>
      member.roles.cache.has(roleId)
    );
    if (!hasAllowedRole) return false;
  }

  // Check ignored roles
  if (reactionRole.ignoredRoles.length > 0) {
    const hasIgnoredRole = reactionRole.ignoredRoles.some((roleId) =>
      member.roles.cache.has(roleId)
    );
    if (hasIgnoredRole) return false;
  }

  return true;
}

// Helper function to remove other reactions if allowMultiple is false
async function removeOtherReactions(
  message,
  userId,
  currentReaction,
  reactionRole
) {
  try {
    for (const reaction of message.reactions.cache.values()) {
      // Skip the current reaction
      if (reaction.emoji.toString() === currentReaction.toString()) continue;

      // Check if this reaction is part of the reaction role
      const emojiStr = reaction.emoji.id || reaction.emoji.name;
      const isPartOfReactionRole = reactionRole.reactions.some(
        (r) =>
          (r.isCustom && r.emoji === reaction.emoji.id) ||
          (!r.isCustom && r.emoji === reaction.emoji.name)
      );

      if (isPartOfReactionRole) {
        const users = await reaction.users.fetch();
        if (users.has(userId)) {
          await reaction.users.remove(userId);

          // Remove roles from previous reaction
          const reactionData = reactionRole.reactions.find(
            (r) =>
              (r.isCustom && r.emoji === reaction.emoji.id) ||
              (!r.isCustom && r.emoji === reaction.emoji.name)
          );

          if (reactionData) {
            const member = await message.guild.members.fetch(userId);
            for (const roleId of reactionData.roleIds) {
              if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error("Error removing other reactions:", err);
  }
}

module.exports = {
  name: Events.MessageReactionAdd,
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

      // Check if this emoji is part of the configured reactions
      const emojiStr = reaction.emoji.id || reaction.emoji.name;
      const reactionData = reactionRole.reactions.find(
        (r) =>
          (r.isCustom && r.emoji === emojiStr) ||
          (!r.isCustom && r.emoji === emojiStr)
      );

      // If reaction is not configured, remove it
      if (!reactionData) {
        await reaction.users.remove(user.id);
        logger.info(
          `Removed unauthorized reaction ${emojiStr} from ${user.tag}`
        );
        return;
      }

      const member = await reaction.message.guild.members.fetch(user.id);

      // Check if member can receive roles
      if (!canReceiveRoles(member, reactionRole)) {
        await reaction.users.remove(user.id);
        return;
      }

      // Handle allowMultiple option
      if (!reactionRole.allowMultiple) {
        await removeOtherReactions(
          reaction.message,
          user.id,
          reaction.emoji,
          reactionRole
        );
      }

      // Add roles based on type
      if (reactionRole.type === "normal" || reactionRole.type === "add_only") {
        for (const roleId of reactionData.roleIds) {
          const role = reaction.message.guild.roles.cache.get(roleId);
          if (role && !member.roles.cache.has(roleId)) {
            await member.roles.add(role);
            logger.success(
              `Added role ${role.name} to ${user.tag} via reaction role`
            );
          }
        }
      } else if (reactionRole.type === "remove_only") {
        for (const roleId of reactionData.roleIds) {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            logger.success(
              `Removed role from ${user.tag} via reaction role (remove_only)`
            );
          }
        }
      }

      // Keep counter at 1 if enabled
      if (reactionRole.keepCounterAtOne) {
        await reaction.users.remove(user.id);
      }
    } catch (err) {
      logger.error("Error handling reaction add:", err);
    }
  },
};
