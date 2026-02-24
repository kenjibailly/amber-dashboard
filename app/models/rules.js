const mongoose = require("mongoose");

// Define the Rules schema
const rulesSchema = new mongoose.Schema({
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
rulesSchema.index({ guild_id: 1, name: 1 }, { unique: true });

// Create a model using the schema
const Rules = mongoose.model("Rules", rulesSchema);

module.exports = Rules;
