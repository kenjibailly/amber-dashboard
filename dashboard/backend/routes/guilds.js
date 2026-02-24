const express = require("express");
const router = express.Router();
const GuildModule = require("../models/GuildModule");
const ReactionRole = require("../models/ReactionRole");
const ChangeLog = require("../models/ChangeLog");

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Middleware to check if user has permission for the guild
function checkGuildPermission(req, res, next) {
  const { guildId } = req.params;
  const userGuilds = req.session.guilds || [];

  const hasAccess = userGuilds.some((g) => g.id === guildId);

  if (!hasAccess) {
    return res.status(403).json({ error: "No permission for this guild" });
  }

  next();
}

// Get all modules for a guild
router.get(
  "/:guildId/modules",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;

    try {
      // Define available modules (you can move this to a config file later)
      // In the GET "/:guildId/modules" route, update availableModules:
      const availableModules = [
        {
          id: "welcome",
          title: "Welcome Messages",
          description: "Send customized welcome messages when new members join",
          category: "general",
        },
        {
          id: "goodbye",
          title: "Goodbye Messages",
          description:
            "Send customized goodbye messages when a member leaves the server",
          category: "general",
        },
        {
          id: "autorole",
          title: "Auto Role",
          description:
            "Automatically assign a role to new members when they join",
          category: "general",
        },
        {
          id: "reactionroles",
          title: "Reaction Roles",
          description:
            "Let members assign themselves roles by reacting to messages",
          category: "general",
        },
        {
          id: "tickets",
          title: "Tickets",
          description: "Setup a ticket system for your staff to handle",
          category: "general",
        },
        {
          id: "addrole",
          title: "Add Role",
          description: "Settings for the add-role command",
          category: "general",
        },
        {
          id: "customcommands",
          title: "Custom Commands",
          description: "Add a custom command",
          category: "general",
        },
      ];

      // Get module states from database
      const dbModules = await GuildModule.find({ guildId });

      // Create a map of module states
      const moduleStates = {};
      dbModules.forEach((mod) => {
        moduleStates[mod.moduleId] = {
          enabled: mod.enabled,
          settings: mod.settings,
        };
      });

      // Combine available modules with their states
      const modules = availableModules.map((mod) => ({
        ...mod,
        enabled: moduleStates[mod.id]?.enabled || false,
        settings: moduleStates[mod.id]?.settings || {},
      }));

      res.json({ modules });
    } catch (err) {
      console.error("Error fetching modules:", err);
      res.status(500).json({ error: "Failed to fetch modules" });
    }
  },
);

// Toggle module for a guild
router.post(
  "/:guildId/modules/:moduleId/toggle/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, moduleId, userId, userName } = req.params;
    const { enabled } = req.body;

    try {
      // Find or create the module document
      let guildModule = await GuildModule.findOne({ guildId, moduleId });

      if (guildModule) {
        // Update existing
        guildModule.enabled = enabled;
        guildModule.updatedAt = new Date();
        await guildModule.save();
      } else {
        // Create new
        guildModule = new GuildModule({
          guildId,
          moduleId,
          enabled,
        });
        await guildModule.save();
      }

      const changeLog = new ChangeLog({
        guildId,
        moduleId,
        user: {
          id: userId,
          name: userName,
        },
        description: `Set to ${enabled ? "enabled" : "disabled"}`,
      });

      await changeLog.save();

      console.log(`Module ${moduleId} for guild ${guildId} set to ${enabled}`);

      res.json({
        success: true,
        guildId,
        moduleId,
        enabled,
        updatedAt: guildModule.updatedAt,
      });
    } catch (err) {
      console.error("Error toggling module:", err);
      res.status(500).json({ error: "Failed to toggle module" });
    }
  },
);

// Get specific module settings
router.get(
  "/:guildId/modules/:moduleId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, moduleId } = req.params;

    try {
      let guildModule = await GuildModule.findOne({ guildId, moduleId });

      if (!guildModule) {
        // Return default state if not found
        return res.json({
          guildId,
          moduleId,
          enabled: false,
          settings: {},
        });
      }

      res.json({
        guildId: guildModule.guildId,
        moduleId: guildModule.moduleId,
        enabled: guildModule.enabled,
        settings: guildModule.settings,
        updatedAt: guildModule.updatedAt,
      });
    } catch (err) {
      console.error("Error fetching module:", err);
      res.status(500).json({ error: "Failed to fetch module" });
    }
  },
);

