const mongoose = require("mongoose");

const customCommandSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  command: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  replies: [{ type: String, required: true }],
  allowedRoles: [String],
  embedColor: {
    type: String,
    required: true,
  },
  tagUser: {
    type: Boolean,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

customCommandSchema.index({ guildId: 1, command: 1 });

module.exports = mongoose.model("CustomCommand", customCommandSchema);
