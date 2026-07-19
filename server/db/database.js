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
  exchange TEXT NOT NULL,           -- NSE / BSE
  stock_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  sector TEXT,
  quantity REAL NOT NULL,
  avg_buy_price REAL NOT NULL,
  current_price REAL DEFAULT 0,
  previous_close REAL DEFAULT 0,    -- yesterday's price, used for Today's P/L
  price_updated_at TEXT,            -- date the price was last refreshed (YYYY-MM-DD)
  broker TEXT,
  purchase_date TEXT,
  brokerage REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- MIGRATION: add new columns to a stocks table created by an
// older version of the app, without touching any existing data. ----------
(function migrateStocksTable() {
  const existingCols = db.prepare('PRAGMA table_info(stocks)').all().map(c => c.name);
  if (!existingCols.includes('previous_close')) {
    db.exec('ALTER TABLE stocks ADD COLUMN previous_close REAL DEFAULT 0');
    // Seed previous_close with current_price so Today's P/L starts at 0
    // instead of showing a false jump for existing holdings.
    db.exec('UPDATE stocks SET previous_close = current_price WHERE previous_close IS NULL OR previous_close = 0');
  }
  if (!existingCols.includes('price_updated_at')) {
    db.exec('ALTER TABLE stocks ADD COLUMN price_updated_at TEXT');
  }
})();

// ---------- MUTUAL FUNDS ----------
db.exec(`
CREATE TABLE IF NOT EXISTS mutual_funds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_name TEXT NOT NULL,
  amc TEXT,
  category TEXT,
  folio_number TEXT,
  purchase_nav REAL NOT NULL,
  current_nav REAL DEFAULT 0,
  previous_nav REAL DEFAULT 0,      -- yesterday's NAV, used for Today's P/L
  nav_updated_at TEXT,              -- date the NAV was last refreshed (YYYY-MM-DD)
  units REAL NOT NULL,
  investment_mode TEXT,             -- SIP / Lump Sum
  investment_date TEXT,
  broker TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- MIGRATION: add new columns to a mutual_funds table created by
// an older version of the app, without touching any existing data. ----------
(function migrateMutualFundsTable() {
  const existingCols = db.prepare('PRAGMA table_info(mutual_funds)').all().map(c => c.name);
  if (!existingCols.includes('previous_nav')) {
    db.exec('ALTER TABLE mutual_funds ADD COLUMN previous_nav REAL DEFAULT 0');
    // Seed previous_nav with current_nav so Today's P/L starts at 0 instead
    // of showing a false jump for existing holdings.
    db.exec('UPDATE mutual_funds SET previous_nav = current_nav WHERE previous_nav IS NULL OR previous_nav = 0');
  }
  if (!existingCols.includes('nav_updated_at')) {
    db.exec('ALTER TABLE mutual_funds ADD COLUMN nav_updated_at TEXT');
  }
})();

// ---------- ETF ----------
db.exec(`
CREATE TABLE IF NOT EXISTS etfs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

module.exports = db;
