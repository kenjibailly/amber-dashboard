const mongoose = require('mongoose');

// Define the BotChannel schema
const botChannelSchema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true,
        unique: true, // Ensures only one document per guild_id
    },
    channel: {
        type: String,
        required: true,
    },
});

// Create a model using the schema
const BotChannel = mongoose.model('BotChannel', botChannelSchema);

module.exports = BotChannel;
