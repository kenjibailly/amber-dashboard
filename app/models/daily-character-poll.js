const mongoose = require("mongoose");

// Define the DailyCharacterPoll schema
const dailyCaracterPollSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
    unique: true,
  },
  active: {
    type: Boolean,
    required: true,
  },
  channel_id: {
    type: String,
    required: true,
  },
  last_poll_date: {
    type: Date,
    required: false,
  },
});

// Create a model using the schema
const DailyCharacterPoll = mongoose.model(
  "DailyCharacterPoll",
  dailyCaracterPollSchema
);

module.exports = DailyCharacterPoll;
