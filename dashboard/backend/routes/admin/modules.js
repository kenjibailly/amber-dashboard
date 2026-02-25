const express = require("express");
const router = express.Router();
const AdminModule = require("../../models/AdminModule");
const { requireAuth } = require("./middleware");

const availableModules = [
  {
    id: "status",
    title: "Amber Status",
    description: "Set a status for Amber.",
    category: "admin",
  },
];

// Get all global admin modules
router.get("/modules", requireAuth, async (req, res) => {
  try {
    const dbModules = await AdminModule.find();

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

// Get specific global module
router.get("/modules/:moduleId", requireAuth, async (req, res) => {
  const { moduleId } = req.params;

  try {
    const adminModule = await AdminModule.findOne({ moduleId });

    if (!adminModule) {
      return res.json({ moduleId, enabled: false, settings: {} });
    }

    res.json({
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

// Toggle global module
router.post("/modules/:moduleId/toggle", requireAuth, async (req, res) => {
  const { moduleId } = req.params;
  const { enabled } = req.body;

  try {
    let adminModule = await AdminModule.findOne({ moduleId });

    if (adminModule) {
      adminModule.enabled = enabled;
      adminModule.updatedAt = new Date();
      await adminModule.save();
    } else {
      adminModule = new AdminModule({ moduleId, enabled });
      await adminModule.save();
    }

    console.log(`Admin module ${moduleId} set to ${enabled}`);

    res.json({ success: true, moduleId, enabled, updatedAt: adminModule.updatedAt });
  } catch (err) {
    console.error("Error toggling module:", err);
    res.status(500).json({ error: "Failed to toggle module" });
  }
});

// Update global module settings
router.put("/modules/:moduleId/settings", requireAuth, async (req, res) => {
  const { moduleId } = req.params;
  const { settings } = req.body;

  console.log(`Update settings - Admin Module: ${moduleId}`, settings);

  try {
    const adminModule = await AdminModule.findOneAndUpdate(
      { moduleId },
      { $set: { settings, updatedAt: new Date() }, $setOnInsert: { enabled: false } },
      { upsert: true, new: true },
    );

    res.json({ success: true, moduleId, settings: adminModule.settings, updatedAt: adminModule.updatedAt });
  } catch (err) {
    console.error("Error updating module settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

module.exports = router;
