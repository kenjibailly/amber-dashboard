function requireAuth(req, res, next) {
  if (
    !req.session.user ||
    req.session.user.id != process.env.VITE_DISCORD_ADMIN_ID
  ) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}

module.exports = { requireAuth };
