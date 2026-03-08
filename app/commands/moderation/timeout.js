const GuildModule = require("../../models/GuildModule");
const {
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require("discord.js");
const userExchangeData = require("../../helpers/userExchangeData");
const Timeouts = require("../../models/Timeouts");
const formatDuration = require("../../helpers/formatDuration");

async function timeoutMenu(interaction) {
  await interaction.deferReply({ flags: 64 });
  const targetUser = interaction.options.getUser("user");
  const violationMessage = interaction.options?.getString("message");
  const timeOutHours = interaction.options?.getNumber("amount");
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const key = `${userId}_moderation_timeout`;

  userExchangeData.set(key, {
    ...(violationMessage !== undefined && { violationMessage }),
    ...(timeOutHours !== undefined && { timeOutHours }),
  });

  try {
    const moderationModule = await GuildModule.findOne({
      guildId,
      moduleId: "moderation",
    });

    const rules = moderationModule.settings.rules;

    if (!rules.length) {
      const embed = new EmbedBuilder()
        .setTitle("Moderation Error")
        .setDescription("No rules found for this server.")
        .setColor("Red");
      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const options = rules.map((rule) => ({
      label: `${rule.position}. ${rule.name}`,
      description: rule.description?.slice(0, 100) || "No description.",
      value: rule.position.toString(),
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`moderation_rules_menu_timeout:${targetUser.id}`)
      .setPlaceholder("Select the rule(s) violated")
      .setMinValues(1)
      .setMaxValues(Math.min(options.length, 25))
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({
      content: `Select the rule(s) that **${targetUser.tag}** has violated:`,
      components: [row],
      flags: 64,
    });
  } catch (error) {
    logger.error(error);
    const embed = new EmbedBuilder()
      .setTitle("Moderation Error")
      .setDescription("Something went wrong, please try again later.")
      .setColor("Red");
    return await interaction.editReply({ embeds: [embed], flags: 64 });
  }
}

async function timeoutUser(interaction, ruleIds, targetUserId) {
  await interaction.deferReply({ flags: 64 });
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const key = `${userId}_moderation_timeout`;
  const user_exchange_data = userExchangeData.get(key);
  const { violationMessage, timeOutHours } = user_exchange_data;
  userExchangeData.delete(key);
  let messageContent = null;
  if (violationMessage) {
    // Parse the link to extract channel ID and message ID
    const match = violationMessage.match(
      /https:\/\/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/,
    );

    if (match) {
      const [, channelId, messageId] = match;
      try {
        const channel = await interaction.client.channels.fetch(channelId);
        const message = await channel.messages.fetch(messageId);
        messageContent = message.content;
      } catch (err) {
        console.error("Failed to fetch original message:", err);
      }
    }
  }

  // Fetch existing timeout count
  let timeoutData = await Timeouts.findOne({
    guildId,
    userId: targetUserId,
  });

  if (!timeoutData) {
    timeoutData = new Timeouts({
      guildId,
      userId: targetUserId,
      amount: 0,
    });
  }

  const module = await GuildModule.findOne({ guildId, moduleId: "moderation" });

  //   // Determine timeout duration
  const nextTimeoutCount = timeoutData.amount + 1;

  const timeoutSteps = module.settings?.timeoutSteps || [];

  // Fall back to hardcoded defaults if not configured
  let timeoutMs;

  if (timeOutHours) {
    // Manual override from command option
    timeoutMs = timeOutHours * 60 * 60 * 1000;
  } else {
    const timeoutSteps = module.settings?.timeoutSteps || [];
    if (timeoutSteps.length > 0) {
      const step =
        timeoutSteps[Math.min(nextTimeoutCount, timeoutSteps.length) - 1];
      const multiplier =
        step.unit === "minutes"
          ? 60 * 1000
          : step.unit === "hours"
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000; // days
      timeoutMs = step.duration * multiplier;
    } else {
      switch (nextTimeoutCount) {
        case 1:
          timeoutMs = 10 * 60 * 1000;
          break;
        case 2:
          timeoutMs = 60 * 60 * 1000;
          break;
        default:
          timeoutMs = 24 * 60 * 60 * 1000;
          break;
      }
    }
  }

  // Fetch rules
  const selectedRules = module.settings.rules.filter((rule) =>
    ruleIds.includes(rule.position.toString()),
  );

  const ruleList = selectedRules
    .map((r) => `• **${r.name}**: ${r.description}`)
    .join("\n");
  let durationStr;

  if (user_exchange_data.timeoutAmount) {
    durationStr = timeoutAmount + " hours";
  } else {
    durationStr = formatDuration(timeoutMs);
  }

  let staffRoleName = "";
  try {
    const staffRoleEntry = await GuildModule.findOne({
      guildId,
      moduleId: "staffrole",
      enabled: true,
    });
    if (staffRoleEntry && staffRoleEntry.settings.roleId) {
      const role = await interaction.guild.roles.fetch(
        staffRoleEntry.settings.roleId,
      );
      if (role) {
        staffRoleName = role.name;
      }
    }
  } catch (error) {
    console.error("Failed to fetch staff role:", error.message);
  }

  // DM the user
  try {
    const user = await interaction.client.users.fetch(targetUserId);
    const dmEmbed = new EmbedBuilder()
      .setTitle("You have been timed out")
      .setDescription(
        `You were timed out in **${interaction.guild.name}** for **${durationStr}**.\n\n**Violation of rule(s):**\n${ruleList}` +
          (messageContent
            ? `\n\n**Violated Message**\n${messageContent}`
            : "") +
          (staffRoleName
            ? `\n\nIf you believe this was a mistake, please contact a member of the **${staffRoleName}** role.`
            : ""),
      )
      .setColor("Red");

    await user.send({ embeds: [dmEmbed] });
  } catch (dmErr) {
    logger.warn(`Failed to DM user ${targetUserId}:`, dmErr.message);
  }

  // Timeout the user
  try {
    const member = await interaction.guild.members.fetch(targetUserId);
    if (timeOutHours) {
      const ms = timeOutHours * 60 * 60 * 1000;
      await member.timeout(ms);
    } else {
      await member.timeout(timeoutMs);
    }
  } catch (err) {
    logger.error("Failed to timeout user:", err.message);
  }

  // Update DB
  timeoutData.amount = nextTimeoutCount;
  await timeoutData.save();

  // Send confirmation in interaction
  const embed = new EmbedBuilder()
    .setTitle("User Timed Out")
    .setDescription(
      `You were timed out in **${interaction.guild.name}** for **${durationStr}**.\n\n**Reason(s):**\n${ruleList}`,
    )
    .addFields({ name: "Duration", value: durationStr, inline: true })
    .setColor("Red");

  await interaction.editReply({
    content: `User <@${targetUserId}> has been timed out.`,
    embeds: [embed],
    components: [],
  });
}

module.exports = { timeoutMenu, timeoutUser };
