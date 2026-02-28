const mongoose = require("mongoose");

// Define the Levels schema
const levelsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  messageCount: {
    type: Number,
    required: true,
  },
});

// Create a compound unique index on guildId and name
levelsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Create a model using the schema
const Levels = mongoose.model("Levels", levelsSchema);

module.exports = Levels;
