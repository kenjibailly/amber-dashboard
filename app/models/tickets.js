const mongoose = require("mongoose");

// Define the Tickets schema
const ticketsSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
});

// Create a model using the schema
const Tickets = mongoose.model("Tickets", ticketsSchema);

module.exports = Tickets;
