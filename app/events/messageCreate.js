const handleJoinLeave = require("../handlers/joinLeave");
const AdminModule = require("../models/AdminModule");

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
  },
};
