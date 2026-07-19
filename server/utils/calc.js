// calc.js
// Shared calculation helpers used across all routes.
// Every derived number (investment, current value, P/L, return %) is
// computed here on the server so the frontend never has to guess.

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function withStockCalcs(row) {
  const investment = row.quantity * row.avg_buy_price;
  const currentValue = row.quantity * (row.current_price || 0);
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;
  return {
    ...row,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct)
  };
}

function withMfCalcs(row) {
  const investment = row.units * row.purchase_nav;
  const currentValue = row.units * (row.current_nav || 0);
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;

  // Simplified annualized return (absolute-return based approximation of XIRR
  // for a single lump-sum/SIP entry). A true XIRR needs full cash-flow
  // history; this gives a fair estimate from purchase date to today.
  let xirr = null;
  if (row.investment_date && investment > 0) {
    const start = new Date(row.investment_date);
    const now = new Date();
    const years = Math.max((now - start) / (1000 * 60 * 60 * 24 * 365), 1 / 365);
    xirr = round2((Math.pow(currentValue / investment, 1 / years) - 1) * 100);
  }

  return {
    ...row,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct),
    xirr
  };
}

function withEtfCalcs(row) {
  const investment = row.quantity * row.avg_price;
  const currentValue = row.quantity * (row.current_price || 0);
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;
  return {
    ...row,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct)
  };
}

function withFnoCalcs(row) {
  const totalQty = row.lot_size * row.num_lots;
  const investment = row.entry_price * totalQty;
  const currentValue = (row.current_price || 0) * totalQty;
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;
  return {
    ...row,
    total_quantity: totalQty,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct)
  };
}

function withOtherCalcs(row) {
  const investment = row.invested_amount;
  const currentValue = row.current_value || 0;
  const pnl = currentValue - investment;
  const returnPct = investment !== 0 ? (pnl / investment) * 100 : 0;
  return {
    ...row,
    investment: round2(investment),
    current_value: round2(currentValue),
    pnl: round2(pnl),
    return_pct: round2(returnPct)
  };
}

module.exports = {
  round2,
  withStockCalcs,
  withMfCalcs,
  withEtfCalcs,
  withFnoCalcs,
  withOtherCalcs
};
