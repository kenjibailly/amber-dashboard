const express = require("express");
const router = express.Router();
const { requireAuth, checkGuildPermission } = require("./middleware");
const axios = require("axios");

router.post(
  "/:guildId/sync-commands",
  requireAuth,
  checkGuildPermission,
  async (req, res) => {
    const { guildId } = req.params;
    try {
      await axios.post(`${process.env.BOT_SYNC_URL}/sync-commands`, {
        guildId,
        secret: process.env.SYNC_SECRET,
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Failed to sync commands:", err);
      res.status(500).json({ error: "Failed to sync commands" });
    }
  },
);

module.exports = router;
