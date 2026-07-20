// xirr.js
// Generic XIRR (Extended Internal Rate of Return) solver.
//
// Takes a list of cash flows { amount, date } — negative amount = money
// leaving your pocket (a purchase), positive amount = money coming back
// (current value, a sale, a dividend, redemption, etc.) — and finds the
// single annualized rate that makes their present value net to zero.
//
// The current schema stores one holding row per position (not a full
// transaction ledger), so callers today build a simple 2-flow series:
// invested amount out on the purchase date, current value in "today".
// For a 2-flow series this is mathematically identical to CAGR, but the
// solver itself is general — the moment per-transaction cash flow history
// exists (SIPs, partial sells, dividends), the same function will produce
// a true multi-flow XIRR without any changes here.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function yearsBetween(a, b) {
  return (b - a) / MS_PER_DAY / 365;
}

// Net present value of a set of cash flows at a given annual rate.
function npv(rate, flows, t0) {
  return flows.reduce((sum, f) => {
    const t = yearsBetween(t0, f.date);
    return sum + f.amount / Math.pow(1 + rate, t);
  }, 0);
}

// Derivative of npv() w.r.t. rate, used by Newton-Raphson.
function npvDerivative(rate, flows, t0) {
  return flows.reduce((sum, f) => {
    const t = yearsBetween(t0, f.date);
    if (t === 0) return sum;
    return sum - (t * f.amount) / Math.pow(1 + rate, t + 1);
  }, 0);
}

/**
 * Solve for XIRR given cash flows.
 * @param {Array<{amount: number, date: Date}>} flows - at least one negative and one positive flow
 * @returns {number|null} annualized rate as a percentage (e.g. 14.2 for 14.2%), or null if unsolvable
 */
function xirr(flows) {
  if (!Array.isArray(flows) || flows.length < 2) return null;

  const clean = flows
    .filter(f => f && isFinite(f.amount) && f.date instanceof Date && !isNaN(f.date))
    .sort((a, b) => a.date - b.date);

  if (clean.length < 2) return null;
  const hasPositive = clean.some(f => f.amount > 0);
  const hasNegative = clean.some(f => f.amount < 0);
  if (!hasPositive || !hasNegative) return null; // no rate can balance same-sign flows

  const t0 = clean[0].date;

  // Newton-Raphson from a sensible starting guess.
  let rate = 0.1;
  let converged = false;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate, clean, t0);
    const fPrime = npvDerivative(rate, clean, t0);
    if (Math.abs(fPrime) < 1e-10) break;
    const nextRate = rate - f / fPrime;
    if (!isFinite(nextRate) || nextRate <= -0.999999) break;
    if (Math.abs(nextRate - rate) < 1e-7) {
      rate = nextRate;
      converged = true;
      break;
    }
    rate = nextRate;
  }

  // Fall back to bisection over a wide, safe range if Newton-Raphson
  // didn't settle (it can diverge for extreme/edge-case cash flow shapes).
  if (!converged || !isFinite(rate)) {
    let lo = -0.99;
    let hi = 10; // 1000% — comfortably beyond any real-world annualized return
    let fLo = npv(lo, clean, t0);
    let fHi = npv(hi, clean, t0);
    if (fLo * fHi > 0) return null; // no sign change, no root in range
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const fMid = npv(mid, clean, t0);
      if (Math.abs(fMid) < 1e-6) { rate = mid; converged = true; break; }
      if (fLo * fMid < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
      rate = mid;
    }
  }

  if (!isFinite(rate)) return null;
  return Math.round(rate * 10000) / 100; // percentage, 2 decimal places
}

/**
 * Convenience wrapper for the common single-purchase-to-today case that
 * every holding-level row in this app currently has: one investment made
 * on `investedDate` for `investedAmount`, worth `currentValue` today.
 * @returns {number|null} annualized return as a percentage, or null if
 *   there isn't enough data (no date, or zero/negative investment).
 */
function xirrSingleFlow(investedAmount, investedDate, currentValue, asOf = new Date()) {
  if (!investedDate || !investedAmount || investedAmount <= 0) return null;
  const start = new Date(investedDate);
  if (isNaN(start)) return null;
  return xirr([
    { amount: -investedAmount, date: start },
    { amount: currentValue, date: asOf }
  ]);
}

module.exports = { xirr, xirrSingleFlow };
