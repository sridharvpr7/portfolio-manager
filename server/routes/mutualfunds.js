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

  // previous_nav starts equal to current_nav so Today's P/L is 0 until the
  // user records an actual NAV update via "Update NAV".
  const startingNav = current_nav || 0;

  const stmt = db.prepare(`
    INSERT INTO mutual_funds
      (fund_name, amc, category, folio_number, purchase_nav, current_nav, previous_nav, units, investment_mode, investment_date, broker, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    fund_name, amc || null, category || null, folio_number || null, purchase_nav,
    startingNav, startingNav, units, investment_mode || 'Lump Sum', investment_date || null, broker || null, notes || null
  );
  const row = db.prepare('SELECT * FROM mutual_funds WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withMfCalcs(row));
});

// UPDATE mutual fund (full edit form — does not touch previous_nav so it
// never falsely resets Today's P/L; use PUT /:id/nav for that)
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

// DAILY NAV UPDATE — the one-click flow for daily use, mirrors the stocks
// "Update Price" route. Shifts current_nav into previous_nav, then saves
// the new NAV the user just entered.
router.put('/:id/nav', (req, res) => {
  const existing = db.prepare('SELECT * FROM mutual_funds WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Mutual fund not found' });

  const newNav = parseFloat(req.body.current_nav);
  if (isNaN(newNav) || newNav < 0) {
    return res.status(400).json({ error: 'A valid current_nav is required' });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  db.prepare(`
    UPDATE mutual_funds SET
      previous_nav = ?, current_nav = ?, nav_updated_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(existing.current_nav || 0, newNav, today, req.params.id);

  const row = db.prepare('SELECT * FROM mutual_funds WHERE id = ?').get(req.params.id);
  res.json(withMfCalcs(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM mutual_funds WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Mutual fund not found' });
  res.json({ success: true });
});

module.exports = router;
