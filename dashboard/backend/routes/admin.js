const express = require("express");
const router = express.Router();
const AdminModule = require("../models/AdminModule");

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (
    !req.session.user ||
    req.session.user.id != process.env.VITE_DISCORD_ADMIN_ID
  ) {
    return res.status(403).json({ error: "Unauthorized" }); // Changed to JSON response
  }
  next();
}

router.get("/modules", requireAuth, async (req, res) => {
  try {
    const availableModules = [
      {
        id: "status",
        title: "Airona Status",
        description: "Set a status for Airona.",
        category: "admin",
      },
    ];

    // Get module states from database
    const dbModules = await AdminModule.find();

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
});

// Toggle module for a guild
router.post("/modules/:moduleId/toggle", requireAuth, async (req, res) => {
  const { moduleId } = req.params;
  const { enabled } = req.body;

  try {
    // Find or create the module document
    let adminModule = await AdminModule.findOne({ moduleId });

    if (adminModule) {
      // Update existing
      adminModule.enabled = enabled;
      adminModule.updatedAt = new Date();
      await adminModule.save();
    } else {
      // Create new
      adminModule = new AdminModule({
        moduleId,
        enabled,
      });
      await adminModule.save();
    }

    console.log(`Admin module ${moduleId} set to ${enabled}`);

    res.json({
      success: true,
      moduleId,
      enabled,
      updatedAt: adminModule.updatedAt,
    });
  } catch (err) {
    console.error("Error toggling module:", err);
    res.status(500).json({ error: "Failed to toggle module" });
  }
});

// Get specific module settings
router.get("/modules/:moduleId", requireAuth, async (req, res) => {
  const { moduleId } = req.params;

  try {
    let adminModule = await AdminModule.findOne({ moduleId });

    if (!adminModule) {
      // Return default state if not found
      return res.json({
        moduleId,
        enabled: false,
        settings: {},
      });
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

// Update module settings (for detailed settings page)
router.put("/modules/:moduleId/settings", requireAuth, async (req, res) => {
  const { moduleId } = req.params;
  const { settings } = req.body;

  console.log(`Update settings - Admin Module: ${moduleId}`, settings);

  try {
    let adminModule = await AdminModule.findOne({ moduleId });

    if (adminModule) {
      adminModule.settings = settings;
      adminModule.updatedAt = new Date();
      await adminModule.save();
    } else {
      // Create with settings
      adminModule = new AdminModule({
        moduleId,
        enabled: false,
        settings,
      });
      await adminModule.save();
    }

    res.json({
      success: true,
      moduleId,
      settings: adminModule.settings,
      updatedAt: adminModule.updatedAt,
    });
  } catch (err) {
    console.error("Error updating module settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

module.exports = router;
