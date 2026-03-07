const rewardHandlers = {
  changeNicknameConfirm: require("../commands/shop/changeNickname")
    .changeNicknameConfirm,
  changeOtherNicknameConfirm: require("../commands/shop/changeOtherNickname")
    .changeOtherNicknameConfirm,
  changeOtherNicknameChooseUser: require("../commands/shop/changeOtherNickname")
    .changeOtherNicknameChooseUser,
  addRoleChooseColor: require("../commands/shop/addRole").addRoleChooseColor,
  addRoleChooseName: require("../commands/shop/addRole").addRoleChooseName,
  addEmojiConfirm: require("../commands/shop/addEmoji").addEmojiConfirm,
  addChannelConfirm: require("../commands/shop/addChannel").addChannelConfirm,
  addChannelChooseChannel: require("../commands/shop/addChannel")
    .addChannelChooseChannel,
  addChannelChooseCategory: require("../commands/shop/addChannel")
    .addChannelChooseCategory,
  addChannelChooseEmoji: require("../commands/shop/addChannel")
    .addChannelChooseEmoji,
  //   trollSomeone: require("./rewards/trollSomeone"),
};
const cancelThread = require("../helpers/cancelThread");
const { EmbedBuilder } = require("discord.js");
const logContext = require("../helpers/logContext");
const {
  addRoleChooseColor,
  addRoleChooseName,
} = require("../commands/shop/addRole");

module.exports = async function rewardMessageRouter(message, exchangeData) {
  const { name } = exchangeData;
  logger.info(
    `${logContext(message.author, message.guild)} Reward Handler triggered: ${name}`,
  );
  const handler = rewardHandlers[name];

  if (!handler) {
    logger.warn(
      `${logContext(message.author, message.guild)} No reward handler found for: ${name}`,
    );
    return;
  }

  try {
    await handler(message, exchangeData);
  } catch (error) {
    logger.error(`Error in reward handler (${name}):`, error);
    const embed = new EmbedBuilder()
      .setTitle("Reward Error")
      .setDescription("Something went wrong while processing your reward.")
      .setColor("Red");
    await message.reply({ embeds: [embed], flags: 64 });

    await cancelThread({
      guildId: message.guild.id,
      channelId: message.channel.id,
      client: message.client,
    });
  }
};
