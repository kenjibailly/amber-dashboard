const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const getWalletConfig = require("../helpers/getWalletConfig");
const Rewards = require("../config/rewards.json");
const getRewards = require("../helpers/getRewards");
const handleExchangeShop = require("./shop/exchangeShop");
const {
  changeNicknameMenu,
  changeNicknameExchange,
} = require("./shop/changeNickname");
const {
  changeOtherNicknameMenu,
  changeOtherNicknameExchange,
} = require("./shop/changeOtherNickname");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Open the shop"),

  async execute(interaction) {
    const guildId = interaction.guildId;
    await interaction.deferReply();
    let walletConfig;
    try {
      // Fetch the token emoji
      walletConfig = await getWalletConfig(interaction.client, guildId);

      // Check if we got an embed back instead of token emoji data
      if (walletConfig && walletConfig instanceof EmbedBuilder) {
        await interaction.editReply({ embeds: [walletConfig] });
        return;
      }

      if (walletConfig instanceof EmbedBuilder) {
        return await interaction.editReply({
          embeds: [walletConfig],
          flags: 64,
        });
      }

      if (!walletConfig.enabled) {
        const embed = new EmbedBuilder()
          .setTitle("Error Rewards")
          .setDescription("Economy has been disabled on this server.")
          .setColor("Red");
        return await interaction.editReply({ embeds: [embed], flags: 64 });
      }
    } catch (error) {
      logger.error("Rewards Error:", error);
      const embed = new EmbedBuilder()
        .setTitle("Error Rewards")
        .setDescription(
          "I could not find the rewards. Pleae contact the administrator.",
        )
        .setColor("Red");
      await interaction.editReply({ embeds: [embed], flags: 64 });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        `Exchange your ${walletConfig.tokenEmoji} for the following rewards:\n\u200B\n`,
      )
      .setColor("Green");
    const rewardsList = await getRewards(walletConfig);

    embed.addFields(rewardsList); // Add the fields to the embed
    const walletConfigSettings = walletConfig.settings.wallet;
    const tokenEmoji = walletConfigSettings.tokenEmoji;
    const emoji = tokenEmoji.isCustom
      ? {
          id: tokenEmoji.emoji, // custom emoji ID
          name: tokenEmoji.emojiName,
        }
      : {
          name: tokenEmoji.emoji, // unicode emoji itself
        };
    try {
      const buttonComponent = {
        type: 2, // Button type
        style: 1, // Primary style
        label: "Exchange",
        emoji,
        custom_id: `shop_exchange`,
      };

      await interaction.editReply({
        embeds: [embed],
        components: [
          {
            type: 1, // Action row type
            components: [buttonComponent], // Add the button component
          },
        ],
      });
    } catch (error) {
      logger.error("Error handling shop command:", error);
      const embed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription(
          "An error occurred while processing the shop command. Please try again later.",
        )
        .setColor("Red");

      await interaction.editReply({ embeds: [embed] });
    }
  },

  async handleButton(interaction) {
    if (interaction.customId == "shop_exchange") {
      handleExchangeShop(interaction);
    }

    if (interaction.customId == "shop_exchange_menu") {
      const listOption = interaction.values[0];
      switch (listOption) {
        case "shop_changeNickname_menu":
          await changeNicknameMenu(interaction);
          break;
        case "shop_changeOtherNickname_menu":
          await changeOtherNicknameMenu(interaction);
          break;
        case "shop_addEmoji":
          break;
        case "shop_addRole":
          break;
        case "shop_addChannel":
          break;
        case "shop_trollSomeone":
          break;

        default:
          break;
      }
      return;
    }

    if (interaction.customId.endsWith("_exchange")) {
      switch (interaction.customId) {
        case "shop_changeNickname_exchange":
          await changeNicknameExchange(interaction);
          break;
        case "shop_changeOtherNickname_exchange":
          await changeOtherNicknameExchange(interaction);
          break;
        default:
          break;
      }
    }
  },
};
