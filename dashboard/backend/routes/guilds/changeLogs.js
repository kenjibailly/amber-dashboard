const express = require("express");
const router = express.Router();
const ChangeLog = require("../../models/ChangeLog");
const { requireAuth, checkGuildPermission } = require("./middleware");

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
      const totalLogs = await ChangeLog.countDocuments({ guildId });
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

module.exports = router;
