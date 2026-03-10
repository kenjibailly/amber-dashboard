const { ChannelType } = require("discord.js");
const brawlers = require("../config/brawlers.json");
const GuildModule = require("../models/GuildModule");
const cron = require("node-cron");

function startDailyBrawlerPollScheduler(client) {
  // Runs every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      await dailyBrawlerPoll(client);
    } catch (err) {
      logger.error("Daily brawler poll scheduler failed:", err);
    }
  });

  logger.info("Daily Brawler Poll scheduler started.");
}

function getTwoRandomBrawlers(brawlers) {
  const shuffled = [...brawlers].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}

async function dailyBrawlerPoll(client) {
  try {
    const polls = await GuildModule.find({
      moduleId: "dailybrawlerpoll",
      enabled: true,
    });

    for (const poll of polls) {
      const { guildId } = poll;
      const { channelId, lastPollDate } = poll.settings;

      const now = new Date();
      const twentyFourHoursMinus5Min = 24 * 60 * 60 * 1000 - 5 * 60 * 1000;

      const needsPoll =
        !lastPollDate ||
        now - new Date(lastPollDate) >= twentyFourHoursMinus5Min;

      if (!needsPoll) continue;

      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) continue;

      const channel = await guild.channels.fetch(channelId).catch(() => null);

      if (!channel || channel.type !== ChannelType.GuildText) {
        console.warn(`Invalid channel for guild ${guildId}`);
        continue;
      }

      const [char1, char2] = getTwoRandomBrawlers(brawlers.brawlers);

      await channel.send({
        poll: {
          question: { text: "Who's your favorite?" },
          answers: [{ text: char1.name }, { text: char2.name }],
          allowMultiSelect: false,
          duration: 24,
        },
      });

      await GuildModule.updateOne(
        { _id: poll._id },
        { $set: { "settings.lastPollDate": now } },
      );
    }
  } catch (err) {
    logger.error("❌ Failed to send daily brawler polls:", err);
  }
}

module.exports = startDailyBrawlerPollScheduler;
