const handleJoinLeave = require("../handlers/joinLeave");
const AdminModule = require("../models/AdminModule");
const handleExpMessages = require("../handlers/expMessages");
const userLastMessageTimestamps = require("../helpers/userLastMessageTimestamps");

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

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
