// routes/settings.js
// Simple key-value settings store (theme, notification toggles, currency).
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings WHERE user_id = ?').all(req.session.userId);
  const out = {};
  rows.forEach(r => { try { out[r.key] = JSON.parse(r.value); } catch (e) { out[r.key] = r.value; } });
  res.json(out);
});

router.put('/:key', (req, res) => {
  const { value } = req.body;
  db.prepare(`
    INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
  `).run(req.session.userId, req.params.key, JSON.stringify(value));
  res.json({ success: true });
});

module.exports = router;
