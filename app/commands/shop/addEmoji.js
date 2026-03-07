const { EmbedBuilder } = require("discord.js");
const userExchangeData = require("../../helpers/userExchangeData");
const getWalletConfig = require("../../helpers/getWalletConfig");
const getRewards = require("../../helpers/getRewards");
const cancelThread = require("../../helpers/cancelThread");
const AwardedReward = require("../../models/AwardedReward");
const checkRequiredBalance = require("../../helpers/checkRequiredBalance");
const checkPermissions = require("../../helpers/checkPermissions");

// Valid emoji name: 2-32 chars, only letters, numbers, underscores
function validateEmojiName(name) {
  if (!name || name.length < 2)
    return "Emoji name must be at least 2 characters.";
  if (name.length > 32)
    return "Emoji name cannot be longer than 32 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return "Emoji name can only contain letters, numbers, and underscores.";
  }
  return null;
}

async function addEmojiMenu(interaction) {
  await interaction.deferReply();
  const userId = interaction.member.user.id;
  const key = `${userId}_${interaction.channelId}`;

  userExchangeData.set(key, {
    threadId: interaction.channelId,
    name: "addEmojiConfirm",
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      "Upload a picture or GIF and include the emoji name in your message.\n" +
        "Example: `cool_face` with an image attached.\n\n" +
        "Emoji name rules: 2–32 characters, letters, numbers and underscores only.",
    )
    .setColor("Green");

  await interaction.editReply({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 4, label: "Cancel", custom_id: "cancel-thread" },
        ],
      },
    ],
    flags: 64,
  });
}

