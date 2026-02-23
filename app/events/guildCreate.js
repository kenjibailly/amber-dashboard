const { Events } = require("discord.js");
const botJoinsGuild = require("./guildEvents/botJoinsGuild");

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    botJoinsGuild(this.client, guild);
  },
};
