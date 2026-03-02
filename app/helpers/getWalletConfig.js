const WalletConfig = require("../models/GuildModule");
const { EmbedBuilder } = require("discord.js");

async function buildEmojiFormats(client, tokenEmoji) {
  if (!tokenEmoji) return { formatted: null, object: null };

  if (tokenEmoji.isCustom) {
    let emojiObject;

    // Try to fetch emoji from client cache first
    emojiObject = client.emojis.cache.find(
      (e) => e.name === tokenEmoji.emojiName,
    );

    // Fallback: try fetching from application emojis if not in cache
    if (!emojiObject && client.application) {
      try {
        const appEmojis = await client.application.emojis.fetch();
        emojiObject = appEmojis.find((e) => e.name === tokenEmoji.emojiName);
      } catch (err) {
        console.error("Failed to fetch application emojis:", err);
      }
    }

    if (emojiObject) {
      return {
        formatted: `<:${emojiObject.name}:${emojiObject.id}>`,
        object: emojiObject,
      };
    }

    // If we still don’t have it, just return the name
    return {
      formatted: `:${tokenEmoji.emojiName}:`,
      object: { name: tokenEmoji.emojiName },
    };
  }

  // Unicode emoji
  return { formatted: tokenEmoji.emoji, object: { name: tokenEmoji.emoji } };
}

async function getWalletConfig(client, guildId) {
  try {
    const walletConfig = await WalletConfig.findOne({
      guildId,
      moduleId: "economy",
    });

    if (!walletConfig) {
      return new EmbedBuilder()
        .setTitle("Error")
        .setDescription(
          "There was an error retrieving the wallet configuration. Please try again later.",
        )
        .setColor("Red");
    }

    const settings = walletConfig.settings.wallet;

    // ===============================
    // MAIN TOKEN EMOJI
    // ===============================
    if (!settings?.tokenEmoji?.emoji) {
      settings.tokenEmoji = {
        emojiName: "coin",
        isCustom: true,
      };
    }

    const mainEmoji = await buildEmojiFormats(client, settings.tokenEmoji);

    walletConfig.tokenEmoji = mainEmoji.formatted;
    walletConfig.tokenEmojiObject = mainEmoji.object;
    walletConfig.settings.wallet.tokenEmoji.emojiName = mainEmoji.object.name;
    walletConfig.settings.wallet.tokenEmoji.emoji = mainEmoji.object.id;

    // ===============================
    // EXTRA CURRENCY EMOJI
    // ===============================
    if (
      settings?.extraCurrency?.enabled &&
      !settings?.extraCurrency?.tokenEmoji?.emoji
    ) {
      settings.extraCurrency.tokenEmoji = {
        emojiName: "reward_extra",
        isCustom: true,
      };
    }

    if (settings?.extraCurrency?.enabled) {
      const extraEmoji = await buildEmojiFormats(
        client,
        settings.extraCurrency.tokenEmoji,
      );

      walletConfig.extraTokenEmoji = extraEmoji.formatted;
      walletConfig.extraTokenEmojiObject = extraEmoji.object;
      walletConfig.settings.wallet.extraCurrency.tokenEmoji.emojiName =
        mainEmoji.object.name;
      walletConfig.settings.wallet.extraCurrency.tokenEmoji.emoji =
        mainEmoji.object.id;
    }
    return walletConfig;
  } catch (error) {
    console.error("Error fetching wallet configuration:", error);

    return new EmbedBuilder()
      .setTitle("Error")
      .setDescription(
        "There was an error retrieving the wallet configuration. Please try again later.",
      )
      .setColor("Red");
  }
}

module.exports = getWalletConfig;
