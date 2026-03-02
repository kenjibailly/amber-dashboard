const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const awardRole = require("./award/role");
const awardUser = require("./award/user");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("award")
    .setDescription("Add a role to a user")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("Award shop coins to a user")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to award shop coins to")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount of shop coins to award")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("extra_amount")
            .setDescription("The extra currency amount of shop coins to award")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for the awarding")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("role")
        .setDescription("Award shop coins to a role")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to award shop coins to")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount of shop coins to award")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("extra_amount")
            .setDescription("The extra currency amount of shop coins to award")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for the awarding")
            .setRequired(false),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "role") {
      await awardRole(interaction);
    }

    if (subcommand === "user") {
      await awardUser(interaction);
    }
  },
};
