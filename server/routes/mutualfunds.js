// routes/mutualfunds.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { withMfCalcs } = require('../utils/calc');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM mutual_funds ORDER BY created_at DESC').all();
  res.json(rows.map(withMfCalcs));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM mutual_funds WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Mutual fund not found' });
  res.json(withMfCalcs(row));
});

router.post('/', (req, res) => {
  const {
    fund_name, amc, category, folio_number, purchase_nav,
    current_nav, units, investment_mode, investment_date, broker, notes
  } = req.body;

  if (!fund_name || !purchase_nav || !units) {
    return res.status(400).json({ error: 'fund_name, purchase_nav and units are required' });
  }

  const stmt = db.prepare(`
    INSERT INTO mutual_funds
      (fund_name, amc, category, folio_number, purchase_nav, current_nav, units, investment_mode, investment_date, broker, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    fund_name, amc || null, category || null, folio_number || null, purchase_nav,
    current_nav || 0, units, investment_mode || 'Lump Sum', investment_date || null, broker || null, notes || null
  );
  const row = db.prepare('SELECT * FROM mutual_funds WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withMfCalcs(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM mutual_funds WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Mutual fund not found' });

  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE mutual_funds SET
      fund_name = ?, amc = ?, category = ?, folio_number = ?, purchase_nav = ?,
      current_nav = ?, units = ?, investment_mode = ?, investment_date = ?,
      broker = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    merged.fund_name, merged.amc, merged.category, merged.folio_number, merged.purchase_nav,
    merged.current_nav, merged.units, merged.investment_mode, merged.investment_date,
    merged.broker, merged.notes, req.params.id
  );
  const row = db.prepare('SELECT * FROM mutual_funds WHERE id = ?').get(req.params.id);
  res.json(withMfCalcs(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM mutual_funds WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Mutual fund not found' });
  res.json({ success: true });
});

module.exports = router;
