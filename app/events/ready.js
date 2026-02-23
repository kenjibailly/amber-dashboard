const { Events } = require("discord.js");
const { setupAppEmojis } = require("../utilities/setupEmojis");
const { cacheAppEmojis } = require("../utilities/cacheAppEmojis");
const { startStatusScheduler } = require("../schedulers/statusScheduler");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}!`);

    // Start schedulers
    startStatusScheduler(client);

    // Setup app emojis
    await setupAppEmojis(client);

    await cacheAppEmojis(client);
  },
};
