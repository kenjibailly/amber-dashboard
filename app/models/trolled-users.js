const mongoose = require('mongoose');

// Define the TrolledUser schema
const trolledUsersSchema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true,
    },
    user_id: {
        type: String,
        required: true,
    },
    channel_id: {
        type: String,
        required: true,
    },
    mission_id: {
        type: String,
        required: false,
    },
    previous_roles: {
        type: [String],
        required: false,
        default: [],
    },
});

// Create a compound unique index on guild_id and name
trolledUsersSchema.index({ guild_id: 1, user_id: 1 }, { unique: true });

// Create a model using the schema
const TrolledUser = mongoose.model('TrolledUser', trolledUsersSchema);

module.exports = TrolledUser;