// analysis.js — Portfolio Analysis view: broker allocation, top holdings,
// profit trend, performance breakdown across every category.

const AnalysisView = {
  async render() {
    const el = document.getElementById('view-analysis');
    el.innerHTML = UI.skeletonCards(4);
    let summary, stocks, mfs, etfs, fno;
    try {
      [summary, stocks, mfs, etfs, fno] = await Promise.all([
        API.summary(), API.stocks.list(), API.mfs.list(), API.etfs.list(), API.fno.list()
      ]);
    } catch (e) {
      el.innerHTML = UI.emptyState('fa-triangle-exclamation', 'Could not load analysis', e.message);
      return;
    }

    const allHoldings = [
      ...stocks.map(s => ({ name: s.stock_name, type: 'Stock', value: s.current_value, pnl: s.pnl })),
      ...mfs.map(m => ({ name: m.fund_name, type: 'Mutual Fund', value: m.current_value, pnl: m.pnl })),
      ...etfs.map(e => ({ name: e.etf_name, type: 'ETF', value: e.current_value, pnl: e.pnl })),
      ...fno.map(f => ({ name: f.instrument, type: 'F&O', value: f.current_value, pnl: f.pnl }))
    ].sort((a, b) => b.value - a.value).slice(0, 8);

    el.innerHTML = `
      <div class="grid grid-2">
        <div class="panel">
          <h3>Broker Allocation</h3>
          <p class="panel-sub">Current value held per broker</p>
          <div class="chart-box">${summary.broker_allocation.length ? '<canvas id="chart-broker"></canvas>' : UI.emptyState('fa-building', 'No broker data yet', 'Add a broker name to your holdings.')}</div>
        </div>
        <div class="panel">
          <h3>Market Cap / Category Split</h3>
          <p class="panel-sub">Overall asset allocation</p>
          <div class="chart-box">${summary.asset_allocation.length ? '<canvas id="chart-marketcap"></canvas>' : UI.emptyState('fa-chart-pie', 'No holdings yet', 'Add investments to see this breakdown.')}</div>
        </div>
      </div>

      <div class="panel" style="margin-top:22px;">
        <h3>Top Holdings</h3>
        <p class="panel-sub">Your 8 largest positions by current value</p>
        ${allHoldings.length ? `
          <div class="table-wrap" style="box-shadow:none;">
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Current Value</th><th>P/L</th></tr></thead>
              <tbody>
                ${allHoldings.map(h => `
                  <tr>
                    <td><strong>${UI.escapeHtml(h.name)}</strong></td>
                    <td>${UI.escapeHtml(h.type)}</td>
                    <td class="cell-mono">${UI.currency(h.value)}</td>
                    <td>${UI.pnlPill(h.pnl, h.value ? (h.pnl / (h.value - h.pnl || 1)) * 100 : 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : UI.emptyState('fa-ranking-star', 'No holdings yet', 'Your top holdings will appear here once you add investments.')}
      </div>
    `;

    if (summary.broker_allocation.length) {
      ChartRegistry.create('brokerAlloc', document.getElementById('chart-broker'), {
        type: 'bar',
        data: {
          labels: summary.broker_allocation.map(b => b.label),
          datasets: [{ label: 'Current Value', data: summary.broker_allocation.map(b => b.value), backgroundColor: '#6366f1', borderRadius: 6 }]
        },
        options: ChartRegistry.baseOptions({
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#6b7286' }, grid: { display: false } },
            y: { ticks: { color: '#6b7286' }, grid: { color: 'rgba(255,255,255,0.04)' } }
          }
        })
      });
    }
    if (summary.asset_allocation.length) {
      ChartRegistry.create('marketCap', document.getElementById('chart-marketcap'), {
        type: 'polarArea',
        data: {
          labels: summary.asset_allocation.map(a => a.label),
          datasets: [{ data: summary.asset_allocation.map(a => a.value), backgroundColor: ChartRegistry.palette.map(c => c + 'cc') }]
        },
        options: ChartRegistry.baseOptions({ scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' } } } })
      });
    }
  }
};
