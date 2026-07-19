// routes/fno.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withFnoCalcs } = require('../utils/calc');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM fno WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(rows.map(withFnoCalcs));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM fno WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: 'F&O position not found' });
  res.json(withFnoCalcs(row));
});

router.post('/', (req, res) => {
  const {
    instrument, segment, option_type, strike_price, expiry_date,
    premium, lot_size, num_lots, entry_price, current_price, broker, notes
  } = req.body;

  if (!instrument || !segment || !lot_size || !num_lots || !entry_price) {
    return res.status(400).json({ error: 'instrument, segment, lot_size, num_lots and entry_price are required' });
  }

  const stmt = db.prepare(`
    INSERT INTO fno
      (user_id, instrument, segment, option_type, strike_price, expiry_date, premium, lot_size, num_lots, entry_price, current_price, broker, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    req.session.userId, instrument, segment, option_type || null, strike_price || null, expiry_date || null,
    premium || null, lot_size, num_lots, entry_price, current_price || 0, broker || null, notes || null
  );
  const row = db.prepare('SELECT * FROM fno WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.session.userId);
  res.status(201).json(withFnoCalcs(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM fno WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'F&O position not found' });
  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE fno SET instrument = ?, segment = ?, option_type = ?, strike_price = ?,
      expiry_date = ?, premium = ?, lot_size = ?, num_lots = ?, entry_price = ?,
      current_price = ?, broker = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    merged.instrument, merged.segment, merged.option_type, merged.strike_price,
    merged.expiry_date, merged.premium, merged.lot_size, merged.num_lots, merged.entry_price,
    merged.current_price, merged.broker, merged.notes, req.params.id, req.session.userId
  );
  const row = db.prepare('SELECT * FROM fno WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  res.json(withFnoCalcs(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM fno WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'F&O position not found' });
  res.json({ success: true });
});

module.exports = router;
