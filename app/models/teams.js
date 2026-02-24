const mongoose = require("mongoose");

// Define the Teams schema
const teamsSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
    unique: true, // Ensures only one document per guild_id
  },
  team_1: {
    type: String,
    required: true,
  },
  team_2: {
    type: String,
    default: true,
  },
});

// Create a model using the schema
const Teams = mongoose.model("Teams", teamsSchema);

module.exports = Teams;
