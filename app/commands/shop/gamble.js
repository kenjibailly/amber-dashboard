const { EmbedBuilder } = require("discord.js");
const getWalletConfig = require("../../helpers/getWalletConfig");
const GuildModule = require("../../models/GuildModule");
const Wallet = require("../../models/Wallet");
const checkRequiredBalance = require("../../helpers/checkRequiredBalance");
const Gamble = require("../../models/Gamble");
const cancelThread = require("../../helpers/cancelThread");

async function gambleMenu(interaction) {
  await interaction.deferReply();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  try {
    const walletConfig = await getWalletConfig(interaction.client, guildId);
    const economyModule = await GuildModule.findOne({
      guildId,
      moduleId: "economy",
    });
    const gambleSettings = economyModule.settings.gamble;

    const wallet = await Wallet.findOne({ guildId, userId });

    let description = `Click on one of the currency icons below to gamble.`;
    if (wallet) {
      description += `\nYou currently have ${wallet.amount} ${walletConfig.tokenEmoji}${walletConfig.settings.wallet.extraCurrency.enabled && gambleSettings.extraCurrency.enabled ? ` and ${wallet.extraAmount} ${walletConfig.extraTokenEmoji}` : ""}.`;
    } else {
      const embed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription("You don't have a wallet yet, please try again later.")
        .setColor("Red");
      await editReply({ embeds: [embed] });
      return await cancelThread(interaction);
    }
    if (gambleSettings.currency.enabled) {
      description += `\n\nGamble 1 ${walletConfig.tokenEmoji} for a chance to double it. Odds are 50/50.`;
    }

    if (gambleSettings.extraCurrency.enabled) {
      description += `\nGamble 1 ${walletConfig.extraTokenEmoji} for a chance to double it. Odds are 50/50.`;
    }
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(description)
      .setColor("Green");

    const buttonComponent = [
      {
        type: 2, // Button type
        style: 1, // Primary style
        label: "Exchange",
        emoji: {
          id: walletConfig.tokenEmojiObject.id,
          name: walletConfig.tokenEmojiObject.name,
        },
        custom_id: `shop_gamble_currency_exchange`,
      },
    ];

    if (
      walletConfig.settings.wallet.extraCurrency.enabled &&
      gambleSettings.extraCurrency.enabled
    ) {
      buttonComponent.push({
        type: 2, // Button type
        style: 1, // Primary style
        label: "Exchange",
        emoji: {
          id: walletConfig.extraTokenEmojiObject.id,
          name: walletConfig.extraTokenEmojiObject.name,
        },
        custom_id: `shop_gamble_extraCurrency_exchange`,
      });
    }

    await interaction.editReply({
      embeds: [embed],
      components: [
        {
          type: 1, // Action row type
          components: buttonComponent, // Add the button component
        },
      ],
    });
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Shop Error")
      .setDescription("Something went wrong, please try again later.")
      .setColor("Red");
    await interaction.editReply({ embeds: [embed] });
    return await cancelThread(interaction);
  }
}

async function gambleCurrencyExchange(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const client = interaction.client;
  await interaction.deferReply();
  const channelId = interaction.channel.id;

  try {
    const guild = await client.guilds.fetch(guildId);
    const thread = await guild.channels.fetch(channelId);

    const balance = await checkRequiredBalance(interaction, client, 1, thread);
    if (!balance) throw new Error("checkRequiredBalance error");

    const updateGambleCheck = await updateGamble(
      interaction,
      guildId,
      userId,
      "default",
    );
    if (!updateGambleCheck) return;
    await sendGambleResult(interaction, guildId, userId, "default");
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Shop Error")
      .setDescription("Something went wrong, please try again later.")
      .setColor("Red");
    interaction.editReply({ embeds: [embed] });
    return await cancelThread(interaction);
  }
}

async function gambleExtraCurrencyExchange(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const client = interaction.client;
  await interaction.deferReply();
  const channelId = interaction.channel.id;

  try {
    const guild = await client.guilds.fetch(guildId);
    const thread = await guild.channels.fetch(channelId);

    const balance = await checkRequiredBalance(
      interaction,
      client,
      1,
      thread,
      "extra",
    );
    if (!balance) return;

    const updateGambleCheck = await updateGamble(
      interaction,
      guildId,
      userId,
      "extra",
    );
    if (!updateGambleCheck) return;
    await sendGambleResult(interaction, guildId, userId, "extra");
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Shop Error")
      .setDescription("Something went wrong, please try again later.")
      .setColor("Red");
    interaction.editReply({ embeds: [embed] });
    return await cancelThread(interaction);
  }
}

