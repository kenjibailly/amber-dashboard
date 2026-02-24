// Use the hashed password in the MongoDB connection string
const mongodb_URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@discord_bot_amber_dashboard_db:27017/amber`;

module.exports = mongodb_URI;
