const mongoose = require("mongoose");

const GiftLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  // Running totals for current period
  amountGifted: { type: Number, default: 0 },
  extraAmountGifted: { type: Number, default: 0 },
  // When this period resets (set to end of day or end of month)
  resetDate: { type: Date, required: true },
  period: { type: String, enum: ["day", "month"], required: true },
});

GiftLogSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model("GiftLog", GiftLogSchema);
