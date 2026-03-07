const {
  EmbedBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require("discord.js");
const path = require("path");
const userExchangeData = require("../../helpers/userExchangeData");
const getWalletConfig = require("../../helpers/getWalletConfig");
const getRewards = require("../../helpers/getRewards");
const cancelThread = require("../../helpers/cancelThread");
const AwardedReward = require("../../models/AwardedReward");
const TrolledUser = require("../../models/TrolledUser");
const checkRequiredBalance = require("../../helpers/checkRequiredBalance");
const GuildModule = require("../../models/GuildModule");
const defaultMissions = require("../../config/trollMissions.json");

async function getTrollMissions(guildId) {
  try {
    const economyModule = await GuildModule.findOne({
      guildId,
      moduleId: "economy",
    });
    if (
      economyModule?.enabled &&
      economyModule?.settings?.trollMissions?.length > 0
    ) {
      return economyModule.settings.trollMissions;
    }
  } catch (err) {
    logger.error(
      "Failed to fetch troll missions from DB, using defaults:",
      err,
    );
  }
  return defaultMissions;
}

async function trollSomeoneMenu(interaction) {
  await interaction.deferReply();
  const userId = interaction.member.user.id;
  const key = `${userId}_${interaction.channelId}`;

  userExchangeData.set(key, {
    threadId: interaction.channelId,
    name: "trollSomeoneChooseUser",
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      "Reply with the username or mention (@) the user you want to troll.",
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

async function trollSomeoneChooseUser(message, exchangeData) {
  const guildId = message.guild.id;
  const guild = message.guild;
  const key = `${message.author.id}_${exchangeData.threadId}`;

  let targetMember = null;
  const mentionMatch = message.content.match(/^<@!?(\d+)>/);
  if (mentionMatch) {
    targetMember = await guild.members.fetch(mentionMatch[1]).catch(() => null);
    try {
      const thread = guild.channels.cache.get(exchangeData.threadId);
      if (thread?.isThread()) {
        await thread.members.remove(mentionMatch[1]);
      }
    } catch (err) {
      // Non-fatal
    }
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
    return;
  }

  if (targetMember.id === message.author.id) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription("You cannot troll yourself!")
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return;
  }

  if (targetMember.user.bot) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription("You cannot troll a bot!")
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return;
  }

  const alreadyTrolled = await TrolledUser.findOne({
    guildId,
    userId: targetMember.id,
  });
  if (alreadyTrolled) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription("This user is already being trolled!")
      .setColor("Orange");
    await message.reply({ embeds: [embed] });
    userExchangeData.delete(key);
    await cancelThread({
      guildId,
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

  const reward = rewards.find((r) => r.id === "trollSomeone");

  userExchangeData.set(key, {
    ...exchangeData,
    name: "trollSomeoneExchange",
    targetUserId: targetMember.id,
    targetUserName: targetMember.user.globalName || targetMember.user.username,
    rewardPrice: reward.price,
    tokenEmoji: walletConfig.tokenEmoji,
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      `Do you want to troll **${targetMember.user.globalName || targetMember.user.username}**?\n` +
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
    custom_id: "shop_trollSomeone_exchange",
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

async function trollSomeoneExchange(interaction) {
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

    const trolledMember = await guild.members.fetch(
      user_exchange_data.targetUserId,
    );

    // Save previous roles (exclude @everyone and managed roles)
    const previousRoles = trolledMember.roles.cache
      .filter((r) => r.id !== guild.id && !r.managed)
      .map((r) => r.id);

    // Get or create the "Trolled" role
    let trolledRole = guild.roles.cache.find((r) => r.name === "Trolled");
    if (!trolledRole) {
      trolledRole = await guild.roles.create({
        name: "Trolled",
        color: 0x808080,
        reason: "Auto-created for troll shop reward",
      });
    }

    // Get staff role if configured
    const staffModule = await GuildModule.findOne({
      guildId,
      moduleId: "staffrole",
    });
    const staffRoleId =
      staffModule?.enabled && staffModule?.settings?.roleId
        ? staffModule.settings.roleId
        : null;

    const botMember = await guild.members.fetchMe();

    // Build permission overwrites for troll channel
    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: trolledRole.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      {
        id: trolledMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
      {
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    if (staffRoleId) {
      permissionOverwrites.push({
        id: staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    } else {
      await guild.members.fetch();
      const adminMembers = guild.members.cache.filter(
        (m) =>
          m.permissions.has(PermissionFlagsBits.Administrator) && !m.user.bot,
      );
      adminMembers.forEach((admin) => {
        permissionOverwrites.push({
          id: admin.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      });
    }

    // Create the troll channel
    const safeUsername = (
      trolledMember.user.globalName || trolledMember.user.username
    )
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);

    const trollChannel = await guild.channels.create({
      name: `troll-${safeUsername}`,
      type: 0,
      permissionOverwrites,
      reason: `Troll channel for ${trolledMember.user.tag}`,
    });

    // Deny Trolled role from viewing all other channels
    const allChannels = guild.channels.cache.filter(
      (c) =>
        c.id !== trollChannel.id &&
        (c.type === 0 || c.type === 2 || c.type === 4),
    );
    for (const [, channel] of allChannels) {
      try {
        await channel.permissionOverwrites.edit(trolledRole.id, {
          ViewChannel: false,
        });
      } catch (err) {
        // Non-fatal
      }
    }

    // Remove all roles and assign only Trolled role
    try {
      await trolledMember.roles.set([guild.id, trolledRole.id]);
    } catch (err) {
      logger.error("Failed to set roles on trolled user:", err);
    }

    // Save to DB
    await TrolledUser.findOneAndUpdate(
      { guildId, userId: trolledMember.id },
      {
        guildId,
        userId: trolledMember.id,
        channelId: trollChannel.id,
        missionId: null,
        previousRoles,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Build mission list
    const missions = await getTrollMissions(guildId);
    const missionList = missions
      .map(
        (m) =>
          `**${m.id}.** ${m.title}${m.description ? `\n${m.description}` : ""}`,
      )
      .join("\n\n");

    const rickRollPath = path.join(__dirname, "../../media/rick-roll.webp");
    const attachment = new AttachmentBuilder(rickRollPath, {
      name: "rick-roll.webp",
    });

    const trollEmbed = new EmbedBuilder()
      .setTitle("You got trolled!")
      .setDescription(
        `Oh no, you have been trolled by <@${userId}>!\n` +
          `You now have to complete one of these missions listed below to get back access to the server. ` +
          `Please reply with the number next to the mission you want to complete. ` +
          `The staff will then accept your completion when satisfied and get you back access to the server, ` +
          `your completion entry will be shared with the rest of the server.\n\n` +
          `**These are all the troll missions:**\n\n${missionList}`,
      )
      .setImage("attachment://rick-roll.webp")
      .setColor("Red");

    await trollChannel.send({
      content: `<@${trolledMember.id}>`,
      embeds: [trollEmbed],
      files: [attachment],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: "Lock in mission",
              custom_id: "shop_troll_lockInMission",
            },
          ],
        },
      ],
    });

    // Deduct wallet
    try {
      wallet.amount -= Number(user_exchange_data.rewardPrice);
      await wallet.save();
    } catch (error) {
      logger.error("Failed to save wallet:", error);
    }

    try {
      await AwardedReward.findOneAndUpdate(
        { guildId, awardedUserId: userId, reward: "trollSomeone" },
        {
          userId,
          value: user_exchange_data.targetUserId,
          reward: "trollSomeone",
          date: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      logger.error("Error saving awarded reward:", error);
    }

    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        `**${user_exchange_data.targetUserName}** has been trolled!\n` +
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
          `<@${userId}> has trolled **${user_exchange_data.targetUserName}**!`,
        )
        .setColor("Green");
      await parentChannel.send({ embeds: [parentEmbed] });
    }
  } catch (error) {
    logger.error("Error in trollSomeoneExchange:", error);
    let title = "Troll Error";
    let description =
      "Something went wrong. Your wallet has not been affected.";
    if (error.code === 50013) {
      title = "Permission Error";
      description =
        "I don't have permission to do this. Your wallet has not been affected.";
    }
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);
  }
}

// Watches for number replies in troll channels from the trolled user
async function trollHandleMissionChoice(message, exchangeData) {
  const guildId = message.guild.id;
  const missions = await getTrollMissions(guildId);
  const chosenIndex = parseInt(message.content.trim());

  if (isNaN(chosenIndex) || chosenIndex < 1 || chosenIndex > missions.length) {
    const embed = new EmbedBuilder()
      .setTitle("Troll Mission")
      .setDescription(
        `Please reply with a number between 1 and ${missions.length}.`,
      )
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return; // keep exchange data — they can try again
  }

  const chosenMission = missions[chosenIndex - 1];

  await TrolledUser.findOneAndUpdate(
    { guildId, userId: message.author.id },
    { missionId: chosenMission.id },
  );

  // Don't delete userExchangeData — keep watching for future changes
  const key = `${message.author.id}_${exchangeData.threadId}`;
  userExchangeData.set(key, {
    ...exchangeData,
    name: "trollHandleMissionChoice",
  });

  const embed = new EmbedBuilder()
    .setTitle("Troll Mission")
    .setDescription(
      `You have selected mission **${chosenMission.id}. ${chosenMission.title}**.\n` +
        (chosenMission.description
          ? `${chosenMission.description}\n\n`
          : "\n") +
        `Complete this mission and the staff will restore your access. You can change your mission by clicking the button below.`,
    )
    .setColor("Orange");
  userExchangeData.delete(key);
  await message.channel.send({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 2,
            label: "Change mission",
            custom_id: "shop_troll_lockInMission",
          },
        ],
      },
    ],
  });
}

// Called when "Lock in mission" / "Change mission" button is clicked
async function trollLockInMission(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.member.user.id;

  const trolledUser = await TrolledUser.findOne({ guildId, userId });
  if (!trolledUser) {
    await interaction.reply({
      content: "Could not find your troll data.",
      flags: 64,
    });
    return;
  }

  const missions = await getTrollMissions(guildId);
  const missionList = missions
    .map(
      (m) =>
        `**${m.id}.** ${m.title}${m.description ? `\n${m.description}` : ""}`,
    )
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle("Choose your mission")
    .setDescription(
      `Reply with the number of the mission you want to complete:\n\n${missionList}`,
    )
    .setColor("Orange");

  const trollKey = `${userId}_${interaction.channelId}`;
  userExchangeData.set(trollKey, {
    threadId: interaction.channelId,
    name: "trollHandleMissionChoice",
  });

  await interaction.reply({ embeds: [embed] });
}

module.exports = {
  trollSomeoneMenu,
  trollSomeoneChooseUser,
  trollSomeoneExchange,
  trollHandleMissionChoice,
  trollLockInMission,
  getTrollMissions,
};
