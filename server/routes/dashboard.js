// routes/dashboard.js
// Aggregates every category into the dashboard summary: net worth,
// profit/loss, asset allocation, sector allocation, broker allocation,
// top gainer/loser, and simple report data.
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const {
  round2, withStockCalcs, withMfCalcs, withEtfCalcs, withFnoCalcs, withOtherCalcs
} = require('../utils/calc');

function getAll(userId) {
  const stocks = db.prepare('SELECT * FROM stocks WHERE user_id = ?').all(userId).map(withStockCalcs);
  const mfs = db.prepare('SELECT * FROM mutual_funds WHERE user_id = ?').all(userId).map(withMfCalcs);
  const etfs = db.prepare('SELECT * FROM etfs WHERE user_id = ?').all(userId).map(withEtfCalcs);
  const fno = db.prepare('SELECT * FROM fno WHERE user_id = ?').all(userId).map(withFnoCalcs);
  const other = db.prepare('SELECT * FROM other_assets WHERE user_id = ?').all(userId).map(withOtherCalcs);
  return { stocks, mfs, etfs, fno, other };
}

function sumBy(arr, field) {
  return round2(arr.reduce((s, r) => s + (Number(r[field]) || 0), 0));
}

router.get('/summary', (req, res) => {
  const { stocks, mfs, etfs, fno, other } = getAll(req.session.userId);

  const cash = other.filter(o => o.asset_type === 'Cash');
  const gold = other.filter(o => o.asset_type === 'Gold');
  const bonds = other.filter(o => o.asset_type === 'Bonds');

  const totalInvestment = round2(
    sumBy(stocks, 'investment') + sumBy(mfs, 'investment') + sumBy(etfs, 'investment') +
    sumBy(fno, 'investment') + sumBy(other, 'investment')
  );

  const currentValue = round2(
    sumBy(stocks, 'current_value') + sumBy(mfs, 'current_value') + sumBy(etfs, 'current_value') +
    sumBy(fno, 'current_value') + sumBy(other, 'current_value')
  );

  const netWorth = currentValue; // sum of current value across all holdings incl. cash
  const overallPnl = round2(currentValue - totalInvestment);
  const overallReturnPct = totalInvestment !== 0 ? round2((overallPnl / totalInvestment) * 100) : 0;

  // "Today's P/L" is approximated as the P/L of market-linked holdings
  // (stocks, ETFs, F&O) since MFs/gold/bonds don't have an intraday price feed here.
  const todaysPnl = round2(sumBy(stocks, 'pnl') + sumBy(etfs, 'pnl') + sumBy(fno, 'pnl'));

  // Asset allocation
  const assetAllocation = [
    { label: 'Stocks', value: sumBy(stocks, 'current_value') },
    { label: 'Mutual Funds', value: sumBy(mfs, 'current_value') },
    { label: 'ETF', value: sumBy(etfs, 'current_value') },
    { label: 'F&O', value: sumBy(fno, 'current_value') },
    { label: 'Gold', value: sumBy(gold, 'current_value') },
    { label: 'Bonds', value: sumBy(bonds, 'current_value') },
    { label: 'Cash', value: sumBy(cash, 'current_value') }
  ].filter(a => a.value > 0);

  // Sector allocation (stocks only)
  const sectorMap = {};
  stocks.forEach(s => {
    const key = s.sector || 'Uncategorized';
    sectorMap[key] = (sectorMap[key] || 0) + s.current_value;
  });
  const sectorAllocation = Object.entries(sectorMap).map(([label, value]) => ({ label, value: round2(value) }));

  // Broker allocation (across stocks, MFs, ETFs)
  const brokerMap = {};
  [...stocks, ...mfs, ...etfs].forEach(r => {
    const key = r.broker || 'Unspecified';
    brokerMap[key] = (brokerMap[key] || 0) + r.current_value;
  });
  const brokerAllocation = Object.entries(brokerMap).map(([label, value]) => ({ label, value: round2(value) }));

  // Top gainer / loser across all market-linked positions
  const allPositions = [
    ...stocks.map(s => ({ name: s.stock_name, symbol: s.symbol, pnl: s.pnl, return_pct: s.return_pct, type: 'Stock' })),
    ...etfs.map(e => ({ name: e.etf_name, symbol: e.etf_name, pnl: e.pnl, return_pct: e.return_pct, type: 'ETF' })),
    ...mfs.map(m => ({ name: m.fund_name, symbol: m.fund_name, pnl: m.pnl, return_pct: m.return_pct, type: 'Mutual Fund' })),
    ...fno.map(f => ({ name: f.instrument, symbol: f.instrument, pnl: f.pnl, return_pct: f.return_pct, type: 'F&O' }))
  ];
  const topGainer = allPositions.length ? allPositions.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const topLoser = allPositions.length ? allPositions.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null;

  res.json({
    total_net_worth: netWorth,
    todays_pnl: todaysPnl,
    overall_pnl: overallPnl,
    overall_return_pct: overallReturnPct,
    total_investment: totalInvestment,
    current_portfolio_value: currentValue,
    cash_balance: sumBy(cash, 'current_value'),
    total_stocks: stocks.length,
    total_mutual_funds: mfs.length,
    total_fno_positions: fno.length,
    total_etfs: etfs.length,
    asset_allocation: assetAllocation,
    sector_allocation: sectorAllocation,
    broker_allocation: brokerAllocation,
    top_gainer: topGainer && topGainer.pnl > 0 ? topGainer : null,
    top_loser: topLoser && topLoser.pnl < 0 ? topLoser : null
  });
});

// Monthly investment timeline (stocks + MFs + ETFs, grouped by purchase month)
router.get('/timeline', (req, res) => {
  const { stocks, mfs, etfs } = getAll(req.session.userId);
  const monthMap = {};

  function addToMonth(dateStr, amount) {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + amount;
  }

  stocks.forEach(s => addToMonth(s.purchase_date, s.investment));
  mfs.forEach(m => addToMonth(m.investment_date, m.investment));

  const months = Object.keys(monthMap).sort();
  res.json(months.map(m => ({ month: m, invested: round2(monthMap[m]) })));
});

module.exports = router;
