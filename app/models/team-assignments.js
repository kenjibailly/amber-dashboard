const mongoose = require('mongoose');

// Define the TeamAssignments schema
const teamAssignmentsSchema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true,
    },
    event_id: {
        type: String,
        required: true,
    },
    user: {
        type: String,
        required: true,
        unique: true,
    },
});

// Create a model using the schema
const TeamAssignments = mongoose.model('TeamAssignments', teamAssignmentsSchema);

module.exports = TeamAssignments;