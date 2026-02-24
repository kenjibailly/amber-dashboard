const mongoose = require("mongoose");

// Define the Events schema
const eventsSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
  },
  channel_id: {
    type: String,
    required: true,
  },
  message_id: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  auto_team_generation: {
    type: Boolean,
    required: true,
  },
  max_members_per_team: {
    type: Number,
    required: false,
  },
  game: {
    type: String,
    required: false,
  },
  expiration: {
    type: Number, // in days
    required: true,
  },
  event_date: {
    type: String,
    required: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  color: {
    type: String,
    required: true,
  },
  teams_assigned: {
    type: Boolean,
    required: false,
  },
});

// Create a model using the schema
const Events = mongoose.model("Events", eventsSchema);

module.exports = Events;
