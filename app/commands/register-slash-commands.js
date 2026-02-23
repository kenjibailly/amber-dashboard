const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const deployCommands = require("../deploy-commands");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register-slash-commands")
    .setDescription(
      "Register your new slash commands when you have updated the bot!"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // restrict to staff/admins
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guild.id;

    // Double-check permissions (in case the bot missed it)
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      const embed = new EmbedBuilder()
        .setTitle("Slash Commands")
        .setDescription("❌ Failed to redeploy slash commands!")
        .setColor("Red");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      await deployCommands(guildId);
      const embed = new EmbedBuilder()
        .setTitle("Slash Commands")
        .setDescription("✅ Slash commands successfully redeployed!")
        .setColor("Green");
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error deploying commands:", error);
      const embed = new EmbedBuilder()
        .setTitle("Slash Commands")
        .setDescription("❌ Failed to redeploy slash commands!")
        .setColor("Red");
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
