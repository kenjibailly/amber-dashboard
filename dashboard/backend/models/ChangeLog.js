const mongoose = require("mongoose");

const changeLogSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  user: {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  moduleId: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ChangeLog", changeLogSchema);
