function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

function checkGuildPermission(req, res, next) {
  const { guildId } = req.params;
  const userGuilds = req.session.guilds || [];

  const hasAccess = userGuilds.some((g) => g.id === guildId);

  if (!hasAccess) {
    return res.status(403).json({ error: "No permission for this guild" });
  }

  next();
}

module.exports = { requireAuth, checkGuildPermission };
