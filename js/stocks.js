// stocks.js — Stocks category view.

const StocksView = {
  data: [],
  filterExchange: 'All',

  async render() {
    const el = document.getElementById('view-stocks');
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
  },

  filtered() {
    if (this.filterExchange === 'All') return this.data;
    return this.data.filter(s => s.exchange === this.filterExchange);
  },

  table(rows) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Stock</th><th>Exchange</th><th>Sector</th><th>Qty</th><th>Avg Buy</th><th>LTP</th><th>Investment</th><th>Current Value</th><th>P/L</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.map(s => `
              <tr>
                <td><strong>${UI.escapeHtml(s.stock_name)}</strong><div class="cell-sub">${UI.escapeHtml(s.symbol)}</div></td>
                <td>${UI.escapeHtml(s.exchange)}</td>
                <td>${UI.escapeHtml(s.sector || '—')}</td>
                <td class="cell-mono">${s.quantity}</td>
                <td class="cell-mono">${UI.currency(s.avg_buy_price)}</td>
                <td class="cell-mono">${UI.currency(s.current_price)}</td>
                <td class="cell-mono">${UI.currency(s.investment)}</td>
                <td class="cell-mono">${UI.currency(s.current_value)}</td>
                <td>${UI.pnlPill(s.pnl, s.return_pct)}</td>
                <td><div class="row-actions">
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
