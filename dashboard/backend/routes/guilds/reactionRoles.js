const express = require("express");
const router = express.Router();
const axios = require("axios");
const ReactionRole = require("../../models/ReactionRole");
const ChangeLog = require("../../models/ChangeLog");
const { requireAuth, checkGuildPermission } = require("./middleware");

const buildDescription = (changes) => {
  if (changes.length === 0) return "No changes made";
  if (changes.length === 1) return `Updated: ${changes[0]}`;
  if (changes.length === 2) return `Updated: ${changes[0]} and ${changes[1]}`;
  if (changes.length <= 5) {
    const last = changes.pop();
    return `Updated: ${changes.join(", ")}, and ${last}`;
  }
  return `Updated ${changes.length} settings`;
};

// Get all reaction roles for a guild
router.get(
  "/:guildId/reaction-roles",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;

    try {
      const reactionRoles = await ReactionRole.find({ guildId }).sort({
        createdAt: -1,
      });
      res.json({ reactionRoles });
    } catch (err) {
      console.error("Error fetching reaction roles:", err);
      res.status(500).json({ error: "Failed to fetch reaction roles" });
    }
  },
);

// Get specific reaction role
router.get(
  "/:guildId/reaction-roles/:reactionRoleId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, reactionRoleId } = req.params;

    try {
      const reactionRole = await ReactionRole.findOne({
        _id: reactionRoleId,
        guildId,
      });

      if (!reactionRole) {
        return res.status(404).json({ error: "Reaction role not found" });
      }

      res.json(reactionRole);
    } catch (err) {
      console.error("Error fetching reaction role:", err);
      res.status(500).json({ error: "Failed to fetch reaction role" });
    }
  },
);

// Create reaction role
router.post(
  "/:guildId/reaction-roles/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, userId, userName } = req.params;
    const {
      name,
      messageLink,
      reactions,
      type,
      allowedRoles,
      ignoredRoles,
      allowMultiple,
      keepCounterAtOne,
    } = req.body;

    try {
      const linkMatch = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
      if (!linkMatch)
        return res.status(400).json({ error: "Invalid message link format" });

      const [, linkGuildId, channelId, messageId] = linkMatch;
      if (linkGuildId !== guildId)
        return res
          .status(400)
          .json({ error: "Message link is from a different server" });

      try {
        await axios.get(
          `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
          {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          },
        );
      } catch {
        return res
          .status(400)
          .json({ error: "Message not found or bot doesn't have access" });
      }

      const reactionRole = new ReactionRole({
        guildId,
        name,
        messageLink,
        channelId,
        messageId,
        reactions,
        type,
        allowedRoles: allowedRoles || [],
        ignoredRoles: ignoredRoles || [],
        allowMultiple,
        keepCounterAtOne,
      });
      await reactionRole.save();

      for (const reaction of reactions) {
        try {
          const emojiStr = reaction.isCustom
            ? `${reaction.emojiName}:${reaction.emoji}`
            : reaction.emoji;
          await axios.put(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emojiStr)}/@me`,
            {},
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              },
            },
          );
        } catch (err) {
          console.error(
            `Failed to add reaction ${reaction.emoji}:`,
            err.response?.data || err.message,
          );
        }
      }

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "reaction role",
        user: { id: userId, name: userName },
        description: `${name} created`,
      });
      await changeLog.save();

      res.json({ success: true, reactionRole });
    } catch (err) {
      console.error("Error creating reaction role:", err);
      res.status(500).json({ error: "Failed to create reaction role" });
    }
  },
);

