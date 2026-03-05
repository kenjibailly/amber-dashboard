const { EmbedBuilder } = require("discord.js");
const userExchangeData = require("../../helpers/userExchangeData");
const getWalletConfig = require("../../helpers/getWalletConfig");
const getRewards = require("../../helpers/getRewards");
const cancelThread = require("../../helpers/cancelThread");
const AwardedReward = require("../../models/AwardedReward");
const checkRequiredBalance = require("../../helpers/checkRequiredBalance");
const checkPermissions = require("../../helpers/checkPermissions");
const GuildModule = require("../../models/GuildModule");

async function addChannelMenu(interaction) {
  await interaction.deferReply();
  const guildId = interaction.guildId;
  const userId = interaction.member.user.id;
  const key = `${userId}_${interaction.channelId}`;

  userExchangeData.set(key, {
    threadId: interaction.channelId,
    name: "addChannelChooseChannel",
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      "Reply with the name for your new channel.\nOnly lowercase letters, numbers, hyphens and underscores are allowed.",
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

async function addChannelChooseChannel(message, exchangeData) {
  const channelName = message.content.trim().toLowerCase();
  const guildId = message.guild.id;
  const key = `${message.author.id}_${exchangeData.threadId}`;

  const validationError = validateChannelName(channelName);
  if (validationError) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(`${validationError}\nPlease try again.`)
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return; // just return, don't cancel or delete
  }

  // Fetch categories
  const guild = message.guild;
  const categories = [...guild.channels.cache.values()]
    .filter((ch) => ch.type === 4)
    .sort((a, b) => a.position - b.position)
    .map((ch, index) => ({ index: index + 1, id: ch.id, name: ch.name }));

  if (categories.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription("No categories found in this server.")
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

  userExchangeData.set(key, {
    ...exchangeData,
    name: "addChannelChooseCategory",
    channelName,
    categories,
  });

  const categoryList = categories
    .map((c) => `**${c.index}.** ${c.name}`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      `Choose a category by replying with its number:\n\n${categoryList}`,
    )
    .setColor("Green");

  await message.channel.send({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 4, label: "Cancel", custom_id: "cancel-thread" },
        ],
      },
    ],
  });
}

async function addChannelChooseCategory(message, exchangeData) {
  const guildId = message.guild.id;
  const key = `${message.author.id}_${exchangeData.threadId}`;
  const input = message.content.trim();
  const chosenIndex = parseInt(input);

  if (
    isNaN(chosenIndex) ||
    chosenIndex < 1 ||
    chosenIndex > exchangeData.categories.length
  ) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        `Invalid choice. Please reply with a number between 1 and ${exchangeData.categories.length}.`,
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

  const chosenCategory = exchangeData.categories[chosenIndex - 1];

  // Check if emoji prefix is enabled
  const economyModule = await GuildModule.findOne({
    guildId,
    moduleId: "economy",
  });
  const channelNameConfig = economyModule?.settings?.channelName;
  const useEmojiPrefix = channelNameConfig?.useEmojiPrefix || false;

  if (useEmojiPrefix) {
    // Ask for emoji
    userExchangeData.set(key, {
      ...exchangeData,
      name: "addChannelChooseEmoji",
      categoryId: chosenCategory.id,
      categoryName: chosenCategory.name,
      channelNameConfig,
    });

    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        "Reply with the emoji you want to use as a prefix for your channel.",
      )
      .setColor("Green");

    await message.channel.send({
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 4, label: "Cancel", custom_id: "cancel-thread" },
          ],
        },
      ],
    });
  } else {
    // Skip emoji step, go straight to confirm
    userExchangeData.set(key, {
      ...exchangeData,
      name: "addChannelConfirm",
      categoryId: chosenCategory.id,
      categoryName: chosenCategory.name,
      channelNameConfig,
      emoji: null,
    });

    await showConfirmation(message, {
      ...exchangeData,
      categoryId: chosenCategory.id,
      categoryName: chosenCategory.name,
      channelNameConfig,
      emoji: null,
    });
  }
}

async function addChannelChooseEmoji(message, exchangeData) {
  const guildId = message.guild.id;
  const key = `${message.author.id}_${exchangeData.threadId}`;
  const input = message.content.trim();

  // Accept standard emoji
  const standardEmojiMatch = input.match(/^\p{Extended_Pictographic}/u);

  if (!standardEmojiMatch) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        "That doesn't look like a valid emoji. Please reply with an emoji.",
      )
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return;
  }

  const emoji = input.match(/^\p{Emoji}/u)?.[0];

  userExchangeData.set(key, {
    ...exchangeData,
    name: "addChannelConfirm",
    emoji,
  });

  await showConfirmation(message, { ...exchangeData, emoji });
}

