const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const BrawldleDaily = require("../models/BrawldleDaily");
const BrawldleUser = require("../models/BrawldleUser");
const BrawldleMonthly = require("../models/BrawldleMonthly");
const { getTodayUTC } = require("../schedulers/brawldleScheduler");
const {
  getCurrentMonthStr,
} = require("../schedulers/brawldleMonthlyScheduler");

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("brawldle")
    .setDescription("Brawldle commands")
    .addSubcommand((sub) =>
      sub
        .setName("play")
        .setDescription("Play Brawldle — guess today's mystery brawler!"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("leaderboard")
        .setDescription("View the Brawldle leaderboard")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Which leaderboard to show")
            .setRequired(false)
            .addChoices(
              { name: "Today", value: "today" },
              { name: "This Month", value: "monthly" },
              { name: "All Time", value: "alltime" },
            ),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "play") {
      try {
        await interaction.client.rest.post(
          `/interactions/${interaction.id}/${interaction.token}/callback`,
          { body: { type: 12, data: {} } },
        );
      } catch (err) {
        logger.error("Failed to launch Brawldle activity:", err);
        await interaction
          .reply({
            content: "Failed to launch Brawldle. Please try again.",
            ephemeral: true,
          })
          .catch(() => {});
      }
      return;
    }

    if (sub === "leaderboard") {
      await interaction.deferReply();
      const type = interaction.options.getString("type") || "today";
      const guildId = interaction.guildId;

      try {
        await interaction.guild.members.fetch();
        const memberIds = [...interaction.guild.members.cache.keys()];

        if (type === "today") {
          const today = getTodayUTC();
          const daily = await BrawldleDaily.findOne({ date: today });
          const totalDays = await BrawldleDaily.countDocuments();

          const winners = await BrawldleUser.find({
            wonToday: true,
            activeDate: today,
            userId: { $in: memberIds },
          });

          winners.sort((a, b) => {
            if (b.currentStreak !== a.currentStreak)
              return b.currentStreak - a.currentStreak;
            return (a.guesses?.length ?? 99) - (b.guesses?.length ?? 99);
          });

          if (winners.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle(`🎯 Brawldle #${totalDays} — Today's Leaderboard`)
              .setDescription(
                "Nobody has solved today's Brawldle yet. Be the first!",
              )
              .setColor(0xffd700);
            return await interaction.editReply({ embeds: [embed] });
          }

          const rows = winners.slice(0, 10).map((u, i) => {
            const member = interaction.guild.members.cache.get(u.userId);
            const name = member?.displayName || `<@${u.userId}>`;
            const guesses = u.guesses?.length ?? "?";
            const streak = u.currentStreak;
            const fire = streak >= 7 ? " 🔥" : streak >= 3 ? " ✨" : "";
            const medal = MEDALS[i] || `**${i + 1}.**`;
            return `${medal} **${name}** — ${guesses} ${guesses === 1 ? "guess" : "guesses"} · ${streak} day streak${fire}`;
          });

          const avgGuesses =
            daily?.totalWins > 0
              ? (daily.totalGuesses / daily.totalWins).toFixed(1)
              : "—";

          const embed = new EmbedBuilder()
            .setTitle(`🎯 Brawldle #${totalDays} — Today's Leaderboard`)
            .setDescription(rows.join("\n"))
            .addFields(
              {
                name: "Total Solvers",
                value: `${winners.length}`,
                inline: true,
              },
              {
                name: "Avg Guesses (Server)",
                value: `${avgGuesses}`,
                inline: true,
              },
            )
            .setColor(0xffd700)
            .setFooter({ text: today });

          return await interaction.editReply({ embeds: [embed] });
        }

        if (type === "monthly") {
          const month = getCurrentMonthStr();

          const topPlayers = await BrawldleMonthly.find({
            guildId,
            month,
            userId: { $in: memberIds },
          })
            .sort({ wins: -1, totalGuesses: 1 })
            .limit(10);

          if (topPlayers.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle(`🎯 Brawldle — ${month} Leaderboard`)
              .setDescription("No wins recorded this month yet!")
              .setColor(0xffd700);
            return await interaction.editReply({ embeds: [embed] });
          }

          const rows = topPlayers.map((u, i) => {
            const member = interaction.guild.members.cache.get(u.userId);
            const name = member?.displayName || `<@${u.userId}>`;
            const avg = u.wins > 0 ? (u.totalGuesses / u.wins).toFixed(1) : "—";
            const medal = MEDALS[i] || `**${i + 1}.**`;
            return `${medal} **${name}** — ${u.wins} wins · avg ${avg} guesses`;
          });

          const embed = new EmbedBuilder()
            .setTitle(`🎯 Brawldle — ${month} Leaderboard`)
            .setDescription(rows.join("\n"))
            .setColor(0xffd700)
            .setFooter({ text: "Rewards paid out at the end of the month!" });

          return await interaction.editReply({ embeds: [embed] });
        }

        if (type === "alltime") {
          const topPlayers = await BrawldleUser.find({
            userId: { $in: memberIds },
            totalWins: { $gt: 0 },
          })
            .sort({ totalWins: -1, maxStreak: -1 })
            .limit(10);

          if (topPlayers.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle("🎯 Brawldle — All Time Leaderboard")
              .setDescription("No wins recorded yet!")
              .setColor(0xffd700);
            return await interaction.editReply({ embeds: [embed] });
          }

          const rows = topPlayers.map((u, i) => {
            const member = interaction.guild.members.cache.get(u.userId);
            const name = member?.displayName || `<@${u.userId}>`;
            const avg =
              u.totalWins > 0 ? (u.totalGuesses / u.totalWins).toFixed(1) : "—";
            const medal = MEDALS[i] || `**${i + 1}.**`;
            return `${medal} **${name}** — ${u.totalWins} wins · ${u.maxStreak} best streak · avg ${avg} guesses`;
          });

          const embed = new EmbedBuilder()
            .setTitle("🎯 Brawldle — All Time Leaderboard")
            .setDescription(rows.join("\n"))
            .setColor(0xffd700);

          return await interaction.editReply({ embeds: [embed] });
        }
      } catch (err) {
        logger.error("Brawldle leaderboard error:", err);
        await interaction.editReply({
          content: "Failed to fetch leaderboard.",
        });
      }
    }
  },
};
