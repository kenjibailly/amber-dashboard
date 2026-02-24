const mongoose = require("mongoose");

// Define the CreateImageSettings schema
const createImageSettings = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
  },
  bot_id: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  lora: {
    type: String,
    required: false,
  },
  dimensions: {
    type: String,
    required: true,
  },
});

createImageSettings.index({ user_id: 1, bot_id: 1 }, { unique: true });

// Create a model using the schema
const CreateImageSettings = mongoose.model(
  "CreateImageSettings",
  createImageSettings
);

module.exports = CreateImageSettings;
