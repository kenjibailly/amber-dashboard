const mongoose = require("mongoose");

// Define the Timeouts schema
const timeoutsSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

// Create a model using the schema
const Timeouts = mongoose.model("Timeouts", timeoutsSchema);

module.exports = Timeouts;
