const WalletConfig = require("../models/GuildModule");
const { EmbedBuilder } = require("discord.js");

async function getWalletConfig(guild_id) {
  try {
    const walletConfig = await WalletConfig.findOne({
      guildId: guild_id,
      moduleId: "economy",
    });

    let walletConfigSettings = walletConfig;

    if (!walletConfig) {
      const embed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription(
          "There was an error retrieving the wallet configuration. Please try again later.",
        )
        .setColor("Red");
      return embed;
    }

    if (walletConfig?.settings.wallet?.tokenEmoji?.isCustom) {
      walletConfigSettings.tokenEmoji = `<:${walletConfig.settings.wallet.tokenEmoji.emojiName}:${walletConfig.settings.wallet.tokenEmoji.emoji}>`;
    } else {
      walletConfigSettings.tokenEmoji =
        walletConfig.settings.wallet.tokenEmoji.emoji;
    }

    if (
      walletConfig?.settings?.wallet?.extraCurrency?.enabled &&
      walletConfig?.settings?.wallet?.extraCurrency?.tokenEmoji?.isCustom
    ) {
      walletConfigSettings.extraTokenEmoji = `<:${walletConfig.settings.wallet.extraCurrency.tokenEmoji.emojiName}:${walletConfig.settings.wallet.extraCurrency.tokenEmoji.emoji}>`;
    } else {
      walletConfigSettings.extraTokenEmoji =
        walletConfig.settings.wallet.extraCurrency.tokenEmoji.emoji;
    }
    return walletConfigSettings;
  } catch (error) {
    logger.error(`Error fetching wallet configuration:`, error);
    // Return an error embed for response

    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription(
        "There was an error retrieving the wallet configuration. Please try again later.",
      )
      .setColor("Red");
    return embed;
  }
}

module.exports = getWalletConfig;