// Update reaction role (with changelog)
router.put(
  "/:guildId/reaction-roles/:reactionRoleId/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, reactionRoleId, userId, userName } = req.params;
    const {
      name,
      messageLink,
      reactions,
      type,
      allowedRoles,
      ignoredRoles,
      allowMultiple,
      keepCounterAtOne,
    } = req.body;

    try {
      const reactionRole = await ReactionRole.findOne({
        _id: reactionRoleId,
        guildId,
      });
      if (!reactionRole)
        return res.status(404).json({ error: "Reaction role not found" });

      const changes = [];
      if (reactionRole.name !== name) changes.push(`changed name to "${name}"`);

      const linkMatch = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
      if (!linkMatch)
        return res.status(400).json({ error: "Invalid message link format" });

      const [, linkGuildId, channelId, messageId] = linkMatch;
      if (linkGuildId !== guildId)
        return res
          .status(400)
          .json({ error: "Message link is from a different server" });

      if (messageId !== reactionRole.messageId) {
        changes.push("changed message");

        try {
          await axios.get(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              },
            },
          );
        } catch {
          return res
            .status(400)
            .json({ error: "Message not found or bot doesn't have access" });
        }

        try {
          await axios.delete(
            `https://discord.com/api/v10/channels/${reactionRole.channelId}/messages/${reactionRole.messageId}/reactions`,
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              },
            },
          );
        } catch (err) {
          console.error(
            "Failed to clear old reactions:",
            err.response?.data || err.message,
          );
        }
      } else {
        const oldEmojis = reactionRole.reactions.map((r) => r.emoji);
        const newEmojis = reactions.map((r) => r.emoji);
        const removedEmojis = oldEmojis.filter(
          (emoji) => !newEmojis.includes(emoji),
        );

        for (const oldReaction of reactionRole.reactions) {
          if (removedEmojis.includes(oldReaction.emoji)) {
            try {
              const emojiStr = oldReaction.isCustom
                ? `${oldReaction.emojiName}:${oldReaction.emoji}`
                : oldReaction.emoji;
              await axios.delete(
                `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emojiStr)}`,
                {
                  headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                  },
                },
              );
            } catch (err) {
              console.error(
                `Failed to remove reaction ${oldReaction.emoji}:`,
                err.response?.data || err.message,
              );
            }
          }
        }
      }

      const oldCount = reactionRole.reactions.length;
      const newCount = reactions.length;
      if (oldCount !== newCount) {
        const diff = Math.abs(newCount - oldCount);
        changes.push(
          `${newCount > oldCount ? "added" : "removed"} ${diff} reaction${diff !== 1 ? "s" : ""}`,
        );
      } else if (
        JSON.stringify(reactionRole.reactions) !== JSON.stringify(reactions)
      ) {
        changes.push("modified reactions");
      }

      if (reactionRole.type !== type) changes.push(`changed type to "${type}"`);
      if (
        JSON.stringify((reactionRole.allowedRoles || []).sort()) !==
        JSON.stringify((allowedRoles || []).sort())
      )
        changes.push("changed allowed roles");
      if (
        JSON.stringify((reactionRole.ignoredRoles || []).sort()) !==
        JSON.stringify((ignoredRoles || []).sort())
      )
        changes.push("changed ignored roles");
      if (reactionRole.allowMultiple !== allowMultiple)
        changes.push(
          `${allowMultiple ? "enabled" : "disabled"} allow multiple`,
        );
      if (reactionRole.keepCounterAtOne !== keepCounterAtOne)
        changes.push(
          `${keepCounterAtOne ? "enabled" : "disabled"} keep counter at one`,
        );

      reactionRole.name = name;
      reactionRole.messageLink = messageLink;
      reactionRole.channelId = channelId;
      reactionRole.messageId = messageId;
      reactionRole.reactions = reactions;
      reactionRole.type = type;
      reactionRole.allowedRoles = allowedRoles || [];
      reactionRole.ignoredRoles = ignoredRoles || [];
      reactionRole.allowMultiple = allowMultiple;
      reactionRole.keepCounterAtOne = keepCounterAtOne;
      reactionRole.updatedAt = new Date();
      await reactionRole.save();

      for (const reaction of reactions) {
        try {
          const emojiStr = reaction.isCustom
            ? `${reaction.emojiName}:${reaction.emoji}`
            : reaction.emoji;
          await axios.put(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emojiStr)}/@me`,
            {},
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              },
            },
          );
        } catch (err) {
          console.error(
            `Failed to add reaction ${reaction.emoji}:`,
            err.response?.data || err.message,
          );
        }
      }

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "reaction roles",
        user: { id: userId, name: userName },
        description: buildDescription(changes),
        metadata: { reactionRoleId: reactionRole._id, reactionRoleName: name },
      });
      await changeLog.save();

      res.json({ success: true, reactionRole });
    } catch (err) {
      console.error("Error updating reaction role:", err);
      res.status(500).json({ error: "Failed to update reaction role" });
    }
  },
);

// Delete reaction role
router.delete(
  "/:guildId/reaction-roles/:reactionRoleId/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, reactionRoleId, userId, userName } = req.params;

    try {
      const reactionRole = await ReactionRole.findOne({
        _id: reactionRoleId,
        guildId,
      });
      if (!reactionRole)
        return res.status(404).json({ error: "Reaction role not found" });

      try {
        await axios.delete(
          `https://discord.com/api/v10/channels/${reactionRole.channelId}/messages/${reactionRole.messageId}/reactions`,
          {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          },
        );
      } catch (err) {
        console.error(
          "Failed to clear reactions:",
          err.response?.data || err.message,
        );
      }

      await reactionRole.deleteOne();

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "reaction role",
        user: { id: userId, name: userName },
        description: `${reactionRole.name} deleted`,
      });
      await changeLog.save();

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting reaction role:", err);
      res.status(500).json({ error: "Failed to delete reaction role" });
    }
  },
);

module.exports = router;
