const { Events } = require("discord.js");
const { setupAppEmojis } = require("../utilities/setupEmojis");
const { cacheAppEmojis } = require("../utilities/cacheAppEmojis");
const { startStatusScheduler } = require("../schedulers/statusScheduler");
const kickInactiveVCUser = require("../helpers/kickInactiveVCUser");
const {
  startRewardExpiryScheduler,
} = require("../schedulers/rewardExpiryScheduler");
const { startBrawldleScheduler } = require("../schedulers/brawldleScheduler");
const startDailyBrawlerPollScheduler = require("../schedulers/dailyBrawlerPoll");
const {
  startBrawldleMonthlyScheduler,
  runMonthlyPayout,
} = require("../schedulers/brawldleMonthlyScheduler");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}!`);
    startRewardExpiryScheduler(client);

    // Start schedulers
    startStatusScheduler(client);

    // Setup app emojis
    await setupAppEmojis(client);

    await cacheAppEmojis(client);

    await kickInactiveVCUser(client);

    startDailyBrawlerPollScheduler(client);

    startBrawldleScheduler();

    startBrawldleMonthlyScheduler(client);
  },
};
