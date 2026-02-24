const mongoose = require("mongoose");

const adminModuleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: false,
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
    type: mongoose.Schema.Types.Mixed, // Flexible object for module-specific settings
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

adminModuleSchema.index({ guildId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model("AdminModule", adminModuleSchema);
