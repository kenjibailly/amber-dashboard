const Wallet = require("../../models/Wallet");
const getWalletConfig = require("../../helpers/getWalletConfig");
const { EmbedBuilder } = require("discord.js");

async function awardUser(interaction) {
  await interaction.deferReply();
  // Extract IDs
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
    // Fetch wallet config
    const config = await getWalletConfig(interaction.client, guildId);

    // Handle config errors returned as an embed
    if (config.data) {
      await interaction.editReply({ embeds: [config], flags: 64 });
      return;
    }

    // Destructure main and extra token settings
    const { tokenEmoji, extraTokenEmoji } = config;
    const extraCurrencyActive = config.settings.wallet.extraCurrency.enabled;

    // Fetch or create wallet
    let wallet = await Wallet.findOne({ userId, guildId });

    if (!wallet) {
      wallet = new Wallet({
        userId,
        guildId,
        amount,
        extraAmount: extraCurrencyActive ? (extraAmount ?? 0) : 0,
      });
      await wallet.save();

      const description =
        `<@${member.user.id}> awarded **${amount}** ${tokenEmoji}` +
        (extraCurrencyActive ? ` and **${amount}** ${extraTokenEmoji}` : "") +
        ` to <@${userId}>.\n` +
        `New balance: **${wallet.amount}** ${tokenEmoji}` +
        (extraCurrencyActive
          ? ` and **${wallet.extraAmount}** ${extraTokenEmoji}`
          : "") +
        (reason ? `\n\nReason: **${reason}**` : "");

      const embed = createEmbed("Wallet Created", description, "");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Update existing wallet
    wallet.amount += amount;
    if (extraCurrencyActive) {
      wallet.extraAmount = (wallet.extraAmount || 0) + (extraAmount ?? 0);
    }

    await wallet.save();

    const description =
      `<@${member.user.id}> awarded **${amount}** ${tokenEmoji}` +
      (extraCurrencyActive
        ? ` and **${extraAmount ?? 0}** ${extraTokenEmoji}`
        : "") +
      ` to <@${userId}>.\n` +
      `New balance: **${wallet.amount}** ${tokenEmoji}` +
      (extraCurrencyActive
        ? ` and **${wallet.extraAmount}** ${extraTokenEmoji}`
        : "") +
      (reason ? `\n\nReason: **${reason}**` : "");
    const embed = new EmbedBuilder()
      .setTitle("Wallet Updated")
      .setDescription(description)
      .setColor("Green");
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error("Error during wallet operation:", error);
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("An error occurred while processing the request.")
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], flags: 64 });
  }
}

module.exports = awardUser;
