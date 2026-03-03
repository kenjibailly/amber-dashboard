const rewardHandlers = {
  changeNicknameConfirm: require("../commands/shop/changeNickname")
    .changeNicknameConfirm,
  changeOtherNicknameConfirm: require("../commands/shop/changeOtherNickname")
    .changeOtherNicknameConfirm,
  changeOtherNicknameChooseUser: require("../commands/shop/changeOtherNickname")
    .changeOtherNicknameChooseUser,
  //   addRole: require("./rewards/addRole"),
  //   addEmoji: require("./rewards/addEmoji"),
  //   addChannel: require("./rewards/addChannel"),
  //   trollSomeone: require("./rewards/trollSomeone"),
};
const cancelThread = require("../helpers/cancelThread");
const { EmbedBuilder } = require("discord.js");

module.exports = async function rewardMessageRouter(message, exchangeData) {
  const { name } = exchangeData;

  const handler = rewardHandlers[name];

  if (!handler) {
    console.warn(`No reward handler found for: ${name}`);
    return;
  }

  try {
    await handler(message, exchangeData);
  } catch (error) {
    console.error(`Error in reward handler (${name}):`, error);
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
