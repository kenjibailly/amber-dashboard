const express = require("express");
const router = express.Router();
const GuildModule = require("../../models/GuildModule");
const ChangeLog = require("../../models/ChangeLog");
const { requireAuth, checkGuildPermission } = require("./middleware");

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
    description: "Automatically assign a role to new members when they join",
    category: "general",
  },
  {
    id: "reactionroles",
    title: "Reaction Roles",
    description: "Let members assign themselves roles by reacting to messages",
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

// Get all modules for a guild
router.get(
  "/:guildId/modules",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;

    try {
      const dbModules = await GuildModule.find({ guildId });

      const moduleStates = {};
      dbModules.forEach((mod) => {
        moduleStates[mod.moduleId] = {
          enabled: mod.enabled,
          settings: mod.settings,
        };
      });

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

// Get specific module
router.get(
  "/:guildId/modules/:moduleId",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, moduleId } = req.params;

    try {
      const guildModule = await GuildModule.findOne({ guildId, moduleId });

      if (!guildModule) {
        return res.json({ guildId, moduleId, enabled: false, settings: {} });
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

// Toggle module
router.post(
  "/:guildId/modules/:moduleId/toggle/:userId/:userName",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId, moduleId, userId, userName } = req.params;
    const { enabled } = req.body;

    try {
      let guildModule = await GuildModule.findOne({ guildId, moduleId });

      if (guildModule) {
        guildModule.enabled = enabled;
        guildModule.updatedAt = new Date();
        await guildModule.save();
      } else {
        guildModule = new GuildModule({ guildId, moduleId, enabled });
        await guildModule.save();
      }

      const changeLog = new ChangeLog({
        guildId,
        moduleId,
        user: { id: userId, name: userName },
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

// Update module settings
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

    const toReadable = (key) =>
      key
        .replace(/([A-Z])/g, " $1")
        .replace(/(\d+)/g, " $1")
        .toLowerCase()
        .trim()
        .replace(/[_-]/g, " ")
        .replace(/\s+/g, " ");

    const compareObjects = (oldObj, newObj, changes, path = []) => {
      const allKeys = new Set([
        ...Object.keys(oldObj || {}),
        ...Object.keys(newObj || {}),
      ]);

      for (const key of allKeys) {
        const oldVal = oldObj?.[key];
        const newVal = newObj?.[key];
        const currentPath = [...path, key];

        if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

        if (
          typeof newVal === "object" &&
          newVal !== null &&
          !Array.isArray(newVal) &&
          typeof oldVal === "object" &&
          oldVal !== null &&
          !Array.isArray(oldVal)
        ) {
          compareObjects(oldVal, newVal, changes, currentPath);
        } else {
          const readablePath = currentPath.map(toReadable).join(" ");
          if (oldVal === undefined || oldVal === "" || oldVal === null) {
            changes.push(`set ${readablePath}`);
          } else if (newVal === undefined || newVal === "" || newVal === null) {
            changes.push(`removed ${readablePath}`);
          } else {
            changes.push(`changed ${readablePath}`);
          }
        }
      }
    };

    const buildDescription = (changes) => {
      if (changes.length === 0) return "No changes made";
      if (changes.length === 1) return `Updated: ${changes[0]}`;
      if (changes.length === 2)
        return `Updated: ${changes[0]} and ${changes[1]}`;
      if (changes.length <= 5) {
        const last = changes.pop();
        return `Updated: ${changes.join(", ")}, and ${last}`;
      }
      return `Updated ${changes.length} settings`;
    };

    try {
      let guildModule = await GuildModule.findOne({ guildId, moduleId });
      let changeDescription;

      if (guildModule) {
        const changes = [];
        compareObjects(guildModule.settings || {}, settings, changes);
        changeDescription = buildDescription(changes);

        guildModule.settings = settings;
        guildModule.updatedAt = new Date();
        await guildModule.save();
      } else {
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
            ? `Initial configuration (${configuredCount} setting${configuredCount !== 1 ? "s" : ""})`
            : "Initial configuration";

        guildModule = new GuildModule({
          guildId,
          moduleId,
          enabled: false,
          settings,
        });
        await guildModule.save();
      }

      const changeLog = new ChangeLog({
        guildId,
        moduleId,
        user: { id: userId, name: userName },
        description: changeDescription,
      });
      await changeLog.save();

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

module.exports = router;
