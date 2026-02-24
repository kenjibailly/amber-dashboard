const mongoose = require("mongoose");

// Define the Games schema
const gamesSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
});

// Create a compound unique index on guild_id and name
gamesSchema.index({ guild_id: 1, name: 1 }, { unique: true });

// Create a model using the schema
const Games = mongoose.model("Games", gamesSchema);

module.exports = Games;