async function addEmojiConfirm(message, exchangeData) {
  const guildId = message.guild.id;
  const userId = message.author.id;
  const key = `${userId}_${exchangeData.threadId}`;

  // Check image attachment
  const attachment = message.attachments.first();
  if (!attachment) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription("Please upload an image or GIF with your message.")
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return; // keep thread open so user can try again
  }

  // Validate it's an image or gif
  const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (attachment.contentType && !validTypes.includes(attachment.contentType)) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        "The uploaded file must be a PNG, JPEG, GIF, or WEBP image.",
      )
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return;
  }

  // Validate emoji name from message content
  const emojiName = message.content.trim();
  const validationError = validateEmojiName(emojiName);
  if (validationError) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(`${validationError}\nPlease try again.`)
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return;
  }

  // Check if server has emoji slots available
  const guild = message.guild;
  const emojis = await guild.emojis.fetch();
  const isAnimated = attachment.contentType === "image/gif";
  const animatedEmojis = emojis.filter((e) => e.animated);
  const staticEmojis = emojis.filter((e) => !e.animated);
  const emojiLimit =
    guild.premiumTier === 0
      ? 50
      : guild.premiumTier === 1
        ? 100
        : guild.premiumTier === 2
          ? 150
          : 250;

  if (isAnimated && animatedEmojis.size >= emojiLimit) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        `This server has reached its animated emoji limit (${emojiLimit}). No more animated emojis can be added.`,
      )
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    userExchangeData.delete(key);
    await cancelThread({
      guildId,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

  if (!isAnimated && staticEmojis.size >= emojiLimit) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        `This server has reached its static emoji limit (${emojiLimit}). No more static emojis can be added.`,
      )
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    userExchangeData.delete(key);
    await cancelThread({
      guildId,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

  // Get wallet config and reward price
  let walletConfig;
  let rewards;
  try {
    walletConfig = await getWalletConfig(message.client, guildId);
    rewards = await getRewards(walletConfig);
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Reward error")
      .setDescription(
        "Could not find the rewards, please contact your administrator.",
      )
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    userExchangeData.delete(key);
    await cancelThread({
      guildId,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

  if (walletConfig instanceof EmbedBuilder) {
    await message.reply({ embeds: [walletConfig] });
    userExchangeData.delete(key);
    await cancelThread({
      guildId,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

  const reward = rewards.find((r) => r.id === "addEmoji");

  // Store data and show confirmation
  userExchangeData.set(key, {
    ...exchangeData,
    name: "addEmojiConfirm",
    emojiName,
    emojiUrl: attachment.url,
    isAnimated,
    rewardPrice: reward.price,
    tokenEmoji: walletConfig.tokenEmoji,
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      `Do you want to add this custom emoji?\n` +
        `Emoji name: \`${emojiName}\`\n` +
        `Type: ${isAnimated ? "Animated GIF" : "Static"}\n` +
        `This will deduct **${reward.price}** ${walletConfig.tokenEmoji} from your wallet.`,
    )
    .setColor("Green");

  const buttonComponent = {
    type: 2,
    style: 1,
    label: "Exchange",
    emoji: {
      name: walletConfig.settings.wallet.tokenEmoji.emojiName,
      id: walletConfig.settings.wallet.tokenEmoji.emoji,
    },
    custom_id: "shop_addEmoji_exchange",
  };

  await message.channel.send({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          buttonComponent,
          { type: 2, style: 4, label: "Cancel", custom_id: "cancel-thread" },
        ],
      },
    ],
  });
}

async function addEmojiExchange(interaction) {
  try {
    await interaction.deferReply();

    const userId = interaction.member.user.id;
    const client = interaction.client;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const key = `${userId}_${channelId}`;

    const user_exchange_data = userExchangeData.get(key);
    userExchangeData.delete(key);

    const guild = await client.guilds.fetch(guildId);
    const thread = await guild.channels.fetch(channelId);

    const wallet = await checkRequiredBalance(
      interaction,
      client,
      user_exchange_data.rewardPrice,
      thread,
    );
    if (!wallet) return;

    const permissionCheck = await checkPermissions(
      client,
      "MANAGE_EMOJIS_AND_STICKERS",
      guild,
    );
    if (permissionCheck) {
      await interaction.editReply({ embeds: [permissionCheck] });
      await cancelThread(interaction);
      return;
    }

    // Create the emoji
    const newEmoji = await guild.emojis.create({
      attachment: user_exchange_data.emojiUrl,
      name: user_exchange_data.emojiName,
    });

    // Deduct wallet
    try {
      wallet.amount -= Number(user_exchange_data.rewardPrice);
      await wallet.save();
    } catch (error) {
      logger.error("Failed to save wallet:", error);
      const embed = new EmbedBuilder()
        .setTitle("Transaction Error")
        .setDescription(
          "There was an error processing your wallet transaction. Please try again later.",
        )
        .setColor("Red");
      await interaction.editReply({ embeds: [embed], components: [] });
      await cancelThread(interaction);
      return;
    }

    // Save to awarded rewards
    try {
      await AwardedReward.findOneAndUpdate(
        { guildId, awardedUserId: userId, reward: "addEmoji" },
        {
          userId,
          value: user_exchange_data.emojiName,
          reward: "addEmoji",
          date: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      logger.error("Error adding reward to DB:", error);
      const embed = new EmbedBuilder()
        .setTitle("Reward Database Error")
        .setDescription(
          "I could not add the reward to the database. Please contact the administrator.",
        )
        .setColor("Red");
      await interaction.editReply({ embeds: [embed], components: [] });
      await cancelThread(interaction);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        `Your emoji ${newEmoji} (\`:${newEmoji.name}:\`) has been added to the server!\n` +
          `You now have **${wallet.amount}** ${user_exchange_data.tokenEmoji} in your wallet.`,
      )
      .setColor("Green");

    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);

    const parentChannel = thread.parent;
    if (parentChannel) {
      const parentEmbed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(
          `<@${userId}> has added a new emoji ${newEmoji} (\`:${newEmoji.name}:\`) to the server.`,
        )
        .setColor("Green");
      await parentChannel.send({ embeds: [parentEmbed] });
    }
  } catch (error) {
    logger.error("Error creating emoji:", error);

    let title = "Emoji Creation Error";
    let description =
      "I could not create the emoji. Your wallet has not been affected.";

    if (error.code === 50013) {
      title = "Permission Error";
      description =
        "I don't have permission to manage emojis. Your wallet has not been affected.";
    } else if (error.code === 30008) {
      title = "Emoji Limit Reached";
      description =
        "The server has reached its emoji limit. Your wallet has not been affected.";
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);
  }
}

module.exports = { addEmojiMenu, addEmojiExchange, addEmojiConfirm };
