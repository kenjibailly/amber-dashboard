const mongoose = require("mongoose");

const guildModuleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  moduleId: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: false,
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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

guildModuleSchema.index({ guildId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model("GuildModule", guildModuleSchema);
