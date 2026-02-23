const Tickets = require("../../../models/Tickets");
const GuildModule = require("../../../models/GuildModule");
const cancelThread = require("../../../helpers/cancelThread");
const { EmbedBuilder } = require("discord.js");

async function handleCompleteTicketButton(interaction) {
  const ticketId = interaction.customId.split(":")[1];
  try {
    const guildModule = await GuildModule.findOne({
      guildId: interaction.guildId,
      moduleId: "tickets",
    });

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isAdmin = member.permissions.has("Administrator");
    const isStaff =
      guildModule.settings?.roleId &&
      member.roles.cache.has(guildModule.settings.roleId);

    if (!isAdmin && !isStaff) {
      const title = "Ticket";
      const description = "❌ Only a staff member can complete this ticket.";
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor("Red");
      await interaction.reply({ embeds: [embed], flags: 64 });
      return;
    }

    // ✅ Continue with ticket completion logic here...
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Tickets")
      .setDescription("❌ An error occurred while verifying your permissions.")
      .setColor("Red");
    await interaction.reply({
      embeds: [embed],
      flags: 64,
    });
  }

  try {
    const ticket = await Tickets.findOne({ _id: ticketId });
    if (!ticket) {
      const title = "Ticket";
      const description = `Ticket could not be found, please try again later.`;
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor("Red");
      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const user = await interaction.client.users
      .fetch(ticket.userId)
      .catch(() => null);

    if (user) {
      try {
        const title = "Ticket";
        const description = `🎫 Your ticket has been completed by **${interaction.user.globalName}**.\n\n**Ticket:**\n${ticket.reason}`;
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor("Green");

        // ✅ Send embed to the ticket creator
        await interaction.reply({ embeds: [embed], flags: 64 });
        await user.send({ embeds: [embed] });

        // ✅ Notify server administrator
        try {
          const user = await interaction.client.users.fetch(ticket.userId);
          const guildOwner = await interaction.guild.fetchOwner();

          const title = "Ticket";
          const description = `🎫 A ticket from **${user.globalName}** has been completed by **${interaction.user.globalName}**.\n\n**Ticket:**\n${ticket.reason}`;
          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor("Green");

          await guildOwner.send({ embeds: [embed] });
        } catch (error) {
          console.warn(`Failed to notify server admin: ${error.message}`);
        }
      } catch (err) {
        logger.error(`Failed to DM user ${ticket.userId}: ${err.message}`);
      }
    } else {
      logger.error(`User ${ticket.userId} could not be fetched.`);
    }

    // Delete the ticket from the database
    await Tickets.deleteOne({ _id: ticketId });
    await cancelThread(interaction);
  } catch (error) {
    logger.error(error);
    const title = "Ticket";
    const description = `Something went wrong while completing the ticket, please try again later.`;
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Red");
    await interaction.reply({ embeds: [embed], flags: 64 });
  }
}

module.exports = handleCompleteTicketButton;
