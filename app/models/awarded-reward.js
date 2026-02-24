const mongoose = require('mongoose');

// Define the AwardedReward schema
const awardedRewardSchema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true,
    },
    user_id: {
        type: String,
        required: true,
    },
    awarded_user_id: {
        type: String,
    },
    reward: {
        type: String,
        required: true,
    },
    value: {
        type: String,
    },
    date: {
        type: Date,
    }
});

// Create a model using the schema
const AwardedReward = mongoose.model('AwardedReward', awardedRewardSchema);

module.exports = AwardedReward;