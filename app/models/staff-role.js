const mongoose = require("mongoose");

// Define the StaffRole schema
const staffRoleSchema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
    unique: true, // Ensures only one document per guild_id
  },
  id: {
    type: String,
    required: true,
  },
});

// Create a model using the schema
const StaffRole = mongoose.model("StaffRole", staffRoleSchema);

module.exports = StaffRole;
