const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const BrawldleDaily = require("../models/BrawldleDaily");
const { getTodayUTC } = require("../schedulers/brawldleScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brawldle")
    .setDescription("Play Brawldle — guess today's mystery brawler!"),

  async execute(interaction) {
    const today = getTodayUTC();
    const totalDays = await BrawldleDaily.countDocuments().catch(() => 0);

    // discord.js doesn't support LAUNCH_ACTIVITY yet so we use raw REST
    await interaction.client.rest.post(
      `/interactions/${interaction.id}/${interaction.token}/callback`,
      {
        body: {
          type: 12, // LAUNCH_ACTIVITY
          data: {},
        },
      },
    );
  },
};
