const mongoose = require("mongoose");

// Define the IntroductionConfig schema
const introductionConfigSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
    unique: true,
  },
  channel: {
    type: String,
    required: true,
  },
});

// Create a model using the schema
const IntroductionConfig = mongoose.model(
  "IntroductionConfig",
  introductionConfigSchema
);

module.exports = IntroductionConfig;
