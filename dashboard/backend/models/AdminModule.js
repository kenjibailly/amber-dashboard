const mongoose = require("mongoose");

const adminModuleSchema = new mongoose.Schema({
  moduleId: {
    type: String,
    required: true,
    unique: true,
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

module.exports = mongoose.model("AdminModule", adminModuleSchema);
