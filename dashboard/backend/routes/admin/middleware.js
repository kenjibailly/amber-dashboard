function requireAuth(req, res, next) {
  if (
    !req.session.user ||
    req.session.user.id != process.env.VITE_DISCORD_ADMIN_ID
  ) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}

function requireSession(req, res, next) {
  // Normal session check
  if (req.session.user) return next();

  // Activity token check
  const token = req.headers["x-discord-token"];
  if (token) {
    // Verify token with Discord and get user
    const axios = require("axios");
    axios
      .get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        req.session.user = response.data;
        next();
      })
      .catch(() => {
        res.status(401).json({ error: "Invalid token" });
      });
    return;
  }

  res.status(401).json({ error: "Not authenticated" });
}
module.exports = { requireAuth, requireSession };
