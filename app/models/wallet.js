const mongoose = require("mongoose");

// Define the Wallet schema
const walletSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    default: 0,
  },
  extra_amount: {
    type: Number,
    default: 0,
  },
});

// Create a compound unique index on guild_id and user_id
walletSchema.index({ guild_id: 1, user_id: 1 }, { unique: true });

// Create a model using the schema
const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
