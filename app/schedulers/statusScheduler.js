const cron = require("node-cron");
const AdminModule = require("../models/AdminModule");
const { ActivityType } = require("discord.js");

async function handleSetStatus(client) {
  try {
    const statusModule = await AdminModule.findOne({ moduleId: "status" });
    let status;
    if (statusModule.enabled) {
      status = statusModule.settings.statusMessage;
    } else {
      status = "";
    }

    client.user.setPresence({
      activities: [
        {
          type: ActivityType.Custom,
          name: status,
          state: status,
        },
      ], // Custom status message
      status: "online", // Bot status (can be 'online', 'idle', 'dnd', 'invisible')
    });
  } catch (error) {
    logger.error("Set Status Error:", error);
  }
}

function startStatusScheduler(client) {
  // Run every minute to check if we need to send notifications
  cron.schedule("* * * * *", async () => {
    await handleSetStatus(client);
  });

  logger.success("Status scheduler started");
}

module.exports = { startStatusScheduler };