// Update module settings (for detailed settings page)
router.put(
  "/:guildId/modules/:moduleId/settings/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, moduleId, userId, userName } = req.params;
    const { settings } = req.body;

    console.log(
      `Update settings - Guild: ${guildId}, Module: ${moduleId}`,
      settings,
    );

    try {
      let guildModule = await GuildModule.findOne({ guildId, moduleId });
      let changeDescription = "Updated";

      if (guildModule) {
        // Compare old and new settings to generate detailed description
        const oldSettings = guildModule.settings || {};
        const changes = [];

        // Helper function to convert camelCase/PascalCase to readable text
        const toReadable = (key) => {
          return (
            key
              // Insert space before capital letters
              .replace(/([A-Z])/g, " $1")
              // Handle numbers
              .replace(/(\d+)/g, " $1")
              // Convert to lowercase and trim
              .toLowerCase()
              .trim()
              // Replace underscores and hyphens with spaces
              .replace(/[_-]/g, " ")
              // Remove multiple spaces
              .replace(/\s+/g, " ")
          );
        };

        // Helper function to deeply compare objects
        const compareObjects = (oldObj, newObj, path = []) => {
          const allKeys = new Set([
            ...Object.keys(oldObj || {}),
            ...Object.keys(newObj || {}),
          ]);

          for (const key of allKeys) {
            const oldVal = oldObj?.[key];
            const newVal = newObj?.[key];
            const currentPath = [...path, key];

            // Skip if values are the same
            if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
              continue;
            }

            // Handle nested objects
            if (
              typeof newVal === "object" &&
              newVal !== null &&
              !Array.isArray(newVal) &&
              typeof oldVal === "object" &&
              oldVal !== null &&
              !Array.isArray(oldVal)
            ) {
              // Recursively compare nested objects
              compareObjects(oldVal, newVal, currentPath);
            } else {
              // Create readable path (e.g., "world boss channel id" from worldBoss.channelId)
              const readablePath = currentPath.map(toReadable).join(" ");

              // Determine type of change
              if (oldVal === undefined || oldVal === "" || oldVal === null) {
                changes.push(`set ${readablePath}`);
              } else if (
                newVal === undefined ||
                newVal === "" ||
                newVal === null
              ) {
                changes.push(`removed ${readablePath}`);
              } else {
                changes.push(`changed ${readablePath}`);
              }
            }
          }
        };

        compareObjects(oldSettings, settings);

        // Generate description based on changes
        if (changes.length === 0) {
          changeDescription = "No changes made";
        } else if (changes.length === 1) {
          changeDescription = `Updated: ${changes[0]}`;
        } else if (changes.length === 2) {
          changeDescription = `Updated: ${changes[0]} and ${changes[1]}`;
        } else if (changes.length <= 5) {
          // For 3-5 changes, list them all
          const lastChange = changes.pop();
          changeDescription = `Updated: ${changes.join(
            ", ",
          )}, and ${lastChange}`;
        } else {
          // For many changes, just show count
          changeDescription = `Updated ${changes.length} settings`;
        }

        guildModule.settings = settings;
        guildModule.updatedAt = new Date();
        await guildModule.save();

        const changeLog = new ChangeLog({
          guildId,
          moduleId,
          user: {
            id: userId,
            name: userName,
          },
          description: changeDescription,
        });

        await changeLog.save();
      } else {
        // Create with settings - count configured fields
        const countConfiguredFields = (obj) => {
          let count = 0;
          for (const value of Object.values(obj || {})) {
            if (value && typeof value === "object" && !Array.isArray(value)) {
              count += countConfiguredFields(value);
            } else if (value !== undefined && value !== null && value !== "") {
              count++;
            }
          }
          return count;
        };

        const configuredCount = countConfiguredFields(settings);
        changeDescription =
          configuredCount > 0
            ? `Initial configuration (${configuredCount} setting${
                configuredCount !== 1 ? "s" : ""
              })`
            : "Initial configuration";

        guildModule = new GuildModule({
          guildId,
          moduleId,
          enabled: false,
          settings,
        });
        await guildModule.save();

        const changeLog = new ChangeLog({
          guildId,
          moduleId,
          user: {
            id: userId,
            name: userName,
          },
          description: changeDescription,
        });

        await changeLog.save();
      }

      res.json({
        success: true,
        guildId,
        moduleId,
        settings: guildModule.settings,
        updatedAt: guildModule.updatedAt,
      });
    } catch (err) {
      console.error("Error updating module settings:", err);
      res.status(500).json({ error: "Failed to update settings" });
    }
  },
);

