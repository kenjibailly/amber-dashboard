// commands/tickets.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const GuildModule = require("../models/GuildModule");
const { EmbedBuilder } = require("discord.js");
const handleCreateTicketButton = require("./handlers/tickets/createTicket");
const handleCancelTicketButton = require("./handlers/tickets/cancelTicket");
const handleCompleteTicketButton = require("./handlers/tickets/completeTicket");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Manage ticket system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("send")
        .setDescription("Send the ticket creation message")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // restrict to staff/admins

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "send") {
      await interaction.deferReply({ ephemeral: true });

      try {
        // Get settings from database
        const module = await GuildModule.findOne({
          guildId: interaction.guildId,
          moduleId: "tickets",
        });

        if (!module || !module.enabled) {
          const embed = new EmbedBuilder()
            .setTitle("Tickets")
            .setDescription(
              "❌ Tickets module is not enabled. Enable it from the dashboard first."
            )
            .setColor("Red");
          await interaction.editReply({
            embeds: [embed],
          });
          return;
        }

        if (!module.settings.channelId) {
          const embed = new EmbedBuilder()
            .setTitle("Tickets")
            .setDescription(
              "❌ No channel configured. Set it up in the dashboard first."
            )
            .setColor("Red");
          await interaction.editReply({
            embeds: [embed],
          });
          return;
        }

        const channel = interaction.guild.channels.cache.get(
          module.settings.channelId
        );

        if (!channel) {
          const embed = new EmbedBuilder()
            .setTitle("Tickets")
            .setDescription("❌ Configured channel not found.")
            .setColor("Red");
          await interaction.editReply({
            embeds: [embed],
          });
          return;
        }

        const description =
          module.settings.ticketsMessage ||
          "Do you have a request, an idea, suggestion or do you have to report something?\nPlease create a ticket and one of the staff members will help you.";

        const embed = new EmbedBuilder()
          .setTitle("Tickets")
          .setDescription(description)
          .setColor("Green");

        const buttonComponent = {
          type: 2,
          style: 1,
          label: "Create",
          emoji: { name: "🎫" },
          custom_id: "tickets_create",
        };

        await channel.send({
          embeds: [embed],
          components: [
            {
              type: 1,
              components: [buttonComponent],
            },
          ],
        });

        const replyEmbed = new EmbedBuilder()
          .setTitle("Tickets")
          .setDescription(`✅ Ticket message sent to <#${channel.id}>!`)
          .setColor("Green");

        await interaction.editReply({
          embeds: [replyEmbed],
          flags: 64,
        });
      } catch (error) {
        console.error("Error sending ticket message:", error);
        const embed = new EmbedBuilder()
          .setTitle("Tickets")
          .setDescription("❌ Failed to send ticket message.")
          .setColor("Red");
        await interaction.editReply({
          embeds: [embed],
        });
      }
    }
  },

  async handleButton(interaction) {
    if (interaction.customId == "tickets_create") {
      handleCreateTicketButton(interaction);
    } else if (interaction.customId.startsWith("tickets_cancel")) {
      handleCancelTicketButton(interaction);
    } else if (interaction.customId.startsWith("tickets_complete")) {
      handleCompleteTicketButton(interaction);
    }
  },
};
