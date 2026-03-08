const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const { warnMenu, warnUser } = require("./moderation/warn");
const { timeoutMenu, timeoutUser } = require("./moderation/timeout");
const guildModule = require("../models/GuildModule");
const GuildModule = require("../models/GuildModule");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("Moderation for users")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("warn")
        .setDescription("Warn a user and select the rule(s) they violated")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Select a user to warn")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Add the message link of the violation")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("timeout")
        .setDescription("Timeout a user and select the rule(s) they violated")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Select a user to timeout")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Add the message link of the violation")
            .setRequired(false),
        )
        .addNumberOption((option) =>
          option
            .setName("amount")
            .setDescription(
              "How many hours would you like to timeout this user?",
            )
            .setRequired(false),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const guildId = interaction.guildId;
    try {
      const moderationModule = await GuildModule.findOne({
        guildId,
        moduleId: "moderation",
      });
      if (!moderationModule.enabled) {
        const embed = new EmbedBuilder()
          .setTitle("Moderation Error")
          .setDescription("Moderation have not been enabled for this server")
          .setColor("Red");
        return await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error(error);
      const embed = new EmbedBuilder()
        .setTitle("Moderation Error")
        .setDescription("Something went wrong, please try again later.")
        .setColor("Red");
      return await interaction.editReply({ embeds: [embed] });
    }
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "warn") {
      await warnMenu(interaction);
    }

    if (subcommand === "timeout") {
      await timeoutMenu(interaction);
    }
  },

  async handleButton(interaction) {
    if (interaction.customId.startsWith("moderation_rules_menu")) {
      const listOptions = interaction.values;
      const [action, targetUserId] = interaction.customId.split(":");
      switch (true) {
        case action.endsWith("timeout"):
          await timeoutUser(interaction, listOptions, targetUserId);
          break;
        case action.endsWith("warn"):
          await warnUser(interaction, listOptions, targetUserId);
          break;
        default:
          break;
      }
    }
  },
};
