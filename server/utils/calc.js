// calc.js
// Shared calculation helpers used across all routes.
// Every derived number (investment, current value, P/L, return %, XIRR) is
// computed here on the server so the frontend never has to guess.

const { xirrSingleFlow } = require('./xirr');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// Shared "today vs yesterday" daily P/L math — used by every asset type
// that tracks a previous_* snapshot (previous_close / previous_nav /
// previous_price / previous_value). qty is 1 for value-based assets
// (Other/FD/Bonds) where the "price" already *is* the value.
function dailyPnl(qty, current, previous) {
  const prev = previous || 0;
  const change = (current || 0) - prev;
  const pnl = qty * change;
  const pct = prev !== 0 ? (change / prev) * 100 : 0;
  return { change: round2(change), pnl: round2(pnl), pct: round2(pct) };
}

// Shared XIRR/CAGR: for the current holding-level schema (one row, one
// effective purchase date, one current value) this reduces to CAGR, but
// uses the general XIRR solver so it keeps working unchanged once
// per-transaction cash flow history is added.
function annualizedReturn(investment, dateStr, currentValue) {
  return xirrSingleFlow(investment, dateStr, currentValue);
}

function withStockCalcs(row) {
  const investment = row.quantity * row.avg_buy_price;
  const currentValue = row.quantity * (row.current_price || 0);
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;

  // Today's P/L compares current_price against previous_close (yesterday's
  // saved price), independent of the buy price. Until a price update has
  // been recorded, previous_close mirrors current_price so this is 0.
  const daily = dailyPnl(row.quantity, row.current_price, row.previous_close);
  const xirr = annualizedReturn(investment, row.purchase_date, currentValue);

  return {
    ...row,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct),
    daily_change: daily.change,
    daily_pnl: daily.pnl,
    daily_pnl_pct: daily.pct,
    xirr,
    cagr: xirr
  };
}

function withMfCalcs(row) {
  const investment = row.units * row.purchase_nav;
  const currentValue = row.units * (row.current_nav || 0);
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;

  // Today's P/L compares current_nav against previous_nav (yesterday's
  // saved NAV), same pattern as stocks' previous_close.
  const daily = dailyPnl(row.units, row.current_nav, row.previous_nav);
  const xirr = annualizedReturn(investment, row.investment_date, currentValue);

  return {
    ...row,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct),
    daily_change: daily.change,
    daily_pnl: daily.pnl,
    daily_pnl_pct: daily.pct,
    xirr,
    cagr: xirr
  };
}

function withEtfCalcs(row) {
  const investment = row.quantity * row.avg_price;
  const currentValue = row.quantity * (row.current_price || 0);
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;

  const daily = dailyPnl(row.quantity, row.current_price, row.previous_price);
  const xirr = annualizedReturn(investment, row.purchase_date, currentValue);

  return {
    ...row,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct),
    daily_change: daily.change,
    daily_pnl: daily.pnl,
    daily_pnl_pct: daily.pct,
    xirr,
    cagr: xirr
  };
}

function withFnoCalcs(row) {
  const totalQty = row.lot_size * row.num_lots;
  const investment = row.entry_price * totalQty;
  const currentValue = (row.current_price || 0) * totalQty;
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;

  // F&O positions are typically short-dated (weeks, not years), so XIRR is
  // still computed for consistency but is far less meaningful here than
  // the plain return % — the UI should lead with return %, not XIRR, for
  // this asset type.
  const daily = dailyPnl(totalQty, row.current_price, row.previous_price);
  const xirr = annualizedReturn(investment, row.entry_date, currentValue);

  return {
    ...row,
    total_quantity: totalQty,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct),
    daily_change: daily.change,
    daily_pnl: daily.pnl,
    daily_pnl_pct: daily.pct,
    xirr,
    cagr: xirr
  };
}

function withOtherCalcs(row) {
  const investment = row.invested_amount;
  const currentValue = row.current_value || 0;
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;

  // Other assets (Gold, Bonds, Cash, FD, etc.) are value-based rather than
  // quantity * price, so qty is fixed at 1 and the "price" is the value.
  const daily = dailyPnl(1, row.current_value, row.previous_value);
  const xirr = annualizedReturn(investment, row.purchase_date, currentValue);

  return {
    ...row,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct),
    daily_change: daily.change,
    daily_pnl: daily.pnl,
    daily_pnl_pct: daily.pct,
    xirr,
    cagr: xirr
  };
}

module.exports = {
  round2,
  dailyPnl,
  annualizedReturn,
  withStockCalcs,
  withMfCalcs,
  withEtfCalcs,
  withFnoCalcs,
  withOtherCalcs
};
