const mongoose = require('mongoose');

// Define the Rewards schema
const rewardsSchema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    short_description: {
        type: String,
        required: true,
    },
    long_description: {
        type: String,
        required: false,
    },
    enable: {
        type: Boolean,
        default: true,
    },
    price: {
        type: Number,
        default: 1,
    },
    time: {
        type: Number,
        default: 30,
    }
});

// Create a compound unique index on guild_id and name
rewardsSchema.index({ guild_id: 1, name: 1 }, { unique: true });

// Create a model using the schema
const Rewards = mongoose.model('Rewards', rewardsSchema);

module.exports = Rewards;