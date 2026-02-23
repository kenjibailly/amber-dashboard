const express = require("express");
const router = express.Router();

// Middleware to verify internal API calls
const verifyInternalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];

  if (token !== process.env.INTERNAL_API_SECRET) {
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }

  next();
};

// Register commands for a specific guild
router.post(
  "/register-commands/:guildId",
  verifyInternalAuth,
  async (req, res) => {
    const { guildId } = req.params;
    const { commandName } = req.body;

    try {
      // Access the Discord client from your app
      const client = req.app.get("discordClient"); // You'll need to set this in your main bot file

      if (!client || !client.isReady()) {
        return res.status(503).json({ error: "Bot is not ready" });
      }

      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      // Trigger command registration
      const registerGuildCommands = require("../deploy-commands");
      await registerGuildCommands(guildId);

      logger.success(`Registered commands for guild ${guildId}`);

      res.json({
        success: true,
        message: `Commands registered for guild ${guildId}`,
        commandName,
      });
    } catch (error) {
      logger.error(`Error registering commands for guild ${guildId}:`, error);
      res.status(500).json({ error: "Failed to register commands" });
    }
  }
);

// Health check endpoint
router.get("/health", verifyInternalAuth, (req, res) => {
  const client = req.app.get("discordClient");
  res.json({
    status: "ok",
    botReady: client?.isReady() || false,
    guilds: client?.guilds?.cache?.size || 0,
  });
});

module.exports = router;
