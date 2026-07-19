// routes/backup.js
// Exports/imports the entire database as a single JSON document so the
// user can back up or restore their portfolio manually.
const express = require('express');
const router = express.Router();
const db = require('../db/database');

const TABLES = ['stocks', 'mutual_funds', 'etfs', 'fno', 'other_assets'];

router.get('/export', (req, res) => {
  const backup = { exported_at: new Date().toISOString(), data: {} };
  TABLES.forEach(t => { backup.data[t] = db.prepare(`SELECT * FROM ${t}`).all(); });
  res.setHeader('Content-Disposition', 'attachment; filename="portfolio-backup.json"');
  res.json(backup);
});

router.post('/import', (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid backup file.' });
  }

  const importAll = db.transaction(() => {
    TABLES.forEach(t => {
      if (!Array.isArray(data[t])) return;
      db.prepare(`DELETE FROM ${t}`).run();
      data[t].forEach(row => {
        const cols = Object.keys(row).filter(c => c !== 'id');
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map(c => row[c]);
        db.prepare(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values);
      });
    });
  });

  try {
    importAll();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Restore failed: ' + e.message });
  }
});

module.exports = router;
