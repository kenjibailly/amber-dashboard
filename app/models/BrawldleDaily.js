const mongoose = require("mongoose");

// One document per day — tracks which brawler is active and aggregate stats
const BrawldleDailySchema = new mongoose.Schema({
  // e.g. "2026-03-09"
  date: { type: String, required: true, unique: true },

  // The brawler name for this day
  brawlerName: { type: String, required: true },

  // Aggregate stats across all players for this day
  totalPlayers: { type: Number, default: 0 },
  totalGuesses: { type: Number, default: 0 }, // sum of all guesses from winners
  totalWins: { type: Number, default: 0 },
});

module.exports = mongoose.model("BrawldleDaily", BrawldleDailySchema);
