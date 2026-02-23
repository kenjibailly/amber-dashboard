const cancelThread = require("../../../helpers/cancelThread");
const Tickets = require("../../../models/Tickets");
const { EmbedBuilder } = require("discord.js");

async function handleCancelTicketButton(interaction) {
  const ticketId = interaction.customId.split(":")[1];

  try {
    const ticket = await Tickets.findOne({ _id: ticketId });

    if (!ticket) {
      const title = "Ticket";
      const description = `Ticket could not be found, please try again later.`;
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor("Red");
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return; // Add return to stop execution
    }
    const replyEmbed = new EmbedBuilder()
      .setTitle("Ticket")
      .setDescription("🔄 Cancelling ticket...")
      .setColor("Yellow");
    // Reply immediately to avoid timeout
    await interaction.reply({
      embeds: [replyEmbed],
      ephemeral: true,
    });

    const user = await interaction.client.users
      .fetch(ticket.userId)
      .catch(() => null);

    if (user) {
      try {
        const title = "Ticket";
        const description = `🎫 Your ticket has been cancelled by **${interaction.user.globalName}**.\n\n**Ticket:**\n${ticket.reason}`;
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor("Red");

        // Send DM to ticket creator
        await user.send({ embeds: [embed] }).catch((err) => {
          logger.error(`Failed to DM user ${ticket.userId}: ${err.message}`);
        });

        // Notify server administrator
        try {
          const guildOwner = await interaction.guild.fetchOwner();
          const adminTitle = "Ticket";
          const adminDescription = `🎫 A ticket from **${user.globalName}** has been cancelled by **${interaction.user.globalName}**.\n\n**Ticket:**\n${ticket.reason}`;
          const adminEmbed = new EmbedBuilder()
            .setTitle(adminTitle)
            .setDescription(adminDescription)
            .setColor("Red");

          await guildOwner.send({ embeds: [adminEmbed] }).catch((err) => {
            console.warn(`Failed to notify server admin: ${err.message}`);
          });
        } catch (error) {
          console.warn(`Failed to notify server admin: ${error.message}`);
        }
      } catch (err) {
        logger.error(`Failed to process ticket cancellation: ${err.message}`);
      }
    } else {
      logger.error(`User ${ticket.userId} could not be fetched.`);
    }

    // Delete the ticket from the database
    await Tickets.deleteOne({ _id: ticketId });
    await cancelThread(interaction);

    const embed = new EmbedBuilder()
      .setTitle("Ticket")
      .setDescription("✅ Ticket has been cancelled successfully.")
      .setColor("Green");
    // Update the initial reply with success message
    await interaction.editReply({
      embeds: [embed],
    });
  } catch (error) {
    logger.error(error);
    const title = "Ticket";
    const description = `Something went wrong while cancelling the ticket, please try again later.`;
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Red");

    // Check if we've already replied
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}

module.exports = handleCancelTicketButton;
