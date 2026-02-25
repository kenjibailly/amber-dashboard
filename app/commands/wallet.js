const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Wallet = require("../models/Wallet");
const getWalletConfig = require("../helpers/getWalletConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("Check your wallet balance")
    .addUserOption(
      (option) =>
        option
          .setName("user")
          .setDescription("The user whose wallet you want to check")
          .setRequired(false), // 👈 THIS makes it optional
    ),

  async execute(interaction) {
    const { guildId } = interaction;
    await interaction.deferReply(); // optional: private response

    try {
      // Get optional user option
      const targetUser =
        interaction.options.getUser("user") || interaction.user;

      // Retrieve the wallet for the user
      const wallet = await Wallet.findOne({
        userId: targetUser.id,
        guildId: guildId,
      });

      // Retrieve wallet config
      const moduleSettings = await getWalletConfig(guildId);

      if (!moduleSettings.enabled) {
        const embed = new EmbedBuilder()
          .setTitle("Wallet")
          .setDescription("Economy for this server is disabled.")
          .setColor("Red");

        return await interaction.editReply({ embeds: [embed], flags: 64 });
      }
      const config = moduleSettings;

      // Check if config is an embed (error case)
      if (config.data) {
        return await interaction.editReply({ embeds: [config], flags: 64 });
      }

      let { tokenEmoji, extraTokenEmoji } = config;

      if (wallet) {
        let description = `${
          targetUser.id === interaction.user.id
            ? "You have"
            : `<@${targetUser.id}> has`
        } **${wallet.amount}** ${tokenEmoji}.`;

        if (extraCurrency.enabled) {
          description += `\n${
            targetUser.id === interaction.user.id
              ? "You also have"
              : `<@${targetUser.id}> also has`
          } **${wallet.extraAmount || 0}** ${extraTokenEmoji}.`;
        }
        const embed = new EmbedBuilder()
          .setTitle("Wallet Balance")
          .setDescription(description)
          .setColor("Green");
        await interaction.editReply({ embeds: [embed], flags: 64 });
      } else {
        const description = `${
          targetUser.id === interaction.user.id
            ? `You have not been awarded any ${tokenEmoji} yet.`
            : `<@${targetUser.id}> has not been awarded any ${tokenEmoji} yet.`
        }`;

        const embed = new EmbedBuilder()
          .setTitle("Wallet")
          .setDescription(description)
          .setColor("Red");

        await interaction.editReply({ embeds: [embed], flags: 64 });
      }
    } catch (error) {
      logger.error("Error during finding wallet:", error);

      const embed = new EmbedBuilder()
        .setTitle("Wallet")
        .setDescription("I could not find the wallet.")
        .setColor("Red");

      await interaction.editReply({ embeds: [embed], flags: 64 });
    }
  },
};
