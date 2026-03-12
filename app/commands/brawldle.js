const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const BrawldleDaily = require("../models/BrawldleDaily");
const { getTodayUTC } = require("../schedulers/brawldleScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brawldle")
    .setDescription("Play Brawldle — guess today's mystery brawler!"),

  async execute(interaction) {
    try {
      await interaction.client.rest.post(
        `/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          body: {
            type: 12,
            data: {},
          },
        },
      );
    } catch (err) {
      console.error("Failed to launch activity:", err);
      await interaction
        .reply({
          content: "Failed to launch Brawldle. Please try again.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
