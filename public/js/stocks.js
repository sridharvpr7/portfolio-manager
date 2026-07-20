// stocks.js — Stocks category view.

const StocksView = {
  data: [],
  filterExchange: 'All',

  async render() {
    const el = document.getElementById('view-stocks');
    el.innerHTML = UI.skeletonTable();
    try {
      this.data = await API.stocks.list();
    } catch (e) {
      el.innerHTML = UI.emptyState('fa-triangle-exclamation', 'Could not load stocks', e.message);
      return;
    }
    this.paint();
  },

  paint() {
    const el = document.getElementById('view-stocks');
    const rows = this.filtered();

    el.innerHTML = `
      ${rows.length ? this.summaryBar(rows) : ''}
      <div class="toolbar">
        <div class="filter-chips">
          ${['All', 'NSE', 'BSE'].map(f => `<button class="chip ${this.filterExchange === f ? 'active' : ''}" data-ex="${f}">${f}</button>`).join('')}
        </div>
        <button class="btn-add" id="add-stock-btn"><i class="fa-solid fa-plus"></i> Add Stock</button>
      </div>
      ${rows.length ? this.table(rows) : `<div class="table-wrap">${UI.emptyState('fa-building-columns', 'No stocks added yet', 'Click "Add Stock" to record your first holding.')}</div>`}
    `;

    el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
      this.filterExchange = c.dataset.ex;
      this.paint();
    }));
    document.getElementById('add-stock-btn').addEventListener('click', () => this.openForm());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.openForm(Number(b.dataset.edit))));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => this.remove(Number(b.dataset.delete))));
    el.querySelectorAll('[data-price]').forEach(b => b.addEventListener('click', () => this.openPriceForm(Number(b.dataset.price))));
  },

  filtered() {
    if (this.filterExchange === 'All') return this.data;
    return this.data.filter(s => s.exchange === this.filterExchange);
  },

  // Quick-glance strip so today's price update actually feels useful the
  // moment you land on the Stocks tab — no need to scroll the table.
  summaryBar(rows) {
    const todaysPnl = rows.reduce((s, r) => s + (Number(r.daily_pnl) || 0), 0);
    const overallPnl = rows.reduce((s, r) => s + (Number(r.pnl) || 0), 0);
    const investment = rows.reduce((s, r) => s + (Number(r.investment) || 0), 0);
    const currentValue = rows.reduce((s, r) => s + (Number(r.current_value) || 0), 0);
    const notUpdated = rows.filter(r => !r.price_updated_at).length;

    return `
      <div class="grid grid-cards" style="margin-bottom:18px;">
        <div class="card">
          <div class="stat-label"><i class="fa-solid fa-bolt"></i> Today's P/L</div>
          <div class="stat-value">${UI.pnlPill(todaysPnl, investment ? (todaysPnl / investment) * 100 : 0)}</div>
        </div>
        <div class="card">
          <div class="stat-label"><i class="fa-solid fa-chart-line"></i> Overall P/L</div>
          <div class="stat-value">${UI.pnlPill(overallPnl, investment ? (overallPnl / investment) * 100 : 0)}</div>
        </div>
        <div class="card">
          <div class="stat-label"><i class="fa-solid fa-wallet"></i> Current Value</div>
          <div class="stat-value">${UI.currency(currentValue)}</div>
        </div>
        <div class="card">
          <div class="stat-label"><i class="fa-solid fa-vault"></i> Total Investment</div>
          <div class="stat-value">${UI.currency(investment)}</div>
        </div>
      </div>
      ${notUpdated > 0 ? `<div class="panel" style="margin-bottom:18px;border-left:3px solid var(--gold);">
        <i class="fa-solid fa-circle-exclamation" style="color:var(--gold);"></i>
        ${notUpdated} stock${notUpdated > 1 ? 's' : ''} ${notUpdated > 1 ? "haven't" : "hasn't"} had today's price updated yet — use the
        <i class="fa-solid fa-arrow-rotate-right"></i> button on each row.
      </div>` : ''}
    `;
  },

  openPriceForm(id) {
    const s = this.data.find(r => r.id === id);
    if (!s) return;
    UI.openModal(`
      <h2>Update Today's Price</h2>
      <p style="color:var(--text-1);font-size:13px;margin:-10px 0 18px;">${UI.escapeHtml(s.stock_name)} (${UI.escapeHtml(s.symbol)})</p>
      <div class="form-grid">
        <div><label>Previous Close</label><input type="text" value="${UI.currency(s.current_price)}" disabled /></div>
        ${UI.field({ label: "Today's Current Price (₹)", id: 'f-newprice', type: 'number', step: 'any', value: s.current_price })}
      </div>
      <p style="color:var(--text-2);font-size:12px;margin-top:10px;">
        Saving will move the current price (${UI.currency(s.current_price)}) into "Previous Close", and calculate
        Today's P/L from the new price you enter here.
      </p>
      <div class="modal-actions">
        <button class="btn-ghost" id="cancel-btn">Cancel</button>
        <button class="btn-primary" style="width:auto;margin:0;padding:10px 20px;" id="save-price-btn">Save Price</button>
      </div>
    `);
    document.getElementById('cancel-btn').addEventListener('click', UI.closeModal);
    document.getElementById('save-price-btn').addEventListener('click', () => this.savePrice(id));
    // Let the user start typing the new price immediately.
    const input = document.getElementById('f-newprice');
    input.focus();
    input.select();
  },

  async savePrice(id) {
    const price = parseFloat(document.getElementById('f-newprice').value);
    if (isNaN(price) || price < 0) {
      UI.toast('Enter a valid price', 'error');
      return;
    }
    try {
      await API.stocks.updatePrice(id, price);
      UI.closeModal();
      UI.toast("Today's price saved");
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  table(rows) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Stock</th><th>Exchange</th><th>Sector</th><th>Qty</th><th>Avg Buy</th><th>Prev Close</th><th>LTP</th><th>Today's P/L</th><th>Overall P/L</th><th>XIRR</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.map(s => `
              <tr>
                <td><strong>${UI.escapeHtml(s.stock_name)}</strong><div class="cell-sub">${UI.escapeHtml(s.symbol)}</div></td>
                <td>${UI.escapeHtml(s.exchange)}</td>
                <td>${UI.escapeHtml(s.sector || '—')}</td>
                <td class="cell-mono">${s.quantity}</td>
                <td class="cell-mono">${UI.currency(s.avg_buy_price)}</td>
                <td class="cell-mono">${UI.currency(s.previous_close)}</td>
                <td class="cell-mono">${UI.currency(s.current_price)}${s.price_updated_at ? `<div class="cell-sub">as of ${s.price_updated_at}</div>` : `<div class="cell-sub">not updated yet</div>`}</td>
                <td>${UI.pnlPill(s.daily_pnl, s.daily_pnl_pct)}</td>
                <td>${UI.pnlPill(s.pnl, s.return_pct)}</td>
                <td>${UI.xirrBadge(s.xirr)}</td>
                <td><div class="row-actions">
                  <button data-price="${s.id}" title="Update Price" class="update-price-btn"><i class="fa-solid fa-arrow-rotate-right"></i></button>
                  <button data-edit="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button data-delete="${s.id}" class="danger" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openForm(id = null) {
    const s = id ? this.data.find(r => r.id === id) : {};
    const isEdit = !!id;
    UI.openModal(`
      <h2>${isEdit ? 'Edit' : 'Add'} Stock</h2>
      <div class="form-grid">
        ${UI.field({ label: 'Exchange', id: 'f-exchange', type: 'select', options: ['NSE', 'BSE'], value: s.exchange })}
        ${UI.field({ label: 'Stock Symbol', id: 'f-symbol', value: s.symbol })}
        ${UI.field({ label: 'Stock Name', id: 'f-name', full: true, value: s.stock_name })}
        ${UI.field({ label: 'Sector', id: 'f-sector', required: false, value: s.sector })}
        ${UI.field({ label: 'Broker', id: 'f-broker', required: false, value: s.broker })}
        ${UI.field({ label: 'Quantity', id: 'f-qty', type: 'number', step: 'any', value: s.quantity })}
        ${UI.field({ label: 'Average Buy Price (₹)', id: 'f-avg', type: 'number', step: 'any', value: s.avg_buy_price })}
        ${UI.field({ label: 'Current Price (₹)', id: 'f-cur', type: 'number', step: 'any', required: false, value: s.current_price })}
        ${UI.field({ label: 'Purchase Date', id: 'f-date', type: 'date', required: false, value: s.purchase_date })}
        ${UI.field({ label: 'Brokerage (₹)', id: 'f-brokerage', type: 'number', step: 'any', required: false, value: s.brokerage })}
        ${UI.field({ label: 'Notes', id: 'f-notes', type: 'textarea', required: false, value: s.notes })}
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" id="cancel-btn">Cancel</button>
        <button class="btn-primary" style="width:auto;margin:0;padding:10px 20px;" id="save-btn">${isEdit ? 'Save Changes' : 'Save'}</button>
      </div>
    `);
    document.getElementById('cancel-btn').addEventListener('click', UI.closeModal);
    document.getElementById('save-btn').addEventListener('click', () => this.save(id));
  },

  async save(id) {
    const payload = {
      exchange: document.getElementById('f-exchange').value,
      symbol: document.getElementById('f-symbol').value.trim(),
      stock_name: document.getElementById('f-name').value.trim(),
      sector: document.getElementById('f-sector').value.trim(),
      broker: document.getElementById('f-broker').value.trim(),
      quantity: parseFloat(document.getElementById('f-qty').value),
      avg_buy_price: parseFloat(document.getElementById('f-avg').value),
      current_price: parseFloat(document.getElementById('f-cur').value) || 0,
      purchase_date: document.getElementById('f-date').value || null,
      brokerage: parseFloat(document.getElementById('f-brokerage').value) || 0,
      notes: document.getElementById('f-notes').value.trim()
    };
    try {
      if (id) await API.stocks.update(id, payload);
      else await API.stocks.create(payload);
      UI.closeModal();
      UI.toast(id ? 'Stock updated' : 'Stock added');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Delete this stock entry? This cannot be undone.')) return;
    try {
      await API.stocks.remove(id);
      UI.toast('Stock deleted');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  }
};
