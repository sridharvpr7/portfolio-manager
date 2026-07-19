// routes/other.js
// Handles Gold, Bonds and Cash entries (grouped as "other assets").
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withOtherCalcs } = require('../utils/calc');

router.get('/', (req, res) => {
  const { asset_type } = req.query;
  const rows = asset_type
    ? db.prepare('SELECT * FROM other_assets WHERE user_id = ? AND asset_type = ? ORDER BY created_at DESC').all(req.session.userId, asset_type)
    : db.prepare('SELECT * FROM other_assets WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(rows.map(withOtherCalcs));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM other_assets WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: 'Asset not found' });
  res.json(withOtherCalcs(row));
});

router.post('/', (req, res) => {
  const { asset_type, name, invested_amount, current_value, broker, purchase_date, notes } = req.body;
  if (!asset_type || !name || invested_amount === undefined) {
    return res.status(400).json({ error: 'asset_type, name and invested_amount are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO other_assets (user_id, asset_type, name, invested_amount, current_value, broker, purchase_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    req.session.userId, asset_type, name, invested_amount, current_value ?? invested_amount, broker || null, purchase_date || null, notes || null
  );
  const row = db.prepare('SELECT * FROM other_assets WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.session.userId);
  res.status(201).json(withOtherCalcs(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM other_assets WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'Asset not found' });
  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE other_assets SET asset_type = ?, name = ?, invested_amount = ?, current_value = ?,
      broker = ?, purchase_date = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    merged.asset_type, merged.name, merged.invested_amount, merged.current_value,
    merged.broker, merged.purchase_date, merged.notes, req.params.id, req.session.userId
  );
  const row = db.prepare('SELECT * FROM other_assets WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  res.json(withOtherCalcs(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM other_assets WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Asset not found' });
  res.json({ success: true });
});

module.exports = router;
