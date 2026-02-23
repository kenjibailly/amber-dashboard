const mongoose = require("mongoose");

// Define the Tickets schema
const ticketsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
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
