// routes/other.js
// Handles Gold, Bonds and Cash entries (grouped as "other assets").
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withOtherCalcs } = require('../utils/calc');

router.get('/', (req, res) => {
  const { asset_type } = req.query;
  const rows = asset_type
    ? db.prepare('SELECT * FROM other_assets WHERE asset_type = ? ORDER BY created_at DESC').all(asset_type)
    : db.prepare('SELECT * FROM other_assets ORDER BY created_at DESC').all();
  res.json(rows.map(withOtherCalcs));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM other_assets WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Asset not found' });
  res.json(withOtherCalcs(row));
});

router.post('/', (req, res) => {
  const { asset_type, name, invested_amount, current_value, broker, purchase_date, notes } = req.body;
  if (!asset_type || !name || invested_amount === undefined) {
    return res.status(400).json({ error: 'asset_type, name and invested_amount are required' });
  }
  // previous_value starts equal to current_value so Today's P/L is 0 until
  // the user records an actual value update via "Update Value".
  const startingValue = current_value ?? invested_amount;
  const stmt = db.prepare(`
    INSERT INTO other_assets (asset_type, name, invested_amount, current_value, previous_value, broker, purchase_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    asset_type, name, invested_amount, startingValue, startingValue, broker || null, purchase_date || null, notes || null
  );
  const row = db.prepare('SELECT * FROM other_assets WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withOtherCalcs(row));
});

// UPDATE asset (full edit form — does not touch previous_value so it never
// falsely resets Today's P/L; use PUT /:id/value for that)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM other_assets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Asset not found' });
  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE other_assets SET asset_type = ?, name = ?, invested_amount = ?, current_value = ?,
      broker = ?, purchase_date = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    merged.asset_type, merged.name, merged.invested_amount, merged.current_value,
    merged.broker, merged.purchase_date, merged.notes, req.params.id
  );
  const row = db.prepare('SELECT * FROM other_assets WHERE id = ?').get(req.params.id);
  res.json(withOtherCalcs(row));
});

// DAILY VALUE UPDATE — one-click flow for daily use, mirrors stocks'
// PUT /:id/price. Shifts current_value into previous_value, then saves
// the new value the user just entered. Useful for Gold/Bonds/FD where the
// "price" the user tracks is really the whole holding's market value.
router.put('/:id/value', (req, res) => {
  const existing = db.prepare('SELECT * FROM other_assets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Asset not found' });

  const newValue = parseFloat(req.body.current_value);
  if (isNaN(newValue) || newValue < 0) {
    return res.status(400).json({ error: 'A valid current_value is required' });
  }

  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    UPDATE other_assets SET previous_value = ?, current_value = ?, value_updated_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(existing.current_value || 0, newValue, today, req.params.id);

  const row = db.prepare('SELECT * FROM other_assets WHERE id = ?').get(req.params.id);
  res.json(withOtherCalcs(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM other_assets WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Asset not found' });
  res.json({ success: true });
});

module.exports = router;
