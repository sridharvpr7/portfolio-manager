// routes/etf.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withEtfCalcs } = require('../utils/calc');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM etfs ORDER BY created_at DESC').all();
  res.json(rows.map(withEtfCalcs));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM etfs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'ETF not found' });
  res.json(withEtfCalcs(row));
});

router.post('/', (req, res) => {
  const { etf_name, quantity, avg_price, current_price, purchase_date, broker, notes } = req.body;
  if (!etf_name || !quantity || !avg_price) {
    return res.status(400).json({ error: 'etf_name, quantity and avg_price are required' });
  }
  // previous_price starts equal to current_price so Today's P/L is 0 until
  // the user records an actual price update via "Update Price".
  const startingPrice = current_price || 0;
  const stmt = db.prepare(`
    INSERT INTO etfs (etf_name, quantity, avg_price, current_price, previous_price, purchase_date, broker, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(etf_name, quantity, avg_price, startingPrice, startingPrice, purchase_date || null, broker || null, notes || null);
  const row = db.prepare('SELECT * FROM etfs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withEtfCalcs(row));
});

// UPDATE ETF (full edit form — does not touch previous_price so it never
// falsely resets Today's P/L; use PUT /:id/price for that)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM etfs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ETF not found' });
  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE etfs SET etf_name = ?, quantity = ?, avg_price = ?, current_price = ?,
      purchase_date = ?, broker = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(merged.etf_name, merged.quantity, merged.avg_price, merged.current_price, merged.purchase_date, merged.broker, merged.notes, req.params.id);
  const row = db.prepare('SELECT * FROM etfs WHERE id = ?').get(req.params.id);
  res.json(withEtfCalcs(row));
});

// DAILY PRICE UPDATE — one-click flow for daily use, mirrors stocks'
// PUT /:id/price. Shifts current_price into previous_price, then saves
// the new price the user just entered.
router.put('/:id/price', (req, res) => {
  const existing = db.prepare('SELECT * FROM etfs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ETF not found' });

  const newPrice = parseFloat(req.body.current_price);
  if (isNaN(newPrice) || newPrice < 0) {
    return res.status(400).json({ error: 'A valid current_price is required' });
  }

  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    UPDATE etfs SET previous_price = ?, current_price = ?, price_updated_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(existing.current_price || 0, newPrice, today, req.params.id);

  const row = db.prepare('SELECT * FROM etfs WHERE id = ?').get(req.params.id);
  res.json(withEtfCalcs(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM etfs WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'ETF not found' });
  res.json({ success: true });
});

module.exports = router;
