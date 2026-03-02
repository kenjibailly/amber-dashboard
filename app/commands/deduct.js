const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const deductRole = require("./deduct/role");
const deductUser = require("./deduct/user");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deduct")
    .setDescription("Deduct shop coins from a user or role")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("Deduct shop coins from a user")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to deduct shop coins from")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount of shop coins to deduct")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("extra_amount")
            .setDescription("The extra currency amount of shop coins to deduct")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for the deducting")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("role")
        .setDescription("Deduct shop coins from a role")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to deduct shop coins from")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount of shop coins to deduct")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("extra_amount")
            .setDescription("The extra currency amount of shop coins to deduct")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for the deducting")
            .setRequired(false),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "role") {
      await deductRole(interaction);
    }

    if (subcommand === "user") {
      await deductUser(interaction);
    }
  },
};
