const mongoose = require("mongoose");

// Define the Introductions schema
const introductionsSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  message_id: {
    type: String,
    required: false,
  },
  channel_id: {
    type: String,
    required: false,
  },
});

// Create a compound unique index on guild_id and name
introductionsSchema.index({ guild_id: 1, user_id: 1 }, { unique: true });

// Create a model using the schema
const Introductions = mongoose.model("Introductions", introductionsSchema);

module.exports = Introductions;
