const Wallet = require("../../models/Wallet");
const getWalletConfig = require("../../helpers/getWalletConfig");
const { EmbedBuilder } = require("discord.js");

async function deductUser(interaction) {
  await interaction.deferReply();

  const { member, guildId } = interaction;
  const userId = interaction.options.getUser("user")?.id;
  const amount = interaction.options.getInteger("amount");
  const extraAmount = interaction.options.getInteger("extra_amount");
  const reason = interaction.options.getString("reason");

  if (!userId || !amount) {
    const embed = new EmbedBuilder()
      .setTitle("Invalid Input")
      .setDescription("User ID or amount is missing.")
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

    let wallet = await Wallet.findOne({ userId, guildId });
    if (!wallet) {
      const embed = new EmbedBuilder()
        .setTitle("Wallet Not Found")
        .setDescription(`<@${userId}> does not have a wallet yet.`)
        .setColor("Red");
      await interaction.editReply({ embeds: [embed], flags: 64 });
      return;
    }

    // Deduct amounts safely
    wallet.amount = Math.max(0, wallet.amount - amount);
    if (extraCurrencyActive) {
      wallet.extraAmount = Math.max(
        0,
        (wallet.extraAmount || 0) - (extraAmount ?? 0),
      );
    }

    await wallet.save();

    const embed = new EmbedBuilder()
      .setTitle("Wallet Updated")
      .setDescription(
        `<@${member.user.id}> deducted **${amount}** ${tokenEmoji}` +
          (extraCurrencyActive
            ? ` and **${extraAmount ?? 0}** ${extraTokenEmoji}`
            : "") +
          ` from <@${userId}>.\n` +
          `New balance: **${wallet.amount}** ${tokenEmoji}` +
          (extraCurrencyActive
            ? ` and **${wallet.extraAmount}** ${extraTokenEmoji}`
            : "") +
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

module.exports = deductUser;
