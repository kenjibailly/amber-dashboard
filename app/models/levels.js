const mongoose = require("mongoose");

// Define the Levels schema
const levelsSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  message_count: {
    type: Number,
    required: true,
  },
});

// Create a compound unique index on guild_id and name
levelsSchema.index({ guild_id: 1, user_id: 1 }, { unique: true });

// Create a model using the schema
const Levels = mongoose.model("Levels", levelsSchema);

module.exports = Levels;
