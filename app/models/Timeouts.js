const mongoose = require("mongoose");

// Define the Timeouts schema
const timeoutsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

// Create a compound unique index on guildId and name
timeoutsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Create a model using the schema
const Timeouts = mongoose.model("Timeouts", timeoutsSchema);

module.exports = Timeouts;
