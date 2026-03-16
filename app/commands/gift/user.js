const Wallet = require("../../models/Wallet");
const GiftLog = require("../../models/GiftLog");
const GuildModule = require("../../models/GuildModule");
const getWalletConfig = require("../../helpers/getWalletConfig");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const userExchangeData = require("../../helpers/userExchangeData");

// Returns the end of today (UTC) or end of current month (UTC)
function getResetDate(period) {
  const now = new Date();
  if (period === "day") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
  } else {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }
}

function periodLabel(period) {
  return period === "day" ? "daily" : "monthly";
}

async function giftUser(interaction) {
  await interaction.deferReply({ flags: 64 });

  const { guildId } = interaction;
  const senderId = interaction.user.id;
  const targetUser = interaction.options.getUser("user");
  const amount = interaction.options.getInteger("amount") ?? 0;
  const extraAmount = interaction.options.getInteger("extra_amount") ?? 0;
  const reason = interaction.options.getString("reason");

  if (!targetUser) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Invalid Input")
          .setDescription("Please specify a valid user.")
          .setColor("Red"),
      ],
    });
  }

  if (targetUser.id === senderId) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Invalid Input")
          .setDescription("You cannot gift yourself.")
          .setColor("Red"),
      ],
    });
  }

  if (amount <= 0 && extraAmount <= 0) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Invalid Input")
          .setDescription(
            "Please provide at least an amount or an extra amount to gift.",
          )
          .setColor("Red"),
      ],
    });
  }

  try {
    // ── Check gift module is enabled ───────────────────────────
    const giftModule = await GuildModule.findOne({
      guildId,
      moduleId: "gift",
      enabled: true,
    });

    if (!giftModule) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Gifting Disabled")
            .setDescription("Gifting has not been enabled for this server.")
            .setColor("Red"),
        ],
      });
    }

    const giftSettings = giftModule.settings || {};
    const currencyLimitSettings = giftSettings.currencyLimit || {};
    const extraCurrencyLimitSettings = giftSettings.extraCurrencyLimit || {};

    const period = currencyLimitSettings.period || "day";
    const extraPeriod = extraCurrencyLimitSettings.period || "day";

    // ── Get wallet config ──────────────────────────────────────
    const config = await getWalletConfig(interaction.client, guildId);
    if (config.data) {
      return interaction.editReply({ embeds: [config] });
    }

    const { tokenEmoji, extraTokenEmoji } = config;
    const extraCurrencyActive = config.settings.wallet.extraCurrency.enabled;

    // ── Check sender wallet ────────────────────────────────────
    const senderWallet = await Wallet.findOne({ userId: senderId, guildId });

    if (amount > 0 && (!senderWallet || senderWallet.amount < amount)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Insufficient Balance")
            .setDescription(
              `You don't have enough ${tokenEmoji} to gift **${amount}**.\nYour balance: **${senderWallet?.amount ?? 0}** ${tokenEmoji}`,
            )
            .setColor("Red"),
        ],
      });
    }

    if (
      extraCurrencyActive &&
      extraAmount > 0 &&
      (senderWallet?.extraAmount ?? 0) < extraAmount
    ) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Insufficient Balance")
            .setDescription(
              `You don't have enough ${extraTokenEmoji} to gift **${extraAmount}**.\nYour balance: **${senderWallet?.extraAmount ?? 0}** ${extraTokenEmoji}`,
            )
            .setColor("Red"),
        ],
      });
    }

    // ── Check gift limits ──────────────────────────────────────
    let giftLog = await GiftLog.findOne({ userId: senderId, guildId });

    // Use the shorter period for the shared reset date
    const shortestPeriod =
      period === "day" || extraPeriod === "day" ? "day" : "month";

    if (!giftLog || new Date() >= giftLog.resetDate) {
      if (giftLog) {
        giftLog.amountGifted = 0;
        giftLog.extraAmountGifted = 0;
        giftLog.resetDate = getResetDate(shortestPeriod);
        giftLog.period = shortestPeriod;
      } else {
        giftLog = new GiftLog({
          userId: senderId,
          guildId,
          amountGifted: 0,
          extraAmountGifted: 0,
          resetDate: getResetDate(shortestPeriod),
          period: shortestPeriod,
        });
      }
      await giftLog.save();
    }

    // Check currency limit
    if (amount > 0 && currencyLimitSettings.amount > 0) {
      let limit = currencyLimitSettings.amount;
      if (currencyLimitSettings.type === "percent") {
        limit = Math.floor(((senderWallet?.amount ?? 0) * limit) / 100);
      }
      const remaining = limit - giftLog.amountGifted;
      if (amount > remaining) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Gift Limit Reached")
              .setDescription(
                `You can only gift **${remaining}** more ${tokenEmoji} this ${period}.\nYour ${periodLabel(period)} limit is **${limit}** ${tokenEmoji}.`,
              )
              .setColor("Red"),
          ],
        });
      }
    }

    // Check extra currency limit
    if (
      extraCurrencyActive &&
      extraAmount > 0 &&
      extraCurrencyLimitSettings.amount > 0
    ) {
      let extraLimit = extraCurrencyLimitSettings.amount;
      if (extraCurrencyLimitSettings.type === "percent") {
        extraLimit = Math.floor(
          ((senderWallet?.extraAmount ?? 0) * extraLimit) / 100,
        );
      }
      const extraRemaining = extraLimit - giftLog.extraAmountGifted;
      if (extraAmount > extraRemaining) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Gift Limit Reached")
              .setDescription(
                `You can only gift **${extraRemaining}** more ${extraTokenEmoji} this ${extraPeriod}.\nYour ${periodLabel(extraPeriod)} limit is **${extraLimit}** ${extraTokenEmoji}.`,
              )
              .setColor("Red"),
          ],
        });
      }
    }

    // ── Store pending gift data ────────────────────────────────
    const key = `${senderId}_gift_${targetUser.id}`;
    userExchangeData.set(key, {
      targetUserId: targetUser.id,
      amount,
      extraAmount,
      reason,
    });

    // ── Send confirmation embed ────────────────────────────────
    const confirmDescription =
      `You are about to gift <@${targetUser.id}>:\n\n` +
      (amount > 0 ? `**${amount}** ${tokenEmoji}` : "") +
      (extraCurrencyActive && extraAmount > 0
        ? `${amount > 0 ? " and " : ""}**${extraAmount}** ${extraTokenEmoji}`
        : "") +
      (reason ? `\n\n**Reason:** ${reason}` : "") +
      `\n\nThis will be deducted from your wallet. Are you sure?`;

    const confirmEmbed = new EmbedBuilder()
      .setTitle("Confirm Gift")
      .setDescription(confirmDescription)
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gift_confirm:${senderId}:${targetUser.id}`)
        .setLabel("Yes, gift!")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`gift_cancel:${senderId}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.editReply({
      embeds: [confirmEmbed],
      components: [row],
    });
  } catch (error) {
    logger.error("Error during gift operation:", error);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription("An error occurred while processing the request.")
          .setColor("Red"),
      ],
    });
  }
}

