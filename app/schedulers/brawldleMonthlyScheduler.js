const BrawldleMonthly = require("../models/BrawldleMonthly");
const BrawldleDaily = require("../models/BrawldleDaily");
const GuildModule = require("../models/GuildModule");
const Wallet = require("../models/Wallet");
const { EmbedBuilder } = require("discord.js");
const getWalletConfig = require("../helpers/getWalletConfig");

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

function getLastMonthStr() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7); // "2026-02"
}

function getCurrentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

async function runMonthlyPayout(client) {
  const month = getLastMonthStr();

  logger.info(`[BrawldleMonthly] Running payout for ${month}`);

  try {
    // Find all guilds with brawldle module enabled
    const modules = await GuildModule.find({
      moduleId: "brawldle",
      enabled: true,
    });

    for (const mod of modules) {
      const guildId = mod.guildId;
      const settings = mod.settings || {};
      const channelId = settings.channelId;
      const rewards = settings.rewards || [];
      const rewardPlaces = settings.rewardPlaces || 3;

      if (!channelId || rewards.length === 0) continue;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const channel = guild.channels.cache.get(channelId);
      if (!channel) continue;

      // Get top players for this guild this month
      const topPlayers = await BrawldleMonthly.find({ guildId, month })
        .sort({ wins: -1, totalGuesses: 1 })
        .limit(rewardPlaces);

      if (topPlayers.length === 0) {
        logger.info(`[BrawldleMonthly] No players found for guild ${guildId}`);
        continue;
      }

      // Pay out rewards and build embed rows
      const rows = [];
      for (let i = 0; i < topPlayers.length; i++) {
        const player = topPlayers[i];
        const reward = rewards[i];
        const member = guild.members.cache.get(player.userId);
        const name = member?.displayName || `<@${player.userId}>`;
        const avgGuesses =
          player.wins > 0
            ? (player.totalGuesses / player.wins).toFixed(1)
            : "—";

        // Add currency to wallet
        if (reward && (reward.currency > 0 || reward.extraCurrency > 0)) {
          await Wallet.findOneAndUpdate(
            { guildId, userId: player.userId },
            {
              $inc: {
                amount: reward.currency || 0,
                extraAmount: reward.extraCurrency || 0,
              },
            },
            { upsert: true, new: true },
          );
        }

        const walletConfig = await getWalletConfig(client, guildId);

        const rewardStr =
          reward && (reward.currency > 0 || reward.extraCurrency > 0)
            ? ` — ${walletConfig.tokenEmoji} ${reward.currency}${reward.extraCurrency > 0 ? ` + ${walletConfig.extraTokenEmoji} ${reward.extraCurrency}` : ""}`
            : "";

        rows.push(
          `${MEDALS[i]} **${name}** — ${player.wins} wins · avg ${avgGuesses} guesses${rewardStr}`,
        );
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎯 Brawldle — ${month} Monthly Results`)
        .setDescription(
          `The month is over! Here are the top Brawldle players for **${month}**:\n\n` +
            rows.join("\n") +
            `\n\nRewards have been added to the winners' wallets. Good luck next month!`,
        )
        .setColor(0xffd700)
        .setFooter({
          text: "A new month, a new chance to top the leaderboard!",
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      logger.info(
        `[BrawldleMonthly] Payout complete for guild ${guildId}, ${topPlayers.length} players rewarded`,
      );
    }
  } catch (err) {
    logger.error("[BrawldleMonthly] Payout error:", err);
  }
}

function startBrawldleMonthlyScheduler(client) {
  // Check every hour if it's the 1st of the month at midnight UTC
  setInterval(
    async () => {
      const now = new Date();
      if (now.getUTCDate() === 1 && now.getUTCHours() === 0) {
        await runMonthlyPayout(client);
      }
    },
    60 * 60 * 1000,
  );

  logger.info("[BrawldleMonthly] Monthly scheduler started");
}

module.exports = {
  startBrawldleMonthlyScheduler,
  runMonthlyPayout,
  getCurrentMonthStr,
};
