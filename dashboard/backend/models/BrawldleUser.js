const mongoose = require("mongoose");

const BrawldleUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // ── Lifetime stats ──────────────────────────────────────────
  totalWins: { type: Number, default: 0 },
  totalGuesses: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },
  lastWinDate: { type: String, default: null },

  // ── Today's session ─────────────────────────────────────────
  activeDate: { type: String, default: null },
  guesses: { type: [String], default: [] },
  wonToday: { type: Boolean, default: false },

  // ── Active Discord message ───────────────────────────────────
  activeMessageId: { type: String, default: null },
  activeChannelId: { type: String, default: null },
  activeGuildId: { type: String, default: null },
});

module.exports = mongoose.model("BrawldleUser", BrawldleUserSchema);
