// routes/fno.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withFnoCalcs } = require('../utils/calc');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM fno ORDER BY created_at DESC').all();
  res.json(rows.map(withFnoCalcs));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM fno WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'F&O position not found' });
  res.json(withFnoCalcs(row));
});

router.post('/', (req, res) => {
  const {
    instrument, segment, option_type, strike_price, expiry_date,
    premium, lot_size, num_lots, entry_price, current_price, entry_date, broker, notes
  } = req.body;

  if (!instrument || !segment || !lot_size || !num_lots || !entry_price) {
    return res.status(400).json({ error: 'instrument, segment, lot_size, num_lots and entry_price are required' });
  }

  // previous_price starts equal to current_price so Today's P/L is 0 until
  // the user records an actual price update via "Update Price".
  const startingPrice = current_price || 0;

  const stmt = db.prepare(`
    INSERT INTO fno
      (instrument, segment, option_type, strike_price, expiry_date, premium, lot_size, num_lots, entry_price, current_price, previous_price, entry_date, broker, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    instrument, segment, option_type || null, strike_price || null, expiry_date || null,
    premium || null, lot_size, num_lots, entry_price, startingPrice, startingPrice, entry_date || null, broker || null, notes || null
  );
  const row = db.prepare('SELECT * FROM fno WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withFnoCalcs(row));
});

// UPDATE F&O position (full edit form — does not touch previous_price so
// it never falsely resets Today's P/L; use PUT /:id/price for that)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM fno WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'F&O position not found' });
  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE fno SET instrument = ?, segment = ?, option_type = ?, strike_price = ?,
      expiry_date = ?, premium = ?, lot_size = ?, num_lots = ?, entry_price = ?,
      current_price = ?, entry_date = ?, broker = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    merged.instrument, merged.segment, merged.option_type, merged.strike_price,
    merged.expiry_date, merged.premium, merged.lot_size, merged.num_lots, merged.entry_price,
    merged.current_price, merged.entry_date, merged.broker, merged.notes, req.params.id
  );
  const row = db.prepare('SELECT * FROM fno WHERE id = ?').get(req.params.id);
  res.json(withFnoCalcs(row));
});

// DAILY PRICE UPDATE — one-click flow for daily use, mirrors stocks'
// PUT /:id/price. Shifts current_price into previous_price, then saves
// the new price the user just entered.
router.put('/:id/price', (req, res) => {
  const existing = db.prepare('SELECT * FROM fno WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'F&O position not found' });

  const newPrice = parseFloat(req.body.current_price);
  if (isNaN(newPrice) || newPrice < 0) {
    return res.status(400).json({ error: 'A valid current_price is required' });
  }

  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    UPDATE fno SET previous_price = ?, current_price = ?, price_updated_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(existing.current_price || 0, newPrice, today, req.params.id);

  const row = db.prepare('SELECT * FROM fno WHERE id = ?').get(req.params.id);
  res.json(withFnoCalcs(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM fno WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'F&O position not found' });
  res.json({ success: true });
});

module.exports = router;
