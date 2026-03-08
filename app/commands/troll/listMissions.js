const GuildModule = require("../../models/GuildModule");
const { EmbedBuilder } = require("discord.js");
const defaultTrollMissions = require("../../config/trollMissions.json");

async function listMissions(interaction) {
  await interaction.deferReply({ flags: 64 });
  const guildId = interaction.guildId;
  try {
    const economyModule = await GuildModule.findOne({
      guildId,
      moduleId: "economy",
    });
    if (!economyModule.enabled) {
      const embed = new EmbedBuilder()
        .setTitle("Economy")
        .setDescription("Economy has not been enabled on this server.")
        .setColor("Red");
      return await interaction.editReply({ embeds: [embed] });
    }

    let trollMissions = [];
    if (economyModule.settings.trollMissions) {
      trollMissions = economyModule.settings.trollMissions;
    } else {
      trollMissions = defaultTrollMissions;
    }

    let trollMissionsList = [];

    trollMissions.forEach((mission) => {
      // Create a field for each troll_mission
      trollMissionsList.push({
        name: mission.title,
        value: mission.description
          ? mission.description
          : "No description available",
        inline: false, // You can set this to `true` to display fields inline
      });
    });

    const embed = new EmbedBuilder()
      .setTitle("Troll Missions")
      .setDescription("These are all the troll missions:\n\u200B\n")
      .setColor("Green");
    embed.addFields(trollMissionsList); // Add the fields to the embed

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Error Troll Missions")
      .setDescription("Could not find the troll missions.")
      .setColor("Red");
    await interaction.editReply({ embeds: [embed] });
  }
}

module.exports = listMissions;
