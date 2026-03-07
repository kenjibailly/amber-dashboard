const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const userExchangeData = require("../../helpers/userExchangeData");
const getWalletConfig = require("../../helpers/getWalletConfig");
const getRewards = require("../../helpers/getRewards");
const cancelThread = require("../../helpers/cancelThread");
const AwardedReward = require("../../models/AwardedReward");
const checkRequiredBalance = require("../../helpers/checkRequiredBalance");
const checkPermissions = require("../../helpers/checkPermissions");
const GuildModule = require("../../models/GuildModule");

function validateRoleName(name) {
  if (!name || name.length === 0) return "Role name cannot be empty.";
  if (name.length > 100)
    return "Role name cannot be longer than 100 characters.";
  return null;
}

function validateHexColor(input) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(input)) {
    return "Invalid hex color. Please use the format `#RRGGBB`, example: `#9000FF`.";
  }
  return null;
}

async function addRoleMenu(interaction) {
  await interaction.deferReply();
  const userId = interaction.member.user.id;
  const key = `${userId}_${interaction.channelId}`;

  try {
    const existingAwardedReward = await AwardedReward.findOne({
      guildId: interaction.guildId,
      awardedUserId: userId,
      reward: "addRole",
    });

    if (existingAwardedReward) {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (existingAwardedReward.date > twentyFourHoursAgo) {
        const embed = new EmbedBuilder()
          .setTitle("Shop")
          .setDescription(
            "It hasn't been 24h yet since you last added a role, please try again later.",
          )
          .setColor("Orange");
        await interaction.editReply({ embeds: [embed], components: [] });
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

  userExchangeData.set(key, {
    threadId: interaction.channelId,
    name: "addRoleChooseName",
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription("Reply with the name for your new role.")
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

async function addRoleChooseName(message, exchangeData) {
  const roleName = message.content.trim();
  const key = `${message.author.id}_${exchangeData.threadId}`;

  const validationError = validateRoleName(roleName);
  if (validationError) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(`${validationError}\nPlease try again.`)
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return; // keep thread open
  }

  userExchangeData.set(key, {
    ...exchangeData,
    name: "addRoleChooseColor",
    roleName,
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      "Please reply with the hex color code for your new role. You can pick a color [here](https://www.fffuel.co/cccolor/), please copy the one with the hashtag in front. Example: `#9000FF`",
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

async function addRoleChooseColor(message, exchangeData) {
  const guildId = message.guild.id;
  const key = `${message.author.id}_${exchangeData.threadId}`;
  const hexColor = message.content.trim();

  const validationError = validateHexColor(hexColor);
  if (validationError) {
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(`${validationError}\nPlease try again.`)
      .setColor("Red");
    await message.reply({ embeds: [embed] });
    return; // keep thread open
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

  const reward = rewards.find((r) => r.id === "addRole");

  userExchangeData.set(key, {
    ...exchangeData,
    name: "addRoleExchange",
    hexColor,
    rewardPrice: reward.price,
    tokenEmoji: walletConfig.tokenEmoji,
  });

  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      `Do you want to add this custom role?\n` +
        `Role name: **${exchangeData.roleName}**\n` +
        `Role color: \`${hexColor}\`\n` +
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
    custom_id: "shop_addRole_exchange",
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

async function addRoleExchange(interaction) {
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
      "MANAGE_ROLES",
      guild,
    );
    if (permissionCheck) {
      await interaction.editReply({ embeds: [permissionCheck] });
      await cancelThread(interaction);
      return;
    }

    // Create the role
    const colorInt = parseInt(user_exchange_data.hexColor.replace("#", ""), 16);
    const newRole = await guild.roles.create({
      name: user_exchange_data.roleName,
      color: colorInt,
      reason: `Shop reward by ${interaction.member.user.tag}`,
    });

    // Determine position — under admin/manage server roles and staff role
    await positionRole(guild, newRole, client, guildId);

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
        { guildId, awardedUserId: userId, reward: "addRole" },
        {
          userId,
          value: user_exchange_data.roleName,
          reward: "addRole",
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
        `The role <@&${newRole.id}> has been created!\n` +
          `You now have **${wallet.amount}** ${user_exchange_data.tokenEmoji} in your wallet.`,
      )
      .setColor(colorInt);

    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);

    const parentChannel = thread.parent;
    if (parentChannel) {
      const parentEmbed = new EmbedBuilder()
        .setTitle("Shop")
        .setDescription(
          `<@${userId}> has added a new role <@&${newRole.id}> to the server.`,
        )
        .setColor(colorInt);
      await parentChannel.send({ embeds: [parentEmbed] });
    }
  } catch (error) {
    logger.error("Error creating role:", error);

    let title = "Role Creation Error";
    let description =
      "I could not create the role. Your wallet has not been affected.";

    if (error.code === 50013) {
      title = "Permission Error";
      description =
        "I don't have permission to manage roles. Your wallet has not been affected.";
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Red");
    await interaction.editReply({ embeds: [embed], components: [] });
    await cancelThread(interaction);
  }
}

async function positionRole(guild, newRole, client, guildId) {
  try {
    await guild.roles.fetch();

    // Find the lowest position role that has Administrator or ManageGuild
    const protectedRoles = guild.roles.cache
      .filter(
        (r) =>
          r.permissions.has(PermissionFlagsBits.Administrator) ||
          r.permissions.has(PermissionFlagsBits.ManageGuild),
      )
      .sort((a, b) => a.position - b.position); // ascending, lowest first

    // Check if staffrole module is enabled and get its role id
    const staffModule = await GuildModule.findOne({
      guildId,
      moduleId: "staffrole",
    });
    let staffRolePosition = null;

    if (staffModule?.enabled && staffModule?.settings?.roleId) {
      const staffRole = guild.roles.cache.get(staffModule.settings.roleId);
      if (staffRole) staffRolePosition = staffRole.position;
    }

    // Find the minimum position among protected roles and staff role
    let lowestProtectedPosition =
      protectedRoles.size > 0
        ? protectedRoles.first().position
        : guild.roles.cache.size;

    if (staffRolePosition !== null) {
      lowestProtectedPosition = Math.min(
        lowestProtectedPosition,
        staffRolePosition,
      );
    }

    // Place new role just below the lowest protected role
    const targetPosition = Math.max(1, lowestProtectedPosition - 1);

    await guild.roles.setPositions([
      { role: newRole.id, position: targetPosition },
    ]);
  } catch (err) {
    logger.error("Failed to reposition role:", err);
    // Non-fatal — role was still created, just not positioned correctly
  }
}

module.exports = {
  addRoleMenu,
  addRoleChooseName,
  addRoleChooseColor,
  addRoleExchange,
};