const axios = require("axios");
const CustomCommand = require("../models/CustomCommand");
// Add this route after your existing routes
router.get(
  "/:guildId/channels",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;

    try {
      // Fetch channels from Discord API
      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${guildId}/channels`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        },
      );

      // Filter to only text channels (type 0) and announcement channels (type 5)
      const textChannels = response.data
        .filter((channel) => channel.type === 0 || channel.type === 5)
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          position: channel.position,
        }))
        .sort((a, b) => a.position - b.position); // Sort by position

      console.log(
        `Fetched ${textChannels.length} text channels for guild ${guildId}`,
      );

      res.json({ channels: textChannels });
    } catch (err) {
      console.error("Error fetching guild channels:", err);
      res.status(500).json({ error: "Failed to fetch guild channels" });
    }
  },
);

router.get(
  "/:guildId/users",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;

    try {
      // Fetch members from Discord API (limit 1000 is the max per request)
      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        },
      );

      const users = response.data
        .filter((member) => !member.user.bot) // exclude bots
        .map((member) => ({
          id: member.user.id,
          username: member.user.username,
          globalName: member.user.global_name,
          nickname: member.nick,
          avatar: member.user.avatar,
        }))
        .sort((a, b) =>
          (a.globalName || a.username).localeCompare(
            b.globalName || b.username,
          ),
        );

      console.log(`Fetched ${users.length} users for guild ${guildId}`);

      res.json({ users });
    } catch (err) {
      console.error("Error fetching guild users:", err);
      res.status(500).json({ error: "Failed to fetch guild users" });
    }
  },
);

router.get(
  "/:guildId/roles",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;

    try {
      // Fetch roles from Discord API
      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${guildId}/roles`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        },
      );

      // Filter out @everyone role and sort by position (highest first)
      const roles = response.data
        .filter((role) => role.name !== "@everyone")
        .map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
          managed: role.managed, // Managed roles (like bot roles) can't be assigned
        }))
        .sort((a, b) => b.position - a.position);

      res.json({ roles });
    } catch (err) {
      console.error(
        "Error fetching guild roles:",
        err.response?.data || err.message,
      );
      res.status(500).json({ error: "Failed to fetch guild roles" });
    }
  },
);

