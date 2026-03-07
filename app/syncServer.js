const deployCommands = require("./deploy-commands");

module.exports = function registerSyncRoute(app) {
  app.post("/sync-commands", async (req, res) => {
    const { guildId, secret } = req.body;
    if (secret !== process.env.SYNC_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      await deployCommands(guildId);
      res.json({ success: true });
    } catch (err) {
      logger.error("Failed to sync commands:", err);
      res.status(500).json({ error: "Failed to sync commands" });
    }
  });
};
