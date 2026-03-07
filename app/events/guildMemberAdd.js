const { Events } = require("discord.js");
const handleAutoRole = require("../handlers/memberJoin/handleAutoRole");
const handleWelcomeMessage = require("../handlers/memberJoin/handleWelcomeMessage");
const handleTrollRejoin = require("../handlers/memberJoin/handleTrollRejoin");
const handleTrollerRejoin = require("../handlers/memberJoin/handleTrollerRejoin");
const handleAwardedRole = require("../handlers/memberJoin/handleAwardedRole");
const handleAwardedNickname = require("../handlers/memberJoin/handleAwardedNickname");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const guildId = member.guild.id;

    try {
      const isTrolled = await handleTrollRejoin(member, guildId);
      await handleTrollerRejoin(member, guildId);
      await handleAwardedRole(member, guildId);
      await handleAwardedNickname(member, guildId);

      // Skip auto role and welcome if user is being trolled
      if (!isTrolled) {
        await handleAutoRole(member, guildId);
        await handleWelcomeMessage(member, guildId);
      }
    } catch (error) {
      logger.error(
        `Error handling member join in ${member.guild.name}:`,
        error,
      );
    }
  },
};
