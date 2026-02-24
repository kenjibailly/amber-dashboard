const mongoose = require('mongoose');

// Define the TrollMissions schema
const trollMissionsSchema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
});

// Create a compound unique index on guild_id and name
trollMissionsSchema.index({ guild_id: 1, name: 1 }, { unique: true });

// Create a model using the schema
const TrollMissions = mongoose.model('TrollMissions', trollMissionsSchema);

module.exports = TrollMissions;