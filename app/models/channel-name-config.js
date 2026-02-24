const mongoose = require('mongoose');

// Define the ChannelNameConfig schema
const channelNameConfigSchema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true,
        unique: true, // Ensures only one document per guild_id
    },
    emoji: {
        type: Boolean, // Change to String if you want to allow empty strings
        required: false, // Make this field optional
        default: false, // Provide a default value if needed
    },
    separator: {
        type: String,
        required: false, // Make this field optional
        default: "", // Provide a default value if needed
    },
});

// Create a model using the schema
const ChannelNameConfig = mongoose.model('ChannelNameConfig', channelNameConfigSchema);

module.exports = ChannelNameConfig;