async function showConfirmation(message, data) {
  const guildId = message.guild.id;

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
        "Could not find the rewards, please contact your administrator",
      )
      .setColor("Red");
    return message.reply({ embeds: [embed] });
  }

  if (walletConfig instanceof EmbedBuilder) {
    await message.reply({ embeds: [walletConfig] });
    await cancelThread({
      guildId,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

  const reward = rewards.find((r) => r.id === "addChannel");

  // Build the preview channel name
  const previewName = buildChannelName(
    data.channelName,
    data.emoji,
    data.channelNameConfig,
  );

  const key = `${message.author.id}_${data.threadId}`;
  userExchangeData.set(key, {
    ...data,
    name: "addChannelExchange",
    rewardPrice: reward.price,
    tokenEmoji: walletConfig.tokenEmoji,
    previewName,
  });

  const descriptionLines = [
    `Do you want to add this custom channel?`,
    data.emoji ? `Channel emoji: ${data.emoji}` : null,
    `Channel name: \`${previewName}\``,
    `Channel category: **${data.categoryName}**`,
    `This will deduct **${reward.price}** ${walletConfig.tokenEmoji} from your wallet.`,
  ]
    .filter(Boolean)
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(descriptionLines)
    .setColor("Green");

  const buttonComponent = {
    type: 2,
    style: 1,
    label: "Exchange",
    emoji: {
      name: walletConfig.settings.wallet.tokenEmoji.emojiName,
      id: walletConfig.settings.wallet.tokenEmoji.emoji,
    },
    custom_id: "shop_addChannel_exchange",
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

// Not called from router, called internally
async function addChannelConfirm(message, exchangeData) {
  // This step is handled inside addChannelChooseCategory and addChannelChooseEmoji
  // via showConfirmation — this function exists for router compatibility
  await showConfirmation(message, exchangeData);
}

async function addChannelExchange(interaction) {
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
      "MANAGE_CHANNELS",
      guild,
    );
    if (permissionCheck) {
      await interaction.editReply({ embeds: [permissionCheck] });
      await cancelThread(interaction);
      return;
    }

    // Create the channel
    const newChannel = await guild.channels.create({
      name: user_exchange_data.previewName,
      type: 0, // text channel
      parent: user_exchange_data.categoryId,
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
        { guildId, awardedUserId: userId, reward: "addChannel" },
        {
          userId,
          value: user_exchange_data.previewName,
          reward: "addChannel",
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
        `Your channel <#${newChannel.id}> has been created in **${user_exchange_data.categoryName}**!\n` +
          `You now have **${wallet.amount}** ${user_exchange_data.tokenEmoji} in your wallet.`,
      )
      .setColor("Green");

    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);

    // Post to parent channel
    const parentChannel = thread.parent;
    if (parentChannel) {
      const parentEmbed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(
          `<@${userId}> has added a new channel <#${newChannel.id}> in **${user_exchange_data.categoryName}**.`,
        )
        .setColor("Green");
      await parentChannel.send({ embeds: [parentEmbed] });
    }
  } catch (error) {
    logger.error("Error creating channel:", error);

    let title = "Channel Creation Error";
    let description =
      "I could not create the channel. Your wallet has not been affected.";

    if (error.code === 50013) {
      title = "Permission Error";
      description =
        "I don't have permission to create channels in that category. Your wallet has not been affected.";
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);
  }
}

function buildChannelName(channelName, emoji, channelNameConfig) {
  let prefix = "";

  const hasEmoji = channelNameConfig?.useEmojiPrefix && emoji;
  const hasSeparator =
    channelNameConfig?.useSeparator && channelNameConfig?.separator;

  if (hasEmoji) {
    prefix += emoji;
  }

  if (hasSeparator) {
    prefix += channelNameConfig.separator;
  }

  return prefix + channelName;
}

function validateChannelName(channelName) {
  const maxLength = 100;
  const validCharacters = /^[a-z0-9_-]+$/;

  if (channelName.length === 0) return "Channel name cannot be empty.";
  if (channelName.length > maxLength)
    return `Channel name cannot be longer than ${maxLength} characters.`;
  if (!validCharacters.test(channelName)) {
    return "Channel name contains invalid characters. Only lowercase letters, numbers, hyphens, and underscores are allowed.";
  }

  return null;
}

module.exports = {
  addChannelMenu,
  addChannelChooseChannel,
  addChannelChooseCategory,
  addChannelChooseEmoji,
  addChannelConfirm,
  addChannelExchange,
};
