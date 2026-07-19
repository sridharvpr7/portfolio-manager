// dashboard.js — renders the main Dashboard view.

const DashboardView = {
  async render() {
    const el = document.getElementById('view-dashboard');
    el.innerHTML = `<div class="dash-loading" style="color:var(--text-2);padding:40px 0;">Loading dashboard…</div>`;

    let summary, timeline;
    try {
      [summary, timeline] = await Promise.all([API.summary(), API.timeline()]);
    } catch (e) {
      el.innerHTML = UI.emptyState('fa-triangle-exclamation', 'Could not load dashboard', e.message);
      return;
    }

    const hasAnyData = summary.total_stocks + summary.total_mutual_funds + summary.total_etfs + summary.total_fno_positions > 0
      || summary.cash_balance > 0;

    el.innerHTML = `
      <div class="grid grid-cards">
        ${this.card('fa-sack-dollar', 'Total Net Worth', UI.currency(summary.total_net_worth), null, true, 'primary')}
        ${this.card('fa-bolt', "Today's P/L", UI.currency(summary.todays_pnl), summary.todays_pnl >= 0 ? 'up' : 'down', false, null, UI.pct(summary.todays_pnl_pct))}
        ${this.card('fa-chart-line', 'Overall P/L', UI.currency(summary.overall_pnl), summary.overall_pnl >= 0 ? 'up' : 'down', false, null, UI.pct(summary.overall_return_pct))}
        ${this.card('fa-vault', 'Total Investment', UI.currency(summary.total_investment))}
        ${this.card('fa-wallet', 'Current Portfolio Value', UI.currency(summary.current_portfolio_value))}
        ${this.card('fa-money-bill-wave', 'Cash Balance', UI.currency(summary.cash_balance), null, false, 'gold')}
        ${this.card('fa-building-columns', 'Total Stocks', summary.total_stocks)}
        ${this.card('fa-layer-group', 'Total Mutual Funds', summary.total_mutual_funds)}
        ${this.card('fa-arrow-trend-up', 'Total F&O Positions', summary.total_fno_positions)}
      </div>

      <div class="grid grid-2" style="margin-top:22px;">
        <div class="panel">
          <h3><i class="fa-solid fa-arrow-up" style="color:var(--profit)"></i> Top Gainer</h3>
          <p class="panel-sub">Best performing position right now</p>
          ${summary.top_gainer ? this.gainerLoserRow(summary.top_gainer, true) : UI.emptyState('fa-seedling', 'No gainers yet', 'Add positions to see your best performer here.')}
        </div>
        <div class="panel">
          <h3><i class="fa-solid fa-arrow-down" style="color:var(--loss)"></i> Top Loser</h3>
          <p class="panel-sub">Position needing your attention</p>
          ${summary.top_loser ? this.gainerLoserRow(summary.top_loser, false) : UI.emptyState('fa-shield-heart', 'No losers yet', 'Nothing dragging your portfolio down right now.')}
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:22px;">
        <div class="panel">
          <h3>Asset Allocation</h3>
          <p class="panel-sub">Where your money currently sits</p>
          <div class="chart-box">${summary.asset_allocation.length ? '<canvas id="chart-asset-alloc"></canvas>' : UI.emptyState('fa-chart-pie', 'No holdings yet', 'Add a stock, fund or asset to see allocation.')}</div>
        </div>
        <div class="panel">
          <h3>Sector Allocation</h3>
          <p class="panel-sub">Stock holdings grouped by sector</p>
          <div class="chart-box">${summary.sector_allocation.length ? '<canvas id="chart-sector-alloc"></canvas>' : UI.emptyState('fa-industry', 'No stock sectors yet', 'Add stocks with a sector to populate this chart.')}</div>
        </div>
      </div>

      <div class="panel" style="margin-top:22px;">
        <h3>Investment Timeline</h3>
        <p class="panel-sub">Money invested by month, across stocks &amp; mutual funds</p>
        <div class="chart-box tall">${timeline.length ? '<canvas id="chart-timeline"></canvas>' : UI.emptyState('fa-calendar-days', 'No dated investments yet', 'Add purchase dates to your entries to build this timeline.')}</div>
      </div>

      ${!hasAnyData ? `<div class="panel" style="margin-top:22px;">${UI.emptyState('fa-inbox', 'Your portfolio is empty', 'Start by adding a stock, mutual fund, ETF, F&O position or other asset from the sidebar.')}</div>` : ''}
    `;

    if (summary.asset_allocation.length) this.renderAssetAllocation(summary.asset_allocation);
    if (summary.sector_allocation.length) this.renderSectorAllocation(summary.sector_allocation);
    if (timeline.length) this.renderTimeline(timeline);

    if (window.gsap) {
      gsap.fromTo('.grid-cards .card', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' });
    }
  },

  card(icon, label, value, direction, big = false, accent = null, subValue = null) {
    const accentClass = accent === 'primary' ? 'accent-primary' : accent === 'gold' ? 'accent-gold' : '';
    const dirPill = direction ? `<span class="pill ${direction}"><i class="fa-solid fa-caret-${direction === 'up' ? 'up' : 'down'}"></i></span>` : '';
    return `
      <div class="card ${accentClass}">
        <div class="stat-label"><i class="fa-solid ${icon}"></i> ${label}</div>
        <div class="stat-value" style="${big ? 'font-size:30px;' : ''}">${value} ${dirPill}</div>
        ${subValue ? `<div class="stat-sub">${subValue}</div>` : ''}
      </div>
    `;
  },

  gainerLoserRow(item, isGainer) {
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;">
        <div>
          <div style="font-weight:600;">${UI.escapeHtml(item.name)}</div>
          <div class="cell-sub">${UI.escapeHtml(item.type)}</div>
        </div>
        <div style="text-align:right;">
          <div class="mono" style="color:${isGainer ? 'var(--profit)' : 'var(--loss)'};font-weight:600;">${UI.currency(item.pnl)}</div>
          <div class="cell-sub">${UI.pct(item.return_pct)}</div>
        </div>
      </div>
    `;
  },

  renderAssetAllocation(data) {
    const ctx = document.getElementById('chart-asset-alloc');
    ChartRegistry.create('assetAlloc', ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{ data: data.map(d => d.value), backgroundColor: ChartRegistry.palette, borderWidth: 0 }]
      },
      options: ChartRegistry.baseOptions({ cutout: '68%' })
    });
  },

  renderSectorAllocation(data) {
    const ctx = document.getElementById('chart-sector-alloc');
    ChartRegistry.create('sectorAlloc', ctx, {
      type: 'pie',
      data: {
        labels: data.map(d => d.label),
        datasets: [{ data: data.map(d => d.value), backgroundColor: ChartRegistry.palette, borderWidth: 0 }]
      },
      options: ChartRegistry.baseOptions()
    });
  },

  renderTimeline(data) {
    const ctx = document.getElementById('chart-timeline');
    let cumulative = 0;
    const cumData = data.map(d => (cumulative += d.invested));
    ChartRegistry.create('timeline', ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [
          { label: 'Monthly Invested', data: data.map(d => d.invested), borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.15)', tension: 0.35, fill: true },
          { label: 'Cumulative Invested', data: cumData, borderColor: '#f5b301', backgroundColor: 'transparent', tension: 0.35, borderDash: [5, 4] }
        ]
      },
      options: ChartRegistry.baseOptions({
        scales: {
          x: { ticks: { color: '#6b7286' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#6b7286' }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      })
    });
  }
};
