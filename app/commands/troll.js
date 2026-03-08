const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const listMissions = require("./troll/listMissions");
const handleComplete = require("./troll/complete");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("troll")
    .setDescription("Troll management commands")
    .addSubcommand((sub) =>
      sub
        .setName("complete")
        .setDescription(
          "Mark a troll mission as completed and restore the user's access.",
        )
        .addStringOption((opt) =>
          opt
            .setName("message-link")
            .setDescription(
              "Copy the message link of the completed mission to post it on the server.",
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("missions").setDescription("List all troll missions"),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "complete") {
      await handleComplete(interaction);
    }

    if (subcommand === "missions") {
      await listMissions(interaction);
    }
  },
};
