const { EmbedBuilder } = require("discord.js");
const userExchangeData = require("../../helpers/userExchangeData");
const validateNicknameAndEmoji = require("../../helpers/validateNicknameAndEmoji");
const getWalletConfig = require("../../helpers/getWalletConfig");
const getRewards = require("../../helpers/getRewards");
const cancelThread = require("../../helpers/cancelThread");
const AwardedReward = require("../../models/AwardedReward");
const checkRequiredBalance = require("../../helpers/checkRequiredBalance");
const checkPermissions = require("../../helpers/checkPermissions");

async function changeOtherNicknameMenu(interaction) {
  await interaction.deferReply();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  try {
    const existingAwardedReward = await AwardedReward.findOne({
      guildId,
      awardedUserId: userId,
      reward: "changeOtherNickname",
    });

    if (existingAwardedReward) {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (existingAwardedReward.date > twentyFourHoursAgo) {
        const embed = new EmbedBuilder()
          .setTitle("Shop")
          .setDescription(
            "It hasn't been 24h yet since you last changed someone's nickname, please try again later.",
          )
          .setColor("Orange");
        await interaction.editReply({
          content: "",
          embeds: [embed],
          components: [],
        });
        await cancelThread(interaction);
        return;
      }
    }
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("Something went wrong, please try again later.")
      .setColor("Red");
    await interaction.editReply({ embeds: [embed] });
    await cancelThread(interaction);
    return;
  }

  const name = interaction.values[0].split("_")[1] + "ChooseUser";

  userExchangeData.set(interaction.member.user.id, {
    threadId: interaction.channelId,
    name,
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      "Reply with the username or mention the user whose nickname you want to change.",
    )
    .setColor("Green");

  await interaction.editReply({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 4,
            label: "Cancel",
            custom_id: "cancel-thread",
          },
        ],
      },
    ],
    flags: 64,
  });
}

async function changeOtherNicknameChooseUser(message, exchangeData) {
  const guildId = message.guild.id;
  const guild = message.guild;

  // Resolve user from mention or username
  let targetMember = null;

  const mentionMatch = message.content.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    targetMember = await guild.members.fetch(mentionMatch[1]).catch(() => null);
  } else {
    const username = message.content.trim().toLowerCase();
    const members = await guild.members.fetch();
    targetMember =
      members.find(
        (m) =>
          m.user.username.toLowerCase() === username ||
          m.user.globalName?.toLowerCase() === username ||
          m.nickname?.toLowerCase() === username,
      ) || null;
  }

  if (!targetMember) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        "Could not find that user. Please try again with a valid username or mention.",
      )
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    await cancelThread({
      guildId: message.guild.id,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

  // Update exchange data with target user and move to confirm step
  userExchangeData.set(message.author.id, {
    ...exchangeData,
    name: "changeOtherNicknameConfirm",
    targetUserId: targetMember.user.id,
    targetUserName: targetMember.user.globalName || targetMember.user.username,
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      `You selected **${targetMember.user.globalName || targetMember.user.username}**.\nReply with the new nickname you want to give them.`,
    )
    .setColor("Green");

  await message.channel.send({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 4,
            label: "Cancel",
            custom_id: "cancel-thread",
          },
        ],
      },
    ],
  });
}

