// routes/stocks.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withStockCalcs } = require('../utils/calc');

// GET all stocks
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM stocks ORDER BY created_at DESC').all();
  res.json(rows.map(withStockCalcs));
});

// GET single stock
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM stocks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Stock not found' });
  res.json(withStockCalcs(row));
});

// CREATE stock
router.post('/', (req, res) => {
  const {
    exchange, stock_name, symbol, sector, quantity,
    avg_buy_price, current_price, broker, purchase_date, brokerage, notes
  } = req.body;

  if (!exchange || !stock_name || !symbol || !quantity || !avg_buy_price) {
    return res.status(400).json({ error: 'exchange, stock_name, symbol, quantity and avg_buy_price are required' });
  }

  // previous_close starts equal to current_price so Today's P/L is 0 until
  // the user records an actual price update via "Update Price".
  const startingPrice = current_price || 0;

  const stmt = db.prepare(`
    INSERT INTO stocks
      (exchange, stock_name, symbol, sector, quantity, avg_buy_price, current_price, previous_close, broker, purchase_date, brokerage, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    exchange, stock_name, symbol, sector || null, quantity,
    avg_buy_price, startingPrice, startingPrice, broker || null, purchase_date || null, brokerage || 0, notes || null
  );
  const row = db.prepare('SELECT * FROM stocks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withStockCalcs(row));
});

// UPDATE stock (full edit form — does not touch previous_close so it never
// falsely resets Today's P/L; use PUT /:id/price for that)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM stocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Stock not found' });

  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE stocks SET
      exchange = ?, stock_name = ?, symbol = ?, sector = ?, quantity = ?,
      avg_buy_price = ?, current_price = ?, broker = ?, purchase_date = ?,
      brokerage = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    merged.exchange, merged.stock_name, merged.symbol, merged.sector, merged.quantity,
    merged.avg_buy_price, merged.current_price, merged.broker, merged.purchase_date,
    merged.brokerage, merged.notes, req.params.id
  );
  const row = db.prepare('SELECT * FROM stocks WHERE id = ?').get(req.params.id);
  res.json(withStockCalcs(row));
});

// DAILY PRICE UPDATE — the one-click flow for daily use.
// Shifts the stock's current current_price into previous_close, then saves
// the new price the user just entered. This is what makes Today's P/L
// accurate day over day, and it's the only route that should ever change
// previous_close.
router.put('/:id/price', (req, res) => {
  const existing = db.prepare('SELECT * FROM stocks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Stock not found' });

  const newPrice = parseFloat(req.body.current_price);
  if (isNaN(newPrice) || newPrice < 0) {
    return res.status(400).json({ error: 'A valid current_price is required' });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  db.prepare(`
    UPDATE stocks SET
      previous_close = ?, current_price = ?, price_updated_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(existing.current_price || 0, newPrice, today, req.params.id);

  const row = db.prepare('SELECT * FROM stocks WHERE id = ?').get(req.params.id);
  res.json(withStockCalcs(row));
});

// DELETE stock
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM stocks WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Stock not found' });
  res.json({ success: true });
});

module.exports = router;
