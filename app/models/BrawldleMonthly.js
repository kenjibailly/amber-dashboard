const mongoose = require("mongoose");

// Tracks each user's Brawldle stats for a specific month, per guild.
// month format: "2026-03" (YYYY-MM)
const BrawldleMonthlySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  month: { type: String, required: true }, // e.g. "2026-03"
  wins: { type: Number, default: 0 },
  totalGuesses: { type: Number, default: 0 }, // sum of guesses on winning days only
  daysPlayed: { type: Number, default: 0 },
});

BrawldleMonthlySchema.index(
  { guildId: 1, month: 1, userId: 1 },
  { unique: true },
);
BrawldleMonthlySchema.index({ guildId: 1, month: 1, wins: -1 });

module.exports = mongoose.model("BrawldleMonthly", BrawldleMonthlySchema);
