const mongoose = require("mongoose");

const reactionRoleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  messageLink: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  messageId: {
    type: String,
    required: true,
  },
  reactions: [
    {
      emoji: {
        type: String, // Can be unicode emoji or custom emoji ID
        required: true,
      },
      emojiName: String, // For custom emojis
      isCustom: Boolean,
      roleIds: [String], // Array of role IDs to assign
    },
  ],
  type: {
    type: String,
    enum: ["normal", "add_only", "remove_only"],
    default: "normal",
  },
  allowedRoles: [String], // Only members with these roles can get roles
  ignoredRoles: [String], // Members with these roles are ignored
  allowMultiple: {
    type: Boolean,
    default: true,
  },
  keepCounterAtOne: {
    type: Boolean,
    default: false,
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

reactionRoleSchema.index({ guildId: 1, messageId: 1 });

module.exports = mongoose.model("ReactionRole", reactionRoleSchema);
