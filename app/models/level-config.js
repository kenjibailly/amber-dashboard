const mongoose = require("mongoose");

// Define the LevelConfig schema
const levelConfigSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
    unique: true,
  },
  message_count: {
    type: Number,
    required: true,
  },
  exp_points: {
    type: Number,
    required: true,
  },
  channel: {
    type: String,
    required: true,
  },
  reward: {
    type: Number,
    required: true,
  },
  reward_extra: {
    type: Number,
    required: true,
  },
  ignored_channels: {
    type: [String], // or Array<String>
    required: false,
    default: [],
  },
});

// Create a model using the schema
const LevelConfig = mongoose.model("LevelConfig", levelConfigSchema);

module.exports = LevelConfig;