// Get all emojis for a guild
router.get(
  "/:guildId/emojis",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;

    try {
      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${guildId}/emojis`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        },
      );

      const emojis = response.data.map((emoji) => ({
        id: emoji.id,
        name: emoji.name,
        animated: emoji.animated,
        url: `https://cdn.discordapp.com/emojis/${emoji.id}.${
          emoji.animated ? "gif" : "png"
        }`,
      }));

      res.json({ emojis });
    } catch (err) {
      console.error(
        "Error fetching guild emojis:",
        err.response?.data || err.message,
      );
      res.status(500).json({ error: "Failed to fetch guild emojis" });
    }
  },
);

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

// Get all custom commands for a guild
router.get(
  "/:guildId/custom-commands",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;

    try {
      const customCommands = await CustomCommand.find({ guildId }).sort({
        createdAt: -1,
      });
      res.json({ customCommands });
    } catch (err) {
      console.error("Error fetching custom commands:", err);
      res.status(500).json({ error: "Failed to fetch custom commands" });
    }
  },
);

router.get(
  "/:guildId/change_logs",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    try {
      // Get total count for pagination info
      const totalLogs = await ChangeLog.countDocuments({ guildId });

      // Get paginated logs, sorted by most recent first
      const changeLogs = await ChangeLog.find({ guildId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.json({
        changeLogs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalLogs / limit),
          totalLogs,
          logsPerPage: limit,
          hasNextPage: page < Math.ceil(totalLogs / limit),
          hasPrevPage: page > 1,
        },
      });
    } catch (err) {
      console.error("Error fetching change logs:", err);
      res.status(500).json({ error: "Failed to fetch change logs" });
    }
  },
);

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

      if (!reactionRole) {
        return res.status(404).json({ error: "Reaction role not found" });
      }

      // Track changes for changelog
      const changes = [];

      // Helper function to convert camelCase to readable text
      const toReadable = (key) => {
        return key
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()
          .trim()
          .replace(/[_-]/g, " ")
          .replace(/\s+/g, " ");
      };

      // Check what changed
      if (reactionRole.name !== name) {
        changes.push(`changed name to "${name}"`);
      }

      // Parse message link
      const linkMatch = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);

      if (!linkMatch) {
        return res.status(400).json({ error: "Invalid message link format" });
      }

      const [, linkGuildId, channelId, messageId] = linkMatch;

      if (linkGuildId !== guildId) {
        return res
          .status(400)
          .json({ error: "Message link is from a different server" });
      }

      // If message changed, verify new message exists
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
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Message not found or bot doesn't have access" });
        }

        // Clear old message reactions
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
        // Same message, but check for removed reactions
        const oldEmojis = reactionRole.reactions.map((r) => r.emoji);
        const newEmojis = reactions.map((r) => r.emoji);
        const removedEmojis = oldEmojis.filter(
          (emoji) => !newEmojis.includes(emoji),
        );

        // Remove reactions that were deleted from config
        for (const oldReaction of reactionRole.reactions) {
          if (removedEmojis.includes(oldReaction.emoji)) {
            try {
              const emojiStr = oldReaction.isCustom
                ? `${oldReaction.emojiName}:${oldReaction.emoji}`
                : oldReaction.emoji;

              await axios.delete(
                `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(
                  emojiStr,
                )}`,
                {
                  headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                  },
                },
              );
              console.log(`Removed reaction ${emojiStr} from message`);
            } catch (err) {
              console.error(
                `Failed to remove reaction ${oldReaction.emoji}:`,
                err.response?.data || err.message,
              );
            }
          }
        }
      }

      // Check reaction changes
      const oldReactionCount = reactionRole.reactions.length;
      const newReactionCount = reactions.length;

      if (oldReactionCount !== newReactionCount) {
        if (newReactionCount > oldReactionCount) {
          const diff = newReactionCount - oldReactionCount;
          changes.push(`added ${diff} reaction${diff !== 1 ? "s" : ""}`);
        } else {
          const diff = oldReactionCount - newReactionCount;
          changes.push(`removed ${diff} reaction${diff !== 1 ? "s" : ""}`);
        }
      } else if (
        JSON.stringify(reactionRole.reactions) !== JSON.stringify(reactions)
      ) {
        changes.push("modified reactions");
      }

      // Check type change
      if (reactionRole.type !== type) {
        changes.push(`changed type to "${type}"`);
      }

      // Check role restrictions
      const oldAllowedRoles = JSON.stringify(
        (reactionRole.allowedRoles || []).sort(),
      );
      const newAllowedRoles = JSON.stringify((allowedRoles || []).sort());
      if (oldAllowedRoles !== newAllowedRoles) {
        changes.push("changed allowed roles");
      }

      const oldIgnoredRoles = JSON.stringify(
        (reactionRole.ignoredRoles || []).sort(),
      );
      const newIgnoredRoles = JSON.stringify((ignoredRoles || []).sort());
      if (oldIgnoredRoles !== newIgnoredRoles) {
        changes.push("changed ignored roles");
      }

      // Check boolean options
      if (reactionRole.allowMultiple !== allowMultiple) {
        changes.push(
          `${allowMultiple ? "enabled" : "disabled"} allow multiple`,
        );
      }

      if (reactionRole.keepCounterAtOne !== keepCounterAtOne) {
        changes.push(
          `${keepCounterAtOne ? "enabled" : "disabled"} keep counter at one`,
        );
      }

      // Update fields
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

      // Add new reactions to the message
      for (const reaction of reactions) {
        try {
          const emojiStr = reaction.isCustom
            ? `${reaction.emojiName}:${reaction.emoji}`
            : reaction.emoji;
          await axios.put(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(
              emojiStr,
            )}/@me`,
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

      // Generate changelog description
      let changeDescription = "No changes made";
      if (changes.length === 1) {
        changeDescription = `Updated: ${changes[0]}`;
      } else if (changes.length === 2) {
        changeDescription = `Updated: ${changes[0]} and ${changes[1]}`;
      } else if (changes.length > 2 && changes.length <= 5) {
        const lastChange = changes.pop();
        changeDescription = `Updated: ${changes.join(", ")}, and ${lastChange}`;
      } else if (changes.length > 5) {
        changeDescription = `Updated ${changes.length} settings`;
      }

      // Create changelog entry
      const changeLog = new ChangeLog({
        guildId,
        moduleId: "reaction roles",
        user: {
          id: userId,
          name: userName,
        },
        description: changeDescription,
        metadata: {
          reactionRoleId: reactionRole._id,
          reactionRoleName: name,
        },
      });

      await changeLog.save();

      res.json({ success: true, reactionRole });
    } catch (err) {
      console.error("Error updating reaction role:", err);
      res.status(500).json({ error: "Failed to update reaction role" });
    }
  },
);

