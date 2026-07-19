// reports.js — Reports view: summary, per-category exports (Excel/CSV)
// and a printable PDF-style portfolio summary.

const ReportsView = {
  reports: [
    { id: 'summary', title: 'Portfolio Summary', desc: 'Net worth, investment, P/L across every category', icon: 'fa-file-invoice-dollar' },
    { id: 'profit', title: 'Profit Report', desc: 'Category-wise profit and loss breakdown', icon: 'fa-chart-line' },
    { id: 'capital-gain', title: 'Capital Gain Report', desc: 'Realized gain estimate from current holdings', icon: 'fa-scale-balanced' },
    { id: 'mf', title: 'Mutual Fund Report', desc: 'All mutual fund holdings with XIRR', icon: 'fa-layer-group' },
    { id: 'fno', title: 'F&O Report', desc: 'All futures & options positions', icon: 'fa-arrow-trend-up' },
    { id: 'stocks', title: 'Stock Holdings (Excel)', desc: 'Export all stock holdings as CSV', icon: 'fa-building-columns' }
  ],

  async render() {
    const el = document.getElementById('view-reports');
    el.innerHTML = `
      <div class="grid grid-cards">
        ${this.reports.map(r => `
          <div class="card">
            <div class="stat-label"><i class="fa-solid ${r.icon}"></i> ${r.title}</div>
            <p style="color:var(--text-1);font-size:12.5px;margin:10px 0 16px;">${r.desc}</p>
            <div style="display:flex;gap:8px;">
              <button class="btn-ghost" data-view-report="${r.id}" style="flex:1;">View / Print</button>
              <button class="btn-ghost" data-export-csv="${r.id}" title="Export CSV"><i class="fa-solid fa-file-csv"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    el.querySelectorAll('[data-view-report]').forEach(b => b.addEventListener('click', () => this.viewReport(b.dataset.viewReport)));
    el.querySelectorAll('[data-export-csv]').forEach(b => b.addEventListener('click', () => this.exportCsv(b.dataset.exportCsv)));
  },

  async fetchAll() {
    const [summary, stocks, mfs, etfs, fno, other] = await Promise.all([
      API.summary(), API.stocks.list(), API.mfs.list(), API.etfs.list(), API.fno.list(), API.other.list()
    ]);
    return { summary, stocks, mfs, etfs, fno, other };
  },

  async viewReport(id) {
    const { summary, stocks, mfs, etfs, fno, other } = await this.fetchAll();
    let rows = [];
    let title = this.reports.find(r => r.id === id).title;

    if (id === 'summary') {
      rows = [
        ['Total Net Worth', UI.currency(summary.total_net_worth)],
        ["Today's P/L", UI.currency(summary.todays_pnl)],
        ['Overall P/L', UI.currency(summary.overall_pnl) + ` (${UI.pct(summary.overall_return_pct)})`],
        ['Total Investment', UI.currency(summary.total_investment)],
        ['Current Portfolio Value', UI.currency(summary.current_portfolio_value)],
        ['Cash Balance', UI.currency(summary.cash_balance)]
      ];
      this.printTable(title, ['Metric', 'Value'], rows);
    } else if (id === 'profit') {
      rows = [
        ['Stocks', UI.currency(this.sum(stocks, 'pnl'))],
        ['Mutual Funds', UI.currency(this.sum(mfs, 'pnl'))],
        ['ETF', UI.currency(this.sum(etfs, 'pnl'))],
        ['F&O', UI.currency(this.sum(fno, 'pnl'))],
        ['Other Assets', UI.currency(this.sum(other, 'pnl'))]
      ];
      this.printTable(title, ['Category', 'Profit / Loss'], rows);
    } else if (id === 'capital-gain') {
      rows = stocks.map(s => [s.stock_name, UI.currency(s.investment), UI.currency(s.current_value), UI.currency(s.pnl)]);
      this.printTable(title, ['Stock', 'Investment', 'Current Value', 'Gain/Loss'], rows);
    } else if (id === 'mf') {
      rows = mfs.map(m => [m.fund_name, m.units, UI.currency(m.investment), UI.currency(m.current_value), UI.currency(m.pnl), m.xirr !== null ? m.xirr + '%' : '—']);
      this.printTable(title, ['Fund', 'Units', 'Investment', 'Current Value', 'P/L', 'XIRR'], rows);
    } else if (id === 'fno') {
      rows = fno.map(f => [f.instrument, f.segment, UI.currency(f.investment), UI.currency(f.current_value), UI.currency(f.pnl)]);
      this.printTable(title, ['Instrument', 'Segment', 'Investment', 'Current Value', 'P/L'], rows);
    } else if (id === 'stocks') {
      rows = stocks.map(s => [s.stock_name, s.symbol, s.exchange, s.quantity, UI.currency(s.avg_buy_price), UI.currency(s.current_price), UI.currency(s.pnl)]);
      this.printTable(title, ['Name', 'Symbol', 'Exchange', 'Qty', 'Avg Price', 'LTP', 'P/L'], rows);
    }
  },

  sum(arr, field) { return arr.reduce((s, r) => s + (Number(r[field]) || 0), 0); },

  printTable(title, headers, rows) {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color:#111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p.sub { color:#666; font-size:12px; margin-top:0; }
        table { width:100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align:left; padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 13px; }
        th { background:#f4f4f6; text-transform:uppercase; font-size:11px; letter-spacing:0.04em; }
      </style></head><body>
      <h1>${title}</h1>
      <p class="sub">Generated ${new Date().toLocaleString('en-IN')} · Portfolio Manager</p>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">No data available</td></tr>`}</tbody>
      </table>
      <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    win.document.close();
  },

  async exportCsv(id) {
    const { stocks, mfs, etfs, fno } = await this.fetchAll();
    let headers = [], rows = [], filename = id + '.csv';

    if (id === 'stocks') {
      headers = ['Stock Name', 'Symbol', 'Exchange', 'Sector', 'Quantity', 'Avg Buy Price', 'Current Price', 'Investment', 'Current Value', 'P/L', 'Return %'];
      rows = stocks.map(s => [s.stock_name, s.symbol, s.exchange, s.sector, s.quantity, s.avg_buy_price, s.current_price, s.investment, s.current_value, s.pnl, s.return_pct]);
    } else if (id === 'mf') {
      headers = ['Fund Name', 'AMC', 'Units', 'Purchase NAV', 'Current NAV', 'Investment', 'Current Value', 'P/L', 'XIRR'];
      rows = mfs.map(m => [m.fund_name, m.amc, m.units, m.purchase_nav, m.current_nav, m.investment, m.current_value, m.pnl, m.xirr]);
    } else if (id === 'fno') {
      headers = ['Instrument', 'Segment', 'Strike', 'Expiry', 'Lots', 'Lot Size', 'Entry Price', 'Current Price', 'Investment', 'P/L'];
      rows = fno.map(f => [f.instrument, f.segment, f.strike_price, f.expiry_date, f.num_lots, f.lot_size, f.entry_price, f.current_price, f.investment, f.pnl]);
    } else {
      // Generic categories fall back to combined export
      headers = ['Category', 'Name', 'Investment', 'Current Value', 'P/L'];
      rows = [
        ...stocks.map(s => ['Stock', s.stock_name, s.investment, s.current_value, s.pnl]),
        ...mfs.map(m => ['Mutual Fund', m.fund_name, m.investment, m.current_value, m.pnl]),
        ...etfs.map(e => ['ETF', e.etf_name, e.investment, e.current_value, e.pnl]),
        ...fno.map(f => ['F&O', f.instrument, f.investment, f.current_value, f.pnl])
      ];
      filename = 'portfolio-report.csv';
    }

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    UI.toast('CSV exported — open it in Excel');
  }
};
