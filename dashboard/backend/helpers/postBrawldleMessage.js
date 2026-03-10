const axios = require("axios");

async function postBrawldleMessage({
  user,
  userDoc,
  guesses,
  brawldleNumber,
  won,
}) {
  try {
    if (!userDoc.activeChannelId || !userDoc.activeGuildId) return;

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    await axios.post(
      `${process.env.BOT_SYNC_URL}/brawldle-message`,
      {
        secret: process.env.SYNC_SECRET,
        userId: user.id,
        guildId: userDoc.activeGuildId,
        channelId: userDoc.activeChannelId,
        username: user.global_name || user.username,
        avatarUrl,
        guesses,
        brawldleNumber,
        won,
      },
      { timeout: 15000 },
    );
  } catch (err) {
    console.error("Failed to call brawldle-message webhook:", err.message);
  }
}

async function postWinAnnouncement({ user, userDoc, brawldleNumber }) {
  try {
    if (!userDoc.activeChannelId || !userDoc.activeGuildId) return;

    await axios.post(
      `${process.env.BOT_SYNC_URL}/brawldle-win-announcement`,
      {
        secret: process.env.SYNC_SECRET,
        guildId: userDoc.activeGuildId,
        channelId: userDoc.activeChannelId,
        winnerUserId: user.id,
        brawldleNumber,
      },
      { timeout: 15000 },
    );
  } catch (err) {
    console.error(
      "Failed to call brawldle-win-announcement webhook:",
      err.message,
    );
  }
}

module.exports = { postBrawldleMessage, postWinAnnouncement };