router.put(
  "/:guildId/custom-commands/:customCommandId/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, customCommandId, userId, userName } = req.params;
    const {
      name,
      command,
      description,
      replies,
      allowedRoles,
      embedColor,
      tagUser,
    } = req.body;

    try {
      const customCommand = await CustomCommand.findOne({
        _id: customCommandId,
        guildId,
      });

      if (!customCommand) {
        return res.status(404).json({ error: "Custom command not found" });
      }

      // Track changes for changelog
      const changes = [];

      // Check what changed
      if (customCommand.name !== name) {
        changes.push(`changed name to "${name}"`);
      }

      if (customCommand.description !== description) {
        changes.push(`changed description to "${description}"`);
      }

      if (customCommand.tagUser !== tagUser) {
        changes.push(`changed tagUser to "${tagUser}"`);
      }

      // Check role restrictions
      const oldAllowedRoles = JSON.stringify(
        (customCommand.allowedRoles || []).sort(),
      );
      const newAllowedRoles = JSON.stringify((allowedRoles || []).sort());
      if (oldAllowedRoles !== newAllowedRoles) {
        changes.push("changed allowed roles");
      }

      // Update fields
      customCommand.name = name;
      customCommand.description = description;
      customCommand.command = command;
      customCommand.replies = replies;
      customCommand.allowedRoles = allowedRoles || [];
      customCommand.embedColor = embedColor;
      customCommand.tagUser = tagUser;
      customCommand.updatedAt = new Date();

      await customCommand.save();

      // Generate changelog description
      let changeDescription = "No changes made";
      if (changes.length === 1) {
        changeDescription = `Updated: ${changes[0]}`;
      } else if (changes.length === 2) {
        changeDescription = `Updated: ${changes[0]} and ${changes[1]}`;
      } else if (changes.length > 2 && changes.length <= 5) {
        const lastChange = changes.pop();
        changeDescription = `Updated: ${changes.join(", ")}, and ${lastChange}`;
      } else if (changes.length > 5) {
        changeDescription = `Updated ${changes.length} settings`;
      }

      // Create changelog entry
      const changeLog = new ChangeLog({
        guildId,
        moduleId: "reaction roles",
        user: {
          id: userId,
          name: userName,
        },
        description: changeDescription,
        metadata: {
          customCommandId: customCommand._id,
          customCommandName: name,
        },
      });

      await changeLog.save();

      // Trigger bot to register the command
      try {
        await axios.post(
          `${process.env.BOT_API_URL}/api/bot/register-commands/${guildId}`,
          {
            guildId,
            commandName: command,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
              "Content-Type": "application/json",
            },
          },
        );
        logger.success(`Triggered command registration for guild ${guildId}`);
      } catch (error) {
        console.error(`Error registering bot command /${command}:`, error);
        // Don't fail the request if command registration fails
      }

      res.json({ success: true, customCommand });
    } catch (err) {
      console.error("Error updating custom command:", err);
      res.status(500).json({ error: "Failed to update custom command" });
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
      // Parse message link to extract channel and message IDs
      // Format: https://discord.com/channels/{guildId}/{channelId}/{messageId}
      const linkMatch = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);

      if (!linkMatch) {
        return res.status(400).json({ error: "Invalid message link format" });
      }

      const [, linkGuildId, channelId, messageId] = linkMatch;

      if (linkGuildId !== guildId) {
        return res
          .status(400)
          .json({ error: "Message link is from a different server" });
      }

      // Verify message exists
      try {
        await axios.get(
          `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
          {
            headers: {
              Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            },
          },
        );
      } catch (err) {
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

      // Add reactions to the message
      for (const reaction of reactions) {
        try {
          const emojiStr = reaction.isCustom
            ? `${reaction.emojiName}:${reaction.emoji}`
            : reaction.emoji;
          await axios.put(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(
              emojiStr,
            )}/@me`,
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

      logger.success(`Created reaction role "${name}" for guild ${guildId}`);

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "reaction role",
        user: {
          id: userId,
          name: userName,
        },
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

// Create custom commands
router.post(
  "/:guildId/custom-commands/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, userId, userName } = req.params;
    const {
      name,
      command,
      description,
      replies,
      allowedRoles,
      embedColor,
      tagUser,
    } = req.body;

    try {
      const customCommand = new CustomCommand({
        guildId,
        name,
        command,
        description,
        replies,
        allowedRoles: allowedRoles || [],
        embedColor,
        tagUser,
      });

      await customCommand.save();

      logger.success(`Created custom command "${name}" for guild ${guildId}`);

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "custom command",
        user: {
          id: userId,
          name: userName,
        },
        description: `${name} created`,
      });

      await changeLog.save();

      // Trigger bot to register the command
      try {
        await axios.post(
          `${process.env.BOT_API_URL}/api/bot/register-commands/${guildId}`,
          {
            guildId,
            commandName: command,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
              "Content-Type": "application/json",
            },
          },
        );
        logger.success(`Triggered command registration for guild ${guildId}`);
      } catch (error) {
        console.error(`Error registering bot command /${command}:`, error);
        // Don't fail the request if command registration fails
      }

      res.json({ success: true, customCommand });
    } catch (err) {
      console.error("Error creating custom command:", err);
      res.status(500).json({ error: "Failed to create custom command" });
    }
  },
);

