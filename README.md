# Portfolio Manager — Indian Stock Market Investment Tracker

A production-ready, self-hosted web app for manually tracking your Stocks,
Mutual Funds, ETFs, F&O positions, Gold, Bonds and Cash. **This app never
places trades** — it only lets you record what you already hold and
calculates your investment, current value, profit/loss and net worth
automatically.

## Tech Stack
- **Frontend:** HTML5, CSS3 (custom glassmorphism dark theme), vanilla JS (ES6+), Chart.js, GSAP, Font Awesome
- **Backend:** Node.js + Express.js, REST API
- **Database:** SQLite (`better-sqlite3`) — easy to swap for PostgreSQL later since all SQL lives in `server/routes/*.js`

## Getting Started

```bash
cd portfolio-app
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

The very first time you open the app you'll be asked to create a local
username and password (stored as a bcrypt hash in SQLite) — there is no
external login service, everything stays on your machine.

The database starts **completely empty**: no sample stocks, no dummy
charts. Every card and chart shows a friendly empty state until you add
your own data.

## Project Structure

```
portfolio-app/
├── package.json
├── server/
│   ├── server.js              # Express app entry point
│   ├── db/database.js         # SQLite schema (creates tables on first run)
│   ├── middleware/requireAuth.js
│   ├── utils/calc.js          # Shared investment/current-value/P&L formulas
│   └── routes/
│       ├── auth.js            # Register / login / logout (local, session-based)
│       ├── stocks.js          # Stocks CRUD
│       ├── mutualfunds.js     # Mutual Funds CRUD (+ simplified XIRR)
│       ├── etf.js             # ETF CRUD
│       ├── fno.js             # Futures & Options CRUD
│       ├── other.js           # Gold / Bonds / Cash CRUD
│       ├── dashboard.js       # Net worth, allocations, top gainer/loser, timeline
│       ├── backup.js          # Export/import the whole DB as JSON
│       └── settings.js        # Theme / notification preference storage
├── public/
│   ├── index.html             # Single-page app shell (sidebar + views)
│   ├── css/style.css          # Premium dark glassmorphism theme
│   └── js/
│       ├── api.js             # fetch() wrapper for every endpoint
│       ├── ui.js              # toasts, modals, formatters, form builder
│       ├── charts.js          # Chart.js instance registry
│       ├── main.js            # Auth flow, routing, search, theme
│       ├── dashboard.js        mutualfunds.js   analysis.js
│       ├── stocks.js           etf.js           reports.js
│       ├── fno.js              other.js         settings.js
└── data/                      # portfolio.db is created here on first run (git-ignored)
```

## What's implemented

- **Dashboard:** Total Net Worth, Today's P/L, Overall P/L, Total Investment,
  Current Portfolio Value, Cash Balance, counts per category, Asset
  Allocation, Sector Allocation, Investment Timeline, Top Gainer/Loser.
- **Categories:** Stocks (NSE/BSE), Mutual Funds (SIP/Lump Sum), ETF,
  Futures & Options, and Gold/Bonds/Cash — each with full Create/Read/
  Update/Delete and instant recalculation.
- **Automatic calculations:** Investment, Current Value, P/L, Return %,
  and a simplified point-to-point XIRR estimate for mutual funds.
- **Portfolio Analysis:** broker allocation, market-cap/category split,
  top 8 holdings by value.
- **Reports:** Portfolio Summary, Profit Report, Capital Gain Report,
  Mutual Fund Report, F&O Report — each viewable/printable (Print → Save
  as PDF from your browser) or exportable as CSV (opens directly in Excel).
- **Settings:** Dark/Light mode, notification preference toggles (stored,
  not yet wired to a live push/email service), Backup Database (download
  a JSON snapshot) and Restore Database (upload it back).
- **Security:** local username/password with bcrypt hashing, server-side
  sessions, and all data API routes require an active session.
- **Search:** a global search box that jumps to the first category
  containing a matching stock, fund, or instrument name.

## Honest limitations (so nothing surprises you)

- **Today's P/L** is approximated from your market-linked holdings
  (stocks, ETFs, F&O) since the app has no live intraday price feed —
  you update `current_price`/`current_nav` yourself, there's no broker
  API integration.
- **XIRR** for mutual funds is a simplified point-to-point annualized
  return (single investment → today), not a full multi-cash-flow XIRR.
  Swap in a proper XIRR library if you need audit-grade tax figures.
- **Tax/Capital Gains report** shows unrealized gain on current holdings;
  it is not a substitute for a CA-prepared capital gains statement (no
  short/long-term split, no grandfathering rules, etc.).
- Session cookies are HTTP-only but the app is designed for local/
  private-network use over `http://localhost` — put it behind HTTPS if
  you ever expose it beyond your own machine.

## Upgrading to PostgreSQL later

All SQL lives in `server/routes/*.js` using `better-sqlite3`'s synchronous
API. To move to PostgreSQL, swap `server/db/database.js` for a `pg` pool
and update each route's queries (parameter placeholders change from `?`
to `$1, $2, …`). The route/response shape stays identical, so the
frontend needs no changes.
