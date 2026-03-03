const getWalletConfig = require("./getWalletConfig");
const Wallet = require("../models/Wallet");
const cancelThread = require("../helpers/cancelThread");
const { EmbedBuilder } = require("discord.js");

async function checkRequiredBalance(interaction, client, price, thread) {
  const guildId = interaction.guildId;
  const userId = interaction.member.user.id;
  const walletConfig = await getWalletConfig(interaction.client, guildId);
  // Check if we got an embed back instead of token emoji data
  if (walletConfig && walletConfig instanceof EmbedBuilder) {
    await interaction.editReply({ embeds: [walletConfig] });
    return;
  }

  try {
    // Fetch the wallet
    const wallet = await Wallet.findOne({
      userId,
      guildId,
    });
    if (!wallet) {
      const embed = new EmbedBuilder()
        .setTitle("Wallet")
        .setDescription("I could not find your wallet.")
        .setColor("Red");

      await thread.send({ embeds: [embed] });
      await cancelThread(interaction);
      return null;
    }

    // Check wallet balance
    if (wallet.amount < Number(price)) {
      const embed = new EmbedBuilder()
        .setTitle("Wallet")
        .setDescription(
          `You don't have enough ${tokenEmoji.token_emoji} to make this exchange.\n` +
            `You currently have **${wallet.amount}** ${walletConfig.token_Emoji} and you need **${price}** ${walletConfig.tokenEmoji}`,
        )
        .setColor("Orange");

      await thread.send({ embeds: [embed] });

      await cancelThread(interaction);
      return null;
    } else {
      return wallet;
    }
  } catch (error) {
    logger.error("Check Required Balance Error:", error);
    const embed = new EmbedBuilder()
      .setTitle("Wallet")
      .setDescription(
        "There was a problem getting your wallet balance, please try again later or contact your administrator.",
      )
      .setColor("Red");

    await thread.send({ embeds: [embed] });

    await cancelThread(interaction);
    return null;
  }
}

module.exports = checkRequiredBalance;