// Update reaction role
router.put(
  "/:guildId/reaction-roles/:reactionRoleId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, reactionRoleId } = req.params;
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

      if (!reactionRole) {
        return res.status(404).json({ error: "Reaction role not found" });
      }

      // Parse message link
      const linkMatch = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);

      if (!linkMatch) {
        return res.status(400).json({ error: "Invalid message link format" });
      }

      const [, linkGuildId, channelId, messageId] = linkMatch;

      if (linkGuildId !== guildId) {
        return res
          .status(400)
          .json({ error: "Message link is from a different server" });
      }

      // If message changed, verify new message exists
      if (messageId !== reactionRole.messageId) {
        try {
          await axios.get(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              },
            },
          );
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Message not found or bot doesn't have access" });
        }

        // Clear old message reactions
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
      }

      // Update fields
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

      // Add new reactions to the message
      for (const reaction of reactions) {
        try {
          const emojiStr = reaction.isCustom
            ? `${reaction.emojiName}:${reaction.emoji}`
            : reaction.emoji;
          await axios.put(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(
              emojiStr,
            )}/@me`,
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

      res.json({ success: true, reactionRole });
    } catch (err) {
      console.error("Error updating reaction role:", err);
      res.status(500).json({ error: "Failed to update reaction role" });
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

router.get(
  "/:guildId/custom-commands/:customCommandId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, customCommandId } = req.params;

    try {
      const customCommand = await CustomCommand.findOne({
        _id: customCommandId,
        guildId,
      });

      if (!customCommand) {
        return res.status(404).json({ error: "Custom commnd not found" });
      }

      res.json(customCommand);
    } catch (err) {
      console.error("Error fetching custom command:", err);
      res.status(500).json({ error: "Failed to fetch custom command" });
    }
  },
);

// Then your PUT route comes after this...
router.put(
  "/:guildId/reaction-roles/:reactionRoleId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    // ... your existing PUT code
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

      if (!reactionRole) {
        return res.status(404).json({ error: "Reaction role not found" });
      }

      // Clear message reactions
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
          "Failed to clear reactions:",
          err.response?.data || err.message,
        );
      }

      await reactionRole.deleteOne();

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "reaction role",
        user: {
          id: userId,
          name: userName,
        },
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

// Delete custom command
router.delete(
  "/:guildId/custom-commands/:customCommandId/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, customCommandId, userId, userName } = req.params;

    try {
      const customCommand = await CustomCommand.findOne({
        _id: customCommandId,
        guildId,
      });

      if (!customCommand) {
        return res.status(404).json({ error: "Custom command not found" });
      }

      const commandName = customCommand.name;

      await customCommand.deleteOne();

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "custom command",
        user: {
          id: userId,
          name: userName,
        },
        description: `${customCommand.name} deleted`,
      });

      await changeLog.save();

      try {
        await axios.post(
          `${process.env.BOT_API_URL}/api/bot/register-commands/${guildId}`,
          {
            guildId,
            commandName,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
              "Content-Type": "application/json",
            },
          },
        );
        logger.success(`Triggered command registration for guild ${guildId}`);
      } catch (error) {
        console.error(`Error registering bot command /${command}:`, error);
        // Don't fail the request if command registration fails
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting custom command:", err);
      res.status(500).json({ error: "Failed to delete custom command" });
    }
  },
);

// Get message content (for editing)
router.get(
  "/:guildId/message/:channelId/:messageId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, channelId, messageId } = req.params;

    try {
      const response = await axios.get(
        `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        },
      );

      res.json({
        content: response.data.content || "",
        embeds: response.data.embeds || [],
        components: response.data.components || [],
      });
    } catch (err) {
      console.error(
        "Error fetching message:",
        err.response?.data || err.message,
      );
      res.status(500).json({ error: "Failed to fetch message" });
    }
  },
);

