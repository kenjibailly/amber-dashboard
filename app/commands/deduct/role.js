const Wallet = require("../../models/Wallet");
const getWalletConfig = require("../../helpers/getWalletConfig");
const { EmbedBuilder } = require("discord.js");

async function deductRole(interaction) {
  await interaction.deferReply();

  const { member, guildId, guild } = interaction;
  const role = interaction.options.getRole("role");
  const amount = interaction.options.getInteger("amount");
  const extraAmount = interaction.options.getInteger("extra_amount");
  const reason = interaction.options.getString("reason");

  if (!role || !amount) {
    const embed = new EmbedBuilder()
      .setTitle("Invalid Input")
      .setDescription("Role or amount is missing.")
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], flags: 64 });
    return;
  }

  try {
    const config = await getWalletConfig(interaction.client, guildId);
    if (config.data) {
      await interaction.editReply({ embeds: [config], flags: 64 });
      return;
    }

    const { tokenEmoji, extraTokenEmoji } = config;
    const extraCurrencyActive = config.settings.wallet.extraCurrency.enabled;

    // Ensure guild members are cached
    await guild.members.fetch();
    const roleMembers = role.members.map((m) => m.id);

    if (!roleMembers.length) {
      const embed = new EmbedBuilder()
        .setTitle("No Members")
        .setDescription(`No members have the role ${role.name}.`)
        .setColor("Red");
      await interaction.editReply({ embeds: [embed], flags: 64 });
      return;
    }

    for (const userId of roleMembers) {
      let wallet = await Wallet.findOne({ userId, guildId });
      if (!wallet) continue;

      wallet.amount = Math.max(0, wallet.amount - amount);
      if (extraCurrencyActive) {
        wallet.extraAmount = Math.max(
          0,
          (wallet.extraAmount || 0) - (extraAmount ?? 0),
        );
      }

      await wallet.save();
    }

    const embed = new EmbedBuilder()
      .setTitle("Wallets Updated")
      .setDescription(
        `<@${member.user.id}> deducted **${amount}** ${tokenEmoji}` +
          (extraCurrencyActive
            ? ` and **${extraAmount ?? 0}** ${extraTokenEmoji}`
            : "") +
          ` from all members with the role ${role.name}.\n` +
          `Total members updated: **${roleMembers.length}**` +
          (reason ? `\n\nReason: **${reason}**` : ""),
      )
      .setColor("Orange");

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error during wallet deduction:", error);
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("An error occurred while processing the request.")
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], flags: 64 });
  }
}

module.exports = deductRole;
