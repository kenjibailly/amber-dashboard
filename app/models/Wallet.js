const mongoose = require("mongoose");

// Define the Wallet schema
const walletSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    default: 0,
  },
  extraAmount: {
    type: Number,
    default: 0,
  },
});

// Create a compound unique index on guildId and userId
walletSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Create a model using the schema
const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
