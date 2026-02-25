const express = require("express");
const router = express.Router();
const axios = require("axios");
const { requireAuth, checkGuildPermission } = require("./middleware");

router.get("/:guildId/channels", requireAuth, checkGuildPermission, async (req, res) => {
  const { guildId } = req.params;

  try {
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } },
    );

    const textChannels = response.data
      .filter((channel) => channel.type === 0 || channel.type === 5)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
      }))
      .sort((a, b) => a.position - b.position);

    console.log(`Fetched ${textChannels.length} text channels for guild ${guildId}`);
    res.json({ channels: textChannels });
  } catch (err) {
    console.error("Error fetching guild channels:", err);
    res.status(500).json({ error: "Failed to fetch guild channels" });
  }
});

router.get("/:guildId/users", requireAuth, checkGuildPermission, async (req, res) => {
  const { guildId } = req.params;

  try {
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } },
    );

    const users = response.data
      .filter((member) => !member.user.bot)
      .map((member) => ({
        id: member.user.id,
        username: member.user.username,
        globalName: member.user.global_name,
        nickname: member.nick,
        avatar: member.user.avatar,
      }))
      .sort((a, b) =>
        (a.globalName || a.username).localeCompare(b.globalName || b.username),
      );

    console.log(`Fetched ${users.length} users for guild ${guildId}`);
    res.json({ users });
  } catch (err) {
    console.error("Error fetching guild users:", err);
    res.status(500).json({ error: "Failed to fetch guild users" });
  }
});

router.get("/:guildId/roles", requireAuth, checkGuildPermission, async (req, res) => {
  const { guildId } = req.params;

  try {
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } },
    );

    const roles = response.data
      .filter((role) => role.name !== "@everyone")
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        managed: role.managed,
      }))
      .sort((a, b) => b.position - a.position);

    res.json({ roles });
  } catch (err) {
    console.error("Error fetching guild roles:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch guild roles" });
  }
});

router.get("/:guildId/emojis", requireAuth, checkGuildPermission, async (req, res) => {
  const { guildId } = req.params;

  try {
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/emojis`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } },
    );

    const emojis = response.data.map((emoji) => ({
      id: emoji.id,
      name: emoji.name,
      animated: emoji.animated,
      url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}`,
    }));

    res.json({ emojis });
  } catch (err) {
    console.error("Error fetching guild emojis:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch guild emojis" });
  }
});

module.exports = router;
