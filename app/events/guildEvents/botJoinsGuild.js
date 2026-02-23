const { EmbedBuilder } = require("discord.js");
const deployCommands = require("../../deploy-commands");

async function botJoinsGuild(client, guild) {
  const guildId = guild.id;

  try {
    await deployCommands(guildId);
  } catch (error) {
    logger.error("Deploy Commands Error:", error);

    const embed = new EmbedBuilder()
      .setTitle("Deploy Commands Error")
      .setDescription(
        "I could not deploy some slash commands. Please contact your administrator."
      )
      .setColor("Red"); // You can use a HEX code or Discord.js color string

    try {
      // Fetch the guild using the guild ID
      const fetchedGuild = await client.guilds.fetch(guildId);

      // Fetch the owner of the guild
      const owner = await fetchedGuild.fetchOwner();

      // Send the embed as a DM to the owner
      await owner.send({ embeds: [embed] });

      logger.success("Message sent to the server owner successfully.");
    } catch (sendError) {
      logger.error("Error sending message to the server owner:", sendError);
    }
  }
}

module.exports = botJoinsGuild;