// Send new message with embed
router.post(
  "/:guildId/message/:channelId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, channelId } = req.params;
    const { content, embeds, components } = req.body;

    try {
      // Clean up embeds - remove empty fields but keep actual content
      const cleanedEmbeds = embeds
        .map((embed) => {
          const cleaned = { ...embed };

          // Remove author if empty or only placeholder
          if (!cleaned.author?.name || cleaned.author.name === "Author name") {
            delete cleaned.author;
          } else if (cleaned.author) {
            // Keep author but remove empty URLs
            if (!cleaned.author.url) delete cleaned.author.url;
            if (!cleaned.author.icon_url) delete cleaned.author.icon_url;
          }

          // Remove title if it's empty or placeholder
          if (!cleaned.title || cleaned.title === "Embed title") {
            delete cleaned.title;
            delete cleaned.url; // Remove URL if no title
          } else if (!cleaned.url) {
            delete cleaned.url;
          }

          // Remove description if it's empty or placeholder
          if (
            !cleaned.description ||
            cleaned.description === "Embed description"
          ) {
            delete cleaned.description;
          }

          // Remove footer if empty or only placeholder
          if (!cleaned.footer?.text || cleaned.footer.text === "Footer text") {
            delete cleaned.footer;
          } else if (cleaned.footer) {
            if (!cleaned.footer.icon_url) delete cleaned.footer.icon_url;
          }

          // Remove empty fields
          if (cleaned.fields) {
            cleaned.fields = cleaned.fields.filter((f) => f.name && f.value);
            if (cleaned.fields.length === 0) delete cleaned.fields;
          }

          // Remove empty images
          if (cleaned.image && !cleaned.image.url) {
            delete cleaned.image;
          }

          if (cleaned.thumbnail && !cleaned.thumbnail.url) {
            delete cleaned.thumbnail;
          }

          // Remove images array (not supported by Discord API)
          delete cleaned.images;

          // Remove empty timestamp
          if (!cleaned.timestamp) {
            delete cleaned.timestamp;
          }

          return cleaned;
        })
        .filter((embed) => {
          // Remove completely empty embeds
          return Object.keys(embed).length > 1; // More than just color
        });

      const payload = {};

      if (content) payload.content = content;
      if (cleanedEmbeds.length > 0) payload.embeds = cleanedEmbeds;
      if (components && components.length > 0) payload.components = components;

      // Must have at least content or embeds
      if (
        !payload.content &&
        (!payload.embeds || payload.embeds.length === 0)
      ) {
        return res
          .status(400)
          .json({ error: "Message must have content or embeds" });
      }

      const response = await axios.post(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      logger.success(
        `Sent embed message to channel ${channelId} in guild ${guildId}`,
      );
      res.json({ success: true, message: response.data });
    } catch (err) {
      console.error(
        "Error sending message:",
        err.response?.data || err.message,
      );
      res.status(500).json({
        error: err.response?.data?.message || "Failed to send message",
      });
    }
  },
);

