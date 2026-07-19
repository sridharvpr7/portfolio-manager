// routes/auth.js
// Simple local authentication. Since this is a single-user personal app,
// registration is only allowed if no user exists yet.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');

router.get('/status', (req, res) => {
  const loggedIn = !!(req.session && req.session.userId);
  let username = null;
  if (loggedIn) {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
    if (user) username = user.username;
  }
  res.json({
    loggedIn,
    username
  });
});

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username and a password of at least 6 characters are required.' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    req.session.userId = info.lastInsertRowid;
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different one.' });
    }
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.userId = user.id;
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

module.exports = router;
