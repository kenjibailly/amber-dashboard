const Wallet = require("../../models/Wallet");
const getWalletConfig = require("../../helpers/getWalletConfig");
const { EmbedBuilder } = require("discord.js");

async function awardRole(interaction) {
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
    // Fetch wallet config
    const config = await getWalletConfig(interaction.client, guildId);

    if (config.data) {
      await interaction.editReply({ embeds: [config], flags: 64 });
      return;
    }

    const { tokenEmoji, extraTokenEmoji } = config;
    const extraCurrencyActive = config.settings.wallet.extraCurrency.enabled;

    // Fetch all members with the role
    await guild.members.fetch(); // Ensure cache is populated
    const roleMembers = role.members.map((m) => m.id);

    if (!roleMembers.length) {
      const embed = new EmbedBuilder()
        .setTitle("No Members")
        .setDescription(`No members have the role ${role.name}.`)
        .setColor("Red");
      await interaction.editReply({ embeds: [embed], flags: 64 });
      return;
    }

    const updatedMembers = [];

    for (const userId of roleMembers) {
      let wallet = await Wallet.findOne({ userId, guildId });

      if (!wallet) {
        wallet = new Wallet({
          userId,
          guildId,
          amount,
          extraAmount: extraCurrencyActive ? (extraAmount ?? 0) : 0,
        });
        await wallet.save();
      } else {
        wallet.amount += amount;
        if (extraCurrencyActive) {
          wallet.extraAmount = (wallet.extraAmount || 0) + (extraAmount ?? 0);
        }
        await wallet.save();
      }

      updatedMembers.push(wallet);
    }

    const embed = new EmbedBuilder()
      .setTitle("Wallets Updated")
      .setDescription(
        `<@${member.user.id}> awarded **${amount}** ${tokenEmoji}` +
          (extraCurrencyActive
            ? ` and **${extraAmount ?? 0}** ${extraTokenEmoji}`
            : "") +
          ` to all members with the role ${role.name}.\n` +
          `Total members updated: **${roleMembers.length}**` +
          (reason ? `\n\nReason: **${reason}**` : ""),
      )
      .setColor("Green");

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error during wallet operation:", error);
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("An error occurred while processing the request.")
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], flags: 64 });
  }
}

module.exports = awardRole;
