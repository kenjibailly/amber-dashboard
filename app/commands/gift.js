const { SlashCommandBuilder } = require("discord.js");
const {
  giftUser,
  handleGiftConfirm,
  handleGiftCancel,
} = require("./gift/user");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gift")
    .setDescription("Gift currency to another user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to gift currency to")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of currency to gift")
        .setRequired(false)
        .setMinValue(1),
    )
    .addIntegerOption((option) =>
      option
        .setName("extra_amount")
        .setDescription("The amount of extra currency to gift")
        .setRequired(false)
        .setMinValue(1),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the gift")
        .setRequired(false),
    ),

  async execute(interaction) {
    await giftUser(interaction);
  },

  async handleButton(interaction) {
    if (interaction.customId.startsWith("gift_confirm")) {
      await handleGiftConfirm(interaction);
    }

    if (interaction.customId.startsWith("gift_cancel")) {
      await handleGiftCancel(interaction);
    }
  },
};
