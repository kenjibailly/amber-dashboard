const GuildModule = require("../../models/GuildModule");
const {
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require("discord.js");
const userExchangeData = require("../../helpers/userExchangeData");

async function warnMenu(interaction) {
  await interaction.deferReply({ flags: 64 });
  const targetUser = interaction.options.getUser("user");
  const violationMessage = interaction.options?.getString("message");
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const key = `${userId}_moderation_warn`;

  userExchangeData.set(key, {
    ...(violationMessage !== undefined && { violationMessage }),
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
      .setCustomId(`moderation_rules_menu_warn:${targetUser.id}`)
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

async function warnUser(interaction, ruleIds, targetUserId) {
  await interaction.deferReply({ flags: 64 });
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const key = `${userId}_moderation_warn`;
  const user_exchange_data = userExchangeData.get(key);
  const { violationMessage } = user_exchange_data;
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

  const module = await GuildModule.findOne({ guildId, moduleId: "moderation" });

  // Fetch rules
  const selectedRules = module.settings.rules.filter((rule) =>
    ruleIds.includes(rule.position.toString()),
  );

  const ruleList = selectedRules
    .map((r) => `• **${r.name}**: ${r.description}`)
    .join("\n");

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
      .setTitle("You have been warned")
      .setDescription(
        `You are warned in **${interaction.guild.name}**. Next time you violate the rules, you will be timed out.\n\n**Violation of rule(s):**\n${ruleList}` +
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
  // Send confirmation in interaction
  const embed = new EmbedBuilder()
    .setTitle("User Warned")
    .setDescription(
      `You have warned <@${targetUserId}> in **${interaction.guild.name}**.\n\n**Reason(s):**\n${ruleList}`,
    )
    .setColor("Red");
  await interaction.editReply({
    content: `User <@${targetUserId}> has been warned.`,
    embeds: [embed],
    components: [],
  });
}

module.exports = { warnMenu, warnUser };
