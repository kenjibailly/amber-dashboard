const mongoose = require("mongoose");

// Define the Introductions schema
const introductionsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  messageId: {
    type: String,
    required: false,
  },
  channelId: {
    type: String,
    required: false,
  },
});

// Create a compound unique index on guildId and name
introductionsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Create a model using the schema
const Introductions = mongoose.model("Introductions", introductionsSchema);

module.exports = Introductions;
