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
        type: String,
        required: true,
      },
      emojiName: String,
      isCustom: Boolean,
      roleIds: [String],
    },
  ],
  type: {
    type: String,
    enum: ["normal", "add_only", "remove_only"],
    default: "normal",
  },
  allowedRoles: [String],
  ignoredRoles: [String],
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
