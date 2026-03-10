const express = require("express");
const deployCommands = require("./deploy-commands");
const { generateBrawldleImage } = require("./helpers/generateBrawldleImage");
const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const BrawldleUser = require("./models/BrawldleUser");

const SYNC_SECRET = process.env.SYNC_SECRET;
const getTodayUTC = () => new Date().toISOString().slice(0, 10);

module.exports = function registerSyncRoute(app) {
  app.use(express.json({ limit: "5mb" }));

  // ── Sync commands ─────────────────────────────────────────────
  app.post("/sync-commands", async (req, res) => {
    const { guildId, secret } = req.body;
    if (secret !== SYNC_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      await deployCommands(guildId);
      res.json({ success: true });
    } catch (err) {
      logger.error("Failed to sync commands:", err);
      res.status(500).json({ error: "Failed to sync commands" });
    }
  });

  // ── Brawldle message ──────────────────────────────────────────
  app.post("/brawldle-message", async (req, res) => {
    const {
      secret,
      userId,
      guildId,
      channelId,
      username,
      avatarUrl,
      guesses,
      brawldleNumber,
      won,
    } = req.body;

    if (secret !== SYNC_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const client = app.get("discordClient");
      if (!client)
        return res.status(500).json({ error: "Discord client not available" });

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });

      const channel = guild.channels.cache.get(channelId);
      if (!channel) return res.status(404).json({ error: "Channel not found" });

      const imageBuffer = await generateBrawldleImage({
        userId,
        username,
        avatarUrl,
        guesses,
        brawldleNumber,
        won,
      });

      const attachment = new AttachmentBuilder(imageBuffer, {
        name: "brawldle.png",
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("brawldle_launch")
          .setLabel("Play now!")
          .setStyle(ButtonStyle.Primary),
      );

      const content = won
        ? `🎉 **${username}** solved today's Brawldle!`
        : `🎮 **${username}** is playing Brawldle!`;

      const userDoc = await BrawldleUser.findOne({ userId });
      let messageId = userDoc?.activeMessageId;

      if (messageId) {
        try {
          const existing = await channel.messages.fetch(messageId);
          await existing.edit({
            content,
            files: [attachment],
            components: [row],
          });
          return res.json({ success: true, messageId });
        } catch (_) {
          messageId = null;
        }
      }

      const message = await channel.send({
        content,
        files: [attachment],
        components: [row],
      });

      if (userDoc) {
        userDoc.activeMessageId = message.id;
        await userDoc.save();
      }

      res.json({ success: true, messageId: message.id });
    } catch (err) {
      logger.error("Failed to post brawldle message:", err);
      res.status(500).json({ error: "Failed to post message" });
    }
  });

  // ── Brawldle win announcement ─────────────────────────────────
  app.post("/brawldle-win-announcement", async (req, res) => {
    const { secret, guildId, channelId, winnerUserId, brawldleNumber } =
      req.body;

    if (secret !== SYNC_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const client = app.get("discordClient");
      const today = getTodayUTC();

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });

      const channel = guild.channels.cache.get(channelId);
      if (!channel) return res.status(404).json({ error: "Channel not found" });

      // Fetch all guild members to filter by guild membership
      await guild.members.fetch();
      const memberIds = new Set(guild.members.cache.keys());

      // Get all users who won today and are in this guild, sorted by streak
      const todayWinners = await BrawldleUser.find({
        wonToday: true,
        activeDate: today,
        userId: { $in: [...memberIds] },
      }).sort({ currentStreak: -1 });

      if (todayWinners.length === 0) return res.json({ success: true });

      const medals = ["🥇", "🥈", "🥉"];

      const rows = todayWinners.map((u, i) => {
        const member = guild.members.cache.get(u.userId);
        const name = member?.displayName || `<@${u.userId}>`;
        const medal = medals[i] || `**${i + 1}.**`;
        const streak = u.currentStreak;
        const guessCount = u.guesses?.length ?? "?";
        const fire = streak >= 7 ? " 🔥" : streak >= 3 ? " ✨" : "";
        return `${medal} **${name}** — ${guessCount} ${guessCount === 1 ? "guess" : "guesses"} · ${streak} day streak${fire}`;
      });

      const winner = guild.members.cache.get(winnerUserId);
      const winnerName = winner?.displayName || `<@${winnerUserId}>`;

      const embed = new EmbedBuilder()
        .setTitle(`🎯 Brawldle #${brawldleNumber}`)
        .setDescription(
          `**${winnerName}** just cracked today's Brawldle!\n\n` +
            `__**Solvers so far**__ (${todayWinners.length} ${todayWinners.length === 1 ? "player" : "players"}):\n\n` +
            rows.join("\n"),
        )
        .setColor(0xffd700)
        .setFooter({ text: "Play every day to build your streak!" })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      res.json({ success: true });
    } catch (err) {
      logger.error("Failed to post brawldle win announcement:", err);
      res.status(500).json({ error: "Failed to post announcement" });
    }
  });
};
