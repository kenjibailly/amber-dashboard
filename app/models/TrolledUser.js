const mongoose = require("mongoose");

// Define the TrolledUser schema
const trolledUsersSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  missionId: {
    type: String,
    required: false,
  },
  previousRoles: {
    type: [String],
    required: false,
    default: [],
  },
});

// Create a compound unique index on guildId and name
trolledUsersSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Create a model using the schema
const TrolledUser = mongoose.model("TrolledUser", trolledUsersSchema);

module.exports = TrolledUser;