// Edit existing message
router.put(
  "/:guildId/message/:channelId/:messageId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, channelId, messageId } = req.params;
    const { content, embeds, components } = req.body;

    try {
      // Clean up embeds - remove empty fields but keep actual content
      const cleanedEmbeds = embeds
        .map((embed) => {
          const cleaned = { ...embed };

          // Remove author if empty or only placeholder
          if (!cleaned.author?.name || cleaned.author.name === "Author name") {
            delete cleaned.author;
          } else if (cleaned.author) {
            if (!cleaned.author.url) delete cleaned.author.url;
            if (!cleaned.author.icon_url) delete cleaned.author.icon_url;
          }

          // Remove title if it's empty or placeholder
          if (!cleaned.title || cleaned.title === "Embed title") {
            delete cleaned.title;
            delete cleaned.url;
          } else if (!cleaned.url) {
            delete cleaned.url;
          }

          // Remove description if it's empty or placeholder
          if (
            !cleaned.description ||
            cleaned.description === "Embed description"
          ) {
            delete cleaned.description;
          }

          // Remove footer if empty or only placeholder
          if (!cleaned.footer?.text || cleaned.footer.text === "Footer text") {
            delete cleaned.footer;
          } else if (cleaned.footer) {
            if (!cleaned.footer.icon_url) delete cleaned.footer.icon_url;
          }

          // Remove empty fields
          if (cleaned.fields) {
            cleaned.fields = cleaned.fields.filter((f) => f.name && f.value);
            if (cleaned.fields.length === 0) delete cleaned.fields;
          }

          // Remove empty images
          if (cleaned.image && !cleaned.image.url) {
            delete cleaned.image;
          }

          if (cleaned.thumbnail && !cleaned.thumbnail.url) {
            delete cleaned.thumbnail;
          }

          // Remove images array
          delete cleaned.images;

          // Remove empty timestamp
          if (!cleaned.timestamp) {
            delete cleaned.timestamp;
          }

          return cleaned;
        })
        .filter((embed) => {
          return Object.keys(embed).length > 1;
        });

      const payload = {};

      if (content !== undefined) payload.content = content;
      if (cleanedEmbeds.length > 0) payload.embeds = cleanedEmbeds;
      if (components !== undefined) payload.components = components;

      const response = await axios.patch(
        `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
        payload,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      logger.success(`Edited message ${messageId} in channel ${channelId}`);
      res.json({ success: true, message: response.data });
    } catch (err) {
      console.error(
        "Error editing message:",
        err.response?.data || err.message,
      );
      res.status(500).json({
        error: err.response?.data?.message || "Failed to edit message",
      });
    }
  },
);

module.exports = router;