async function handleGiftConfirm(interaction) {
  await interaction.deferUpdate();

  const parts = interaction.customId.split(":");
  const senderId = parts[1];
  const targetUserId = parts[2];

  if (interaction.user.id !== senderId) {
    return interaction.followUp({
      content: "This confirmation is not for you.",
      flags: 64,
    });
  }

  const key = `${senderId}_gift_${targetUserId}`;
  const data = userExchangeData.get(key);

  if (!data) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Expired")
          .setDescription(
            "This gift confirmation has expired. Please run the command again.",
          )
          .setColor("Red"),
      ],
      components: [],
    });
  }

  userExchangeData.delete(key);

  const { amount, extraAmount, reason } = data;
  const { guildId } = interaction;

  try {
    const config = await getWalletConfig(interaction.client, guildId);
    if (config.data) {
      return interaction.editReply({ embeds: [config], components: [] });
    }

    const { tokenEmoji, extraTokenEmoji } = config;
    const extraCurrencyActive = config.settings.wallet.extraCurrency.enabled;

    const giftModule = await GuildModule.findOne({
      guildId,
      moduleId: "gift",
      enabled: true,
    });

    const giftSettings = giftModule?.settings || {};
    const period = giftSettings.currencyLimit?.period || "day";
    const extraPeriod = giftSettings.extraCurrencyLimit?.period || "day";
    const shortestPeriod =
      period === "day" || extraPeriod === "day" ? "day" : "month";

    // ── Deduct from sender ─────────────────────────────────────
    const senderWallet = await Wallet.findOne({ userId: senderId, guildId });

    if (amount > 0 && (!senderWallet || senderWallet.amount < amount)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Insufficient Balance")
            .setDescription("Your balance has changed. Gift cancelled.")
            .setColor("Red"),
        ],
        components: [],
      });
    }

    if (amount > 0) {
      senderWallet.amount -= amount;
    }
    if (extraCurrencyActive && extraAmount > 0) {
      senderWallet.extraAmount = (senderWallet.extraAmount ?? 0) - extraAmount;
    }
    await senderWallet.save();

    // ── Add to receiver ────────────────────────────────────────
    let receiverWallet = await Wallet.findOne({
      userId: targetUserId,
      guildId,
    });
    if (!receiverWallet) {
      receiverWallet = new Wallet({
        userId: targetUserId,
        guildId,
        amount: 0,
        extraAmount: 0,
      });
    }
    if (amount > 0) receiverWallet.amount += amount;
    if (extraCurrencyActive && extraAmount > 0) {
      receiverWallet.extraAmount =
        (receiverWallet.extraAmount ?? 0) + extraAmount;
    }
    await receiverWallet.save();

    // ── Update gift log ────────────────────────────────────────
    let giftLog = await GiftLog.findOne({ userId: senderId, guildId });
    if (!giftLog || new Date() >= giftLog.resetDate) {
      giftLog = giftLog || new GiftLog({ userId: senderId, guildId });
      giftLog.amountGifted = 0;
      giftLog.extraAmountGifted = 0;
      giftLog.resetDate = getResetDate(shortestPeriod);
      giftLog.period = shortestPeriod;
    }
    if (amount > 0) giftLog.amountGifted += amount;
    if (extraCurrencyActive && extraAmount > 0) {
      giftLog.extraAmountGifted += extraAmount;
    }
    await giftLog.save();

    // ── Build embeds ───────────────────────────────────────────
    const giftDescription =
      `<@${senderId}> gifted <@${targetUserId}>:\n\n` +
      (amount > 0 ? `**${amount}** ${tokenEmoji}` : "") +
      (extraCurrencyActive && extraAmount > 0
        ? `${amount > 0 ? " and " : ""}**${extraAmount}** ${extraTokenEmoji}`
        : "") +
      (reason ? `\n\n**Reason:** ${reason}` : "");

    const announcementEmbed = new EmbedBuilder()
      .setTitle("Gift Sent!")
      .setDescription(giftDescription)
      .setColor("Green");

    const confirmationEmbed = new EmbedBuilder()
      .setTitle("Gift Sent!")
      .setDescription(
        giftDescription +
          `\n\nYour new balance: **${senderWallet.amount}** ${tokenEmoji}` +
          (extraCurrencyActive
            ? ` and **${senderWallet.extraAmount ?? 0}** ${extraTokenEmoji}`
            : ""),
      )
      .setColor("Green");

    await interaction.editReply({
      embeds: [confirmationEmbed],
      components: [],
    });

    // ── Post announcement ──────────────────────────────────────
    const announcementChannelId = giftSettings.announcementChannelId;
    if (announcementChannelId) {
      try {
        const announcementChannel = await interaction.guild.channels.fetch(
          announcementChannelId,
        );
        if (announcementChannel) {
          await announcementChannel.send({ embeds: [announcementEmbed] });
        }
      } catch (_) {
        await interaction.channel.send({ embeds: [announcementEmbed] });
      }
    } else {
      await interaction.channel.send({ embeds: [announcementEmbed] });
    }
  } catch (error) {
    logger.error("Error during gift confirm:", error);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Error")
          .setDescription("An error occurred while processing the gift.")
          .setColor("Red"),
      ],
      components: [],
    });
  }
}

async function handleGiftCancel(interaction) {
  await interaction.deferUpdate();

  const senderId = interaction.customId.split(":")[1];

  if (interaction.user.id !== senderId) {
    return interaction.followUp({
      content: "This confirmation is not for you.",
      flags: 64,
    });
  }

  // Clean up pending data
  for (const [k] of userExchangeData) {
    if (k.startsWith(`${senderId}_gift_`)) userExchangeData.delete(k);
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Gift Cancelled")
        .setDescription("Your gift has been cancelled.")
        .setColor("Grey"),
    ],
    components: [],
  });
}

module.exports = { giftUser, handleGiftConfirm, handleGiftCancel };
