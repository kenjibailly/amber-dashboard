const mongoose = require("mongoose");

const gambleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  currency: {
    type: Date,
  },
  extraCurrency: {
    type: Date,
  },
});

gambleSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Gamble", gambleSchema);
