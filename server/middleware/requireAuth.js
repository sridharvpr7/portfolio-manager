// middleware/requireAuth.js
// Blocks access to data API routes unless the user has an active session.
module.exports = function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Not authenticated. Please log in.' });
};
