const express = require("express");
const router = express.Router();
const axios = require("axios");
const CustomCommand = require("../../models/CustomCommand");
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

const triggerCommandRegistration = async (guildId, commandName) => {
  try {
    await axios.post(
      `${process.env.BOT_API_URL}/api/bot/register-commands/${guildId}`,
      { guildId, commandName },
      {
        headers: {
          Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log(`Triggered command registration for guild ${guildId}`);
  } catch (error) {
    console.error(`Error registering bot command /${commandName}:`, error);
    // Don't fail the request if command registration fails
  }
};

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

// Get specific custom command
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

      if (!customCommand)
        return res.status(404).json({ error: "Custom command not found" });

      res.json(customCommand);
    } catch (err) {
      console.error("Error fetching custom command:", err);
      res.status(500).json({ error: "Failed to fetch custom command" });
    }
  },
);

// Create custom command
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

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "custom command",
        user: { id: userId, name: userName },
        description: `${name} created`,
      });
      await changeLog.save();

      await triggerCommandRegistration(guildId, command);

      res.json({ success: true, customCommand });
    } catch (err) {
      console.error("Error creating custom command:", err);
      res.status(500).json({ error: "Failed to create custom command" });
    }
  },
);

// Update custom command
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
      if (!customCommand)
        return res.status(404).json({ error: "Custom command not found" });

      const changes = [];
      if (customCommand.name !== name)
        changes.push(`changed name to "${name}"`);
      if (customCommand.description !== description)
        changes.push(`changed description to "${description}"`);
      if (customCommand.tagUser !== tagUser)
        changes.push(`changed tagUser to "${tagUser}"`);
      if (
        JSON.stringify((customCommand.allowedRoles || []).sort()) !==
        JSON.stringify((allowedRoles || []).sort())
      ) {
        changes.push("changed allowed roles");
      }

      customCommand.name = name;
      customCommand.description = description;
      customCommand.command = command;
      customCommand.replies = replies;
      customCommand.allowedRoles = allowedRoles || [];
      customCommand.embedColor = embedColor;
      customCommand.tagUser = tagUser;
      customCommand.updatedAt = new Date();
      await customCommand.save();

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "custom command",
        user: { id: userId, name: userName },
        description: buildDescription(changes),
        metadata: {
          customCommandId: customCommand._id,
          customCommandName: name,
        },
      });
      await changeLog.save();

      await triggerCommandRegistration(guildId, command);

      res.json({ success: true, customCommand });
    } catch (err) {
      console.error("Error updating custom command:", err);
      res.status(500).json({ error: "Failed to update custom command" });
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
      if (!customCommand)
        return res.status(404).json({ error: "Custom command not found" });

      const commandName = customCommand.command;
      const displayName = customCommand.name;
      await customCommand.deleteOne();

      const changeLog = new ChangeLog({
        guildId,
        moduleId: "custom command",
        user: { id: userId, name: userName },
        description: `${displayName} deleted`,
      });
      await changeLog.save();

      await triggerCommandRegistration(guildId, commandName);

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting custom command:", err);
      res.status(500).json({ error: "Failed to delete custom command" });
    }
  },
);

module.exports = router;
