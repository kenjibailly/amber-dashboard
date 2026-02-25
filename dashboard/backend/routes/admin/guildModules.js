const express = require("express");
const router = express.Router();
const AdminModule = require("../../models/AdminModule");
const { requireAuth } = require("./middleware");

const availableModules = [
  {
    id: "joinleave",
    title: "Join Leave",
    description: "Let members join and leave certain channels using a secret command",
    category: "admin",
  },
];

// Get all modules for a guild
router.get("/guilds/:guildId/modules", requireAuth, async (req, res) => {
  const { guildId } = req.params;

  try {
    const dbModules = await AdminModule.find({ guildId });

    const moduleStates = {};
    dbModules.forEach((mod) => {
      moduleStates[mod.moduleId] = { enabled: mod.enabled, settings: mod.settings };
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
});

// Get specific guild module
router.get("/guilds/:guildId/modules/:moduleId", requireAuth, async (req, res) => {
  const { guildId, moduleId } = req.params;

  try {
    const adminModule = await AdminModule.findOne({ guildId, moduleId });

    if (!adminModule) {
      return res.json({ guildId, moduleId, enabled: false, settings: {} });
    }

    res.json({
      guildId: adminModule.guildId,
      moduleId: adminModule.moduleId,
      enabled: adminModule.enabled,
      settings: adminModule.settings,
      updatedAt: adminModule.updatedAt,
    });
  } catch (err) {
    console.error("Error fetching module:", err);
    res.status(500).json({ error: "Failed to fetch module" });
  }
});

// Toggle guild module
router.post("/guilds/:guildId/modules/:moduleId/toggle", requireAuth, async (req, res) => {
  const { guildId, moduleId } = req.params;
  const { enabled } = req.body;

  try {
    let adminModule = await AdminModule.findOne({ guildId, moduleId });

    if (adminModule) {
      adminModule.enabled = enabled;
      adminModule.updatedAt = new Date();
      await adminModule.save();
    } else {
      adminModule = new AdminModule({ guildId, moduleId, enabled });
      await adminModule.save();
    }

    console.log(`Admin module ${moduleId} for guild ${guildId} set to ${enabled}`);

    res.json({ success: true, guildId, moduleId, enabled, updatedAt: adminModule.updatedAt });
  } catch (err) {
    console.error("Error toggling module:", err);
    res.status(500).json({ error: "Failed to toggle module" });
  }
});

// Update guild module settings
router.put("/guilds/:guildId/modules/:moduleId/settings", requireAuth, async (req, res) => {
  const { guildId, moduleId } = req.params;
  const { settings } = req.body;

  console.log(`Update settings - Admin Module: ${moduleId} for Guild: ${guildId}`, settings);

  try {
    const adminModule = await AdminModule.findOneAndUpdate(
      { guildId, moduleId },
      { $set: { settings, guildId, updatedAt: new Date() }, $setOnInsert: { enabled: false } },
      { upsert: true, new: true },
    );

    res.json({ success: true, guildId, moduleId, settings: adminModule.settings, updatedAt: adminModule.updatedAt });
  } catch (err) {
    console.error("Error updating module settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

module.exports = router;
