// routes/etf.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withEtfCalcs } = require('../utils/calc');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM etfs WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(rows.map(withEtfCalcs));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM etfs WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: 'ETF not found' });
  res.json(withEtfCalcs(row));
});

router.post('/', (req, res) => {
  const { etf_name, quantity, avg_price, current_price, broker, notes } = req.body;
  if (!etf_name || !quantity || !avg_price) {
    return res.status(400).json({ error: 'etf_name, quantity and avg_price are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO etfs (user_id, etf_name, quantity, avg_price, current_price, broker, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(req.session.userId, etf_name, quantity, avg_price, current_price || 0, broker || null, notes || null);
  const row = db.prepare('SELECT * FROM etfs WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.session.userId);
  res.status(201).json(withEtfCalcs(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM etfs WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'ETF not found' });
  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE etfs SET etf_name = ?, quantity = ?, avg_price = ?, current_price = ?,
      broker = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(merged.etf_name, merged.quantity, merged.avg_price, merged.current_price, merged.broker, merged.notes, req.params.id, req.session.userId);
  const row = db.prepare('SELECT * FROM etfs WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  res.json(withEtfCalcs(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM etfs WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'ETF not found' });
  res.json({ success: true });
});

module.exports = router;
