const handleJoinLeave = require("../handlers/joinLeave");
const AdminModule = require("../models/AdminModule");
const handleExpMessages = require("../handlers/expMessages");
const userLastMessageTimestamps = require("../helpers/userLastMessageTimestamps");
const userExchangeData = require("../helpers/userExchangeData");
const rewardMessageRouter = require("../handlers/rewardMessageRouter");

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const userId = message.author.id;
    const channelId = message.channel.id;

    const exchangeData = userExchangeData.get(`${userId}_${channelId}`);

    if (exchangeData) {
      // Optional safety: make sure message is inside the correct thread
      if (channelId !== exchangeData.threadId) return;

      await rewardMessageRouter(message, exchangeData);

      return; // prevent exp handling etc if needed
    }

    const moduleDoc = await AdminModule.findOne({
      guildId: message.guild.id,
      moduleId: "joinleave",
      enabled: true,
    });

    if (!moduleDoc?.settings?.command) return;

    const command = moduleDoc.settings.command;

    if (
      message.content === command &&
      message.author.id === moduleDoc.settings.user
    ) {
      await handleJoinLeave(message, moduleDoc.settings.user);
    }
    await handleExpMessages(message);

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return; // user not in VC
    userLastMessageTimestamps.set(message.author.id, Date.now());
  },
};