async function changeOtherNicknameConfirm(message, exchangeData) {
  const newNickname = message.content.trim();
  const guildId = message.guild.id;

  const validationError = validateNicknameAndEmoji(newNickname);
  if (validationError) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(`${validationError}\nPlease try again.`)
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    await cancelThread({
      guildId: message.guild.id,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

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

  if (walletConfig && walletConfig instanceof EmbedBuilder) {
    await message.reply({ embeds: [walletConfig] });
    await cancelThread({
      guildId: message.guild.id,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

  const reward = rewards.find((r) => r.id === "changeOtherNickname");

  userExchangeData.set(message.author.id, {
    ...exchangeData,
    name: "changeOtherNicknameExchange",
    nickname: newNickname,
    rewardPrice: reward.price,
    tokenEmoji: walletConfig.tokenEmoji,
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      `Do you want to change **${exchangeData.targetUserName}**'s nickname to **${newNickname}**?\n` +
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
    custom_id: `shop_changeOtherNickname_exchange`,
  };

  await message.channel.send({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          buttonComponent,
          {
            type: 2,
            style: 4,
            label: "Cancel",
            custom_id: "cancel-thread",
          },
        ],
      },
    ],
  });
}

async function changeOtherNicknameExchange(interaction) {
  try {
    await interaction.deferReply();

    const userId = interaction.member.user.id;
    const client = interaction.client;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    const user_exchange_data = userExchangeData.get(userId);
    userExchangeData.delete(userId);

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
      "MANAGE_NICKNAMES",
      guild,
    );
    if (permissionCheck) {
      await interaction.editReply({ embeds: [permissionCheck] });
      await cancelThread(interaction);
      return;
    }

    const member = await guild.members.fetch(user_exchange_data.targetUserId);

    if (member.id === guild.ownerId) {
      const owner = await guild.fetchOwner();
      try {
        const embed = new EmbedBuilder()
          .setTitle("Change Nickname")
          .setDescription(
            `A nickname change was requested for you: \`\`\`${user_exchange_data.nickname}\`\`\`However, bots can't change the server owner's nickname. Please update it manually.`,
          )
          .setColor("Green");
        await owner.send({ embeds: [embed] });

        const embedUser = new EmbedBuilder()
          .setTitle("Shop")
          .setDescription(
            "The user is the server owner. I've sent them a DM requesting the nickname change.",
          )
          .setColor("Green");
        await interaction.editReply({ embeds: [embedUser], components: [] });
      } catch (error) {
        const embed = new EmbedBuilder()
          .setTitle("Error")
          .setDescription(
            "The user is the server owner, and I couldn't send them a DM",
          )
          .setColor("Red");
        await interaction.editReply({ embeds: [embed], components: [] });
      }
    } else {
      await member.setNickname(user_exchange_data.nickname);
    }

    try {
      wallet.amount -= Number(user_exchange_data.rewardPrice);
      await wallet.save();
    } catch (error) {
      logger.error("Failed to save wallet:", error);
      const embed = new EmbedBuilder()
        .setTitle("Transaction Error")
        .setDescription(
          "There was an error while processing your wallet transaction. Please try again later.",
        )
        .setColor("Red");
      await interaction.editReply({ embeds: [embed], components: [] });
      await cancelThread(interaction);
      return;
    }

    try {
      await AwardedReward.findOneAndUpdate(
        { guildId, awardedUserId: userId, reward: "changeOtherNickname" },
        {
          userId,
          value: user_exchange_data.nickname,
          reward: "changeOtherNickname",
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

    if (member.id !== guild.ownerId) {
      const embed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(
          `**${member.user.globalName || member.user.username}**'s nickname has been changed to **${user_exchange_data.nickname}**.\n` +
            `You now have **${wallet.amount}** ${user_exchange_data.tokenEmoji} in your wallet.`,
        )
        .setColor("Green");
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(
          `**${member.user.globalName || member.user.username}**'s nickname has been requested to change to **${user_exchange_data.nickname}**.\n` +
            `You now have **${wallet.amount}** ${user_exchange_data.tokenEmoji} in your wallet.`,
        )
        .setColor("Green");
      await interaction.followUp({ embeds: [embed], components: [] });
    }

    await cancelThread(interaction);

    const parentChannel = thread.parent;
    if (parentChannel) {
      let parentDescription;
      if (member.id === guild.ownerId) {
        parentDescription = `<@${userId}> has requested **${member.user.globalName || member.user.username}**'s nickname to be changed to **${user_exchange_data.nickname}**.`;
      } else {
        parentDescription = `<@${userId}> has changed **${member.user.globalName || member.user.username}**'s nickname to **${user_exchange_data.nickname}**.`;
      }

      const parentEmbed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(parentDescription)
        .setColor("Green");

      await parentChannel.send({ embeds: [parentEmbed] });
    }
  } catch (nicknameError) {
    logger.error("Error changing nickname:", nicknameError);

    let title = "Nickname Change Error";
    let description =
      "I could not change the nickname. Your wallet has not been affected.";

    if (nicknameError.code === 50013) {
      title = "Permission Error";
      description =
        "I don't have permission to change this user's nickname.\n" +
        "This may be due to role hierarchy — the target user's highest role is above mine.\n" +
        "Your wallet has not been affected.";
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);
  }
}

module.exports = {
  changeOtherNicknameMenu,
  changeOtherNicknameChooseUser,
  changeOtherNicknameConfirm,
  changeOtherNicknameExchange,
};
