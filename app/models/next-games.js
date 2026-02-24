const mongoose = require('mongoose');

// Define the NextGame schema
const nextGamesSchema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true,
    },
    user_id: {
        type: String,
        required: true,
    },
    game_id: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now, 
    },
}); 

// Create a model using the schema
const NextGames = mongoose.model('NextGame', nextGamesSchema);

module.exports = NextGames;