const { EmbedBuilder } = require("discord.js");
const userExchangeData = require("../../helpers/userExchangeData");
const validateNicknameAndEmoji = require("../../helpers/validateNicknameAndEmoji");
const getWalletConfig = require("../../helpers/getWalletConfig");
const getRewards = require("../../helpers/getRewards");
const cancelThread = require("../../helpers/cancelThread");
const AwardedReward = require("../../models/AwardedReward");
const checkRequiredBalance = require("../../helpers/checkRequiredBalance");
const checkPermissions = require("../../helpers/checkPermissions");

async function changeNicknameMenu(interaction) {
  await interaction.deferReply();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  try {
    const existingAwardedReward = await AwardedReward.findOne({
      guildId,
      awardedUserId: userId,
      $or: [{ reward: "changeOwnNickname" }, { reward: "changeOtherNickname" }],
    });

    if (existingAwardedReward) {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (existingAwardedReward.date > twentyFourHoursAgo) {
        // Send message
        const embed = new EmbedBuilder()
          .setTitle("Shop")
          .setDescription(
            "It hasn't been 24h yet since your nickname has been changed, please try again later.",
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
    await interaction.reply({ embeds: [embed], flags: 64 });
    await cancelThread(interaction);
    return null;
  }

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(`Reply with desired new nickname.`)
    .setColor("Green");

  const name = interaction.values[0].split("_")[1] + "Confirm";

  // Store interaction data for the specific user
  userExchangeData.set(
    `${interaction.member.user.id}_${interaction.channelId}`,
    {
      threadId: interaction.channelId,
      name,
    },
  );

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

async function changeNicknameConfirm(message, exchangeData) {
  const newNickname = message.content.trim();
  const guildId = message.guild.id;
  const userId = message.author.id;

  const validationError = validateNicknameAndEmoji(newNickname);

  if (validationError) {
    logger.error("Validation Error:", validationError);
    // Send a confirmation message before closing the thread
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(`${validationError}\nPlease try again.`)
      .setColor("Red");

    await message.reply({
      embeds: [embed],
    });
    userExchangeData.delete(`${userId}_${exchangeData?.threadId || channelId}`);
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
    return message.reply({ embeds: [embed], flags: 64 });
  }

  if (walletConfig && walletConfig instanceof EmbedBuilder) {
    await message.reply({ embeds: [walletConfig] });
    userExchangeData.delete(`${userId}_${exchangeData?.threadId || channelId}`);
    await cancelThread({
      guildId: message.guild.id,
      channelId: message.channel.id,
      client: message.client,
    });
    return;
  }

  const reward = rewards.find((r) => r.id === "changeNickname");

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      `Do you want to change your nickname to **${newNickname}**?\n` +
        `This will deduct **${reward.price}** ${walletConfig.tokenEmoji} from your wallet.`,
    )
    .setColor("Green");

  // Update or add new values to the existing data
  userExchangeData.set(`${message.author.id}_${exchangeData.threadId}`, {
    ...exchangeData,
    nickname: newNickname,
    rewardPrice: reward.price,
    tokenEmoji: walletConfig.tokenEmoji,
  });

  // Construct the button component
  const buttonComponent = {
    type: 2, // Button type
    style: 1, // Primary style
    label: "Exchange",
    emoji: {
      name: walletConfig.settings.wallet.tokenEmoji.emojiName, // Use the emoji name
      id: walletConfig.settings.wallet.tokenEmoji.emoji, // Include the ID if it's a custom emoji
    },
    custom_id: `shop_changeNickname_exchange`,
  };

  // Send the message
  await message.channel.send({
    embeds: [embed],
    components: [
      {
        type: 1, // Action row type
        components: [
          buttonComponent,
          {
            type: 2, // Button type
            style: 4, // Danger style
            label: "Cancel",
            custom_id: "cancel-thread",
          },
        ],
      },
    ],
  });
}

async function changeNicknameExchange(interaction) {
  try {
    await interaction.deferReply();

    const userId = interaction.member.user.id;
    const client = interaction.client;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    const user_exchange_data = userExchangeData.get(`${userId}_${channelId}`);
    userExchangeData.delete(
      `${userId}_${user_exchange_data?.threadId || channelId}`,
    );

    const guild = await client.guilds.fetch(guildId);
    const thread = await guild.channels.fetch(channelId);

    const wallet = await checkRequiredBalance(
      interaction,
      client,
      user_exchange_data.rewardPrice,
      thread,
    );
    if (!wallet) {
      return;
    }

    // Check bot permissions
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

    // Fetch member who's nickname should be changed
    const member = await guild.members.fetch(interaction.member.user.id);

    // // Check if the member is the server owner
    if (member.id === guild.ownerId) {
      // Can't change owner's nickname, send DM to owner instead
      const owner = await guild.fetchOwner();
      try {
        const embed = new EmbedBuilder()
          .setTitle("Change Nickname")
          .setDescription(
            `A nickname change was requested for you: \`\`\`${user_exchange_data.nickname}\`\`\`However, bots can't change the server owner's nickname. Please update it manually.`,
          )
          .setColor("Green");
        await owner.send({
          embeds: [embed],
        });

        const embedUser = new EmbedBuilder()
          .setTitle("Shop")
          .setDescription(
            "The user is the server owner. I've sent them a DM requesting the nickname change.",
          )
          .setColor("Green");
        await interaction.editReply({
          embeds: [embedUser],
          components: [], // Ensure this is an empty array
        });
      } catch (error) {
        const embed = new EmbedBuilder()
          .setTitle("Error")
          .setDescription(
            "The user is the server owner, and I couldn't send them a DM",
          )
          .setColor("Red");

        console.error("Failed to send DM to the server owner:", error);
        await interaction.editReply({
          embeds: [embed],
          components: [], // Ensure this is an empty array
        });
      }
    } else {
      // Change nickname if not the owner
      await member.setNickname(user_exchange_data.nickname);
    }

    try {
      // Deduct from the wallet
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
      await interaction.editReply({
        embeds: [embed],
        components: [], // Ensure this is an empty array
      });
      await cancelThread(interaction);
      return;
    }

    try {
      const reward = "changeOwnNickname"; // Example reward value

      const awardedReward = await AwardedReward.findOneAndUpdate(
        {
          guildId,
          awardedUserId: userId,
          reward,
        },
        {
          userId,
          value: user_exchange_data.nickname,
          reward,
          date: new Date(),
        },
        {
          upsert: true, // Create a new document if one doesn't exist
          new: true, // Return the updated document
          setDefaultsOnInsert: true, // Apply default values on insert if defined
        },
      );

      if (!awardedReward) {
        throw new Error("Could not find add awarded reward to database");
      }
    } catch (error) {
      logger.error("Error adding reward to DB:", error);

      const embed = new EmbedBuilder()
        .setTitle("Reward Database Error")
        .setDescription(
          "I could not add the reward to the database. Please contact the administrator.",
        )
        .setColor("Red");
      await interaction.editReply({
        embeds: [embed],
        components: [], // Ensure this is an empty array
      });
      await cancelThread(interaction);
      return;
    }

    if (member.id !== guild.ownerId) {
      const embed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(
          `**${member.user.globalName}**'s nickname has been changed to **${user_exchange_data.nickname}**.\n` +
            `You now have **${wallet.amount}** ${user_exchange_data.tokenEmoji} in your wallet.`,
        )
        .setColor("Green");

      // Send success message before canceling the thread message
      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    } else {
      const embed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(
          `**${member.user.globalName}**'s nickname has been requested to change to **${user_exchange_data.nickname}**.\n` +
            `You now have **${wallet.amount}** ${user_exchange_data.tokenEmoji} in your wallet.`,
        )
        .setColor("Green");

      // Send success message before canceling the thread message
      await interaction.followUp({
        embeds: [embed],
        components: [],
      });
    }
    await cancelThread(interaction);

    // Send message to the parent channel if available
    const parentChannel = thread.parent;
    if (parentChannel) {
      const parentTitle = "Shop";
      let parentDescription;
      // Check if the member is the server owner
      if (member.id === guild.ownerId) {
        parentDescription = `<@${userId}> has requested **${member.user.globalName}**'s nickname to **${user_exchange_data.nickname}**.`;
      } else {
        parentDescription = user_exchange_data.taggedUser
          ? `<@${userId}> has changed **${member.user.globalName}**'s nickname to <@${member.user.id}>.`
          : `**${interaction.member.user.globalName}** has changed their nickname to <@${member.user.id}>.`;
      }

      const parentEmbed = new EmbedBuilder()
        .setTitle(parentTitle)
        .setDescription(parentDescription)
        .setColor("Green");

      await parentChannel.send({
        embeds: [parentEmbed],
      });
    }
  } catch (nicknameError) {
    logger.error("Error changing nickname:", nicknameError);

    let title = "Nickname Change Error";
    let description = `I could not change the nickname. Your wallet has not been affected.`;

    if (nicknameError.code === 50013) {
      title = "Permission Error";
      description =
        `I don't have permission to change the nickname.\n` +
        `This could be due to role hierarchy issues or you are trying to change the nickname of the server owner.\n` +
        `To change the nickname of the server owner, please contact the server owner.\n` +
        `Your wallet has not been affected.`;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Red");

    await interaction.editReply({
      embeds: [embed],
      components: [], // Ensure this is an empty array
    });
    await cancelThread(interaction);
  }
}

module.exports = {
  changeNicknameMenu,
  changeNicknameConfirm,
  changeNicknameExchange,
};
