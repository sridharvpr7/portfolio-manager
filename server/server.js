// server.js
// Entry point for the Portfolio Manager backend.
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stocks');
const mfRoutes = require('./routes/mutualfunds');
const etfRoutes = require('./routes/etf');
const fnoRoutes = require('./routes/fno');
const otherRoutes = require('./routes/other');
const dashboardRoutes = require('./routes/dashboard');
const backupRoutes = require('./routes/backup');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'portfolio-manager-local-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 hour session
}));

// Public auth routes
app.use('/api/auth', authRoutes);

// Protected data routes
app.use('/api/stocks', requireAuth, stockRoutes);
app.use('/api/mutualfunds', requireAuth, mfRoutes);
app.use('/api/etf', requireAuth, etfRoutes);
app.use('/api/fno', requireAuth, fnoRoutes);
app.use('/api/other', requireAuth, otherRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/backup', requireAuth, backupRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Portfolio Manager running at http://localhost:${PORT}\n`);
});
