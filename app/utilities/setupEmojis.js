const fs = require("fs");
const path = require("path");

/**
 * Upload application emojis from a folder if they don't exist yet.
 * @param {import('discord.js').Client} client
 */
async function setupAppEmojis(client) {
  try {
    const app = await client.application.fetch();
    if (!app) {
      logger.info("⚠️ Application info not found.");
      return;
    }

    // Fetch existing application emojis
    const existingEmojis = await app.emojis.fetch();
    logger.info(`Found ${existingEmojis.size} existing application emojis.`);

    const emojiFolders = ["currency"];

    for (const folder of emojiFolders) {
      const dir = path.join(__dirname, "..", "emoji", folder);

      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));

      for (const file of files) {
        const emojiName = path.parse(file).name.toLowerCase(); // name from filename
        // Check if this emoji already exists
        const exists = existingEmojis.some((e) => e.name === emojiName);
        if (exists) {
          logger.info(`Emoji ${emojiName} already exists, skipping.`);
          continue;
        }

        // Upload emoji
        const filePath = path.join(dir, file);

        try {
          const uploaded = await app.emojis.create({
            attachment: filePath, // <-- fixed
            name: emojiName,
          });
          logger.success(`✅ Uploaded application emoji: ${uploaded.name}`);
        } catch (err) {
          logger.error(`❌ Failed to upload emoji ${emojiName}:`, err);
        }
      }
    }
  } catch (err) {
    logger.error("Error setting up application emojis:", err);
  }
}

module.exports = { setupAppEmojis };
