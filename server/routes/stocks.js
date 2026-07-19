// routes/stocks.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withStockCalcs } = require('../utils/calc');

// GET all stocks
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM stocks WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(rows.map(withStockCalcs));
});

// GET single stock
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM stocks WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
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

  const stmt = db.prepare(`
    INSERT INTO stocks
      (user_id, exchange, stock_name, symbol, sector, quantity, avg_buy_price, current_price, broker, purchase_date, brokerage, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    req.session.userId, exchange, stock_name, symbol, sector || null, quantity,
    avg_buy_price, current_price || 0, broker || null, purchase_date || null, brokerage || 0, notes || null
  );
  const row = db.prepare('SELECT * FROM stocks WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.session.userId);
  res.status(201).json(withStockCalcs(row));
});

// UPDATE stock
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM stocks WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'Stock not found' });

  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE stocks SET
      exchange = ?, stock_name = ?, symbol = ?, sector = ?, quantity = ?,
      avg_buy_price = ?, current_price = ?, broker = ?, purchase_date = ?,
      brokerage = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    merged.exchange, merged.stock_name, merged.symbol, merged.sector, merged.quantity,
    merged.avg_buy_price, merged.current_price, merged.broker, merged.purchase_date,
    merged.brokerage, merged.notes, req.params.id, req.session.userId
  );
  const row = db.prepare('SELECT * FROM stocks WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  res.json(withStockCalcs(row));
});

// DELETE stock
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM stocks WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Stock not found' });
  res.json({ success: true });
});

module.exports = router;
