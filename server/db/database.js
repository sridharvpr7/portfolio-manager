// database.js
// Initializes the SQLite database and creates all required tables.
// NOTE: No sample/demo data is ever inserted. All tables start empty.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'portfolio.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- USERS (local authentication) ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- STOCKS ----------
db.exec(`
CREATE TABLE IF NOT EXISTS stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,           -- NSE / BSE
  stock_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  sector TEXT,
  quantity REAL NOT NULL,
  avg_buy_price REAL NOT NULL,
  current_price REAL DEFAULT 0,
  broker TEXT,
  purchase_date TEXT,
  brokerage REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- MUTUAL FUNDS ----------
db.exec(`
CREATE TABLE IF NOT EXISTS mutual_funds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fund_name TEXT NOT NULL,
  amc TEXT,
  category TEXT,
  folio_number TEXT,
  purchase_nav REAL NOT NULL,
  current_nav REAL DEFAULT 0,
  units REAL NOT NULL,
  investment_mode TEXT,             -- SIP / Lump Sum
  investment_date TEXT,
  broker TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- ETF ----------
db.exec(`
CREATE TABLE IF NOT EXISTS etfs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  etf_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  avg_price REAL NOT NULL,
  current_price REAL DEFAULT 0,
  broker TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- F&O (Futures & Options) ----------
db.exec(`
CREATE TABLE IF NOT EXISTS fno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  segment TEXT NOT NULL,            -- Future / Option
  option_type TEXT,                 -- Call / Put (nullable for futures)
  strike_price REAL,
  expiry_date TEXT,
  premium REAL,
  lot_size REAL NOT NULL,
  num_lots REAL NOT NULL,
  entry_price REAL NOT NULL,
  current_price REAL DEFAULT 0,
  broker TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- OTHER ASSETS (Gold, Bonds, Cash) ----------
db.exec(`
CREATE TABLE IF NOT EXISTS other_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,         -- Gold / Bonds / Cash
  name TEXT NOT NULL,
  invested_amount REAL NOT NULL,
  current_value REAL DEFAULT 0,
  broker TEXT,
  purchase_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- NOTIFICATIONS SETTINGS ----------
db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (user_id, key)
);
`);

module.exports = db;
