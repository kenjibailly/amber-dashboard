const normalizeName = require("./normalizeName");
const appEmojis = new Map(); // name -> emoji string

async function cacheAppEmojis(client) {
  const app = await client.application.fetch();
  const emojis = await app.emojis.fetch();
  emojis.forEach((e) => appEmojis.set(normalizeName(e.name), e.toString()));
}

module.exports = { cacheAppEmojis, appEmojis };