async function updateGamble(interaction, guildId, userId, currency) {
  try {
    const dateNow = Date.now();

    const economyModule = await GuildModule.findOne({
      guildId,
      moduleId: "economy",
    });

    const gamble = await Gamble.findOne({ guildId, userId });

    const cooldownDays =
      currency === "default"
        ? Number(economyModule.settings.gamble.currency.cooldownDays)
        : Number(economyModule.settings.gamble.extraCurrency.cooldownDays);

    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

    const lastUsed =
      currency === "default" ? gamble?.currency : gamble?.extraCurrency;

    if (lastUsed && dateNow - lastUsed < cooldownMs) {
      const remaining = cooldownMs - (dateNow - lastUsed);
      const hours = Math.ceil(remaining / (1000 * 60 * 60));

      const embed = new EmbedBuilder()
        .setTitle("Gamble Cooldown")
        .setDescription(
          `You must wait **${hours} hours** before gambling again.`,
        )
        .setColor("Orange");

      await interaction.editReply({ embeds: [embed], components: [] });
      await cancelThread(interaction);
      return false;
    }

    // update timestamp
    if (currency === "default") {
      await Gamble.findOneAndUpdate(
        { guildId, userId },
        { $set: { currency: dateNow }, $setOnInsert: { guildId, userId } },
        { upsert: true },
      );
    } else {
      await Gamble.findOneAndUpdate(
        { guildId, userId },
        { $set: { extraCurrency: dateNow }, $setOnInsert: { guildId, userId } },
        { upsert: true },
      );
    }

    return true;
  } catch (error) {
    logger.error("Failed to save gamble:", error);

    const embed = new EmbedBuilder()
      .setTitle("Shop Error")
      .setDescription("Something went wrong, please try again later.")
      .setColor("Red");

    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);
    return false;
  }
}

function calculateOdds() {
  return Math.random() < 0.5;
}

async function sendGambleResult(interaction, guildId, userId, currency) {
  try {
    const gambleResult = calculateOdds();
    const walletConfig = await getWalletConfig(interaction.client, guildId);
    let description;
    let color;
    const wallet = await Wallet.findOne({ guildId, userId });
    if (gambleResult) {
      if (currency === "default") {
        wallet.amount += 1;
        description = `Congratulations you won!\nYou now have ${wallet.amount} ${walletConfig.tokenEmoji}.`;
        color = "Green";
      } else if (currency === "extra") {
        wallet.extraAmount += 1;
        description = `Congratulations you won!\nYou now have ${wallet.extraAmount} ${walletConfig.extraTokenEmoji}.`;
        color = "Green";
      }
    } else {
      if (currency === "default") {
        wallet.amount -= 1;
        description = `You lost, better luck next time!\nYou now have ${wallet.amount} ${walletConfig.tokenEmoji}.`;
        color = "Red";
      } else if (currency === "extra") {
        wallet.extraAmount -= 1;
        description = `You lost, better luck next time!\nYou now have ${wallet.extraAmount} ${walletConfig.extraTokenEmoji}.`;
        color = "Red";
      }
    }
    await wallet.save();
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(description)
      .setColor(color);
    await interaction.editReply({ embeds: [embed] });
    await cancelThread(interaction);

    const guild = await interaction.client.guilds.fetch(guildId);
    const thread = await guild.channels.fetch(interaction.channel.id);

    // Post to parent channel
    const parentChannel = thread.parent;
    if (parentChannel) {
      const parentEmbed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(
          `<@${userId}> has gambled and ${gambleResult ? `won` : `lost`} ${currency === "default" ? `1 ${walletConfig.tokenEmoji}` : `1 ${walletConfig.extraTokenEmoji}`}!`,
        )
        .setColor(color);
      await parentChannel.send({ embeds: [parentEmbed] });
    }
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Shop Error")
      .setDescription("Something went wrong, please try again later.")
      .setColor("Red");
    await interaction.editReply({ embeds: [embed] });
    return await cancelThread(interaction);
  }
}

module.exports = {
  gambleMenu,
  gambleCurrencyExchange,
  gambleExtraCurrencyExchange,
};
