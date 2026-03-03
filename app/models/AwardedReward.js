const mongoose = require("mongoose");

// Define the AwardedReward schema
const awardedRewardSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  awardedUserId: {
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
  },
});

// Create a model using the schema
const AwardedReward = mongoose.model("AwardedReward", awardedRewardSchema);

module.exports = AwardedReward;
