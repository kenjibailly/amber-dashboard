const mongoose = require("mongoose");

// Define the WalletConfig schema
const WalletConfigSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
    unique: true, // Ensures only one document per guild_id
  },
  extra_currency_active: {
    type: Boolean,
    required: false,
  },
  token_emoji_name: {
    type: String,
    required: true,
  },
  token_emoji_id: {
    type: String, // ID of the custom emoji
    required: false,
  },
  token_emoji: {
    type: String, // Full emoji string (e.g., <:primogem:1279456896105054348>)
    required: true,
  },
  extra_token_emoji_name: {
    type: String,
    required: true,
  },
  extra_token_emoji_id: {
    type: String, // ID of the custom emoji
    required: false,
  },
  extra_token_emoji: {
    type: String, // Full emoji string (e.g., <:primogem:1279456896105054348>)
    required: true,
  },
});

// Create a model using the schema
const WalletConfig = mongoose.model("WalletConfig", WalletConfigSchema);

module.exports = WalletConfig;
