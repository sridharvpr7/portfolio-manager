// etf.js — ETF category view.

const EtfView = {
  data: [],

  async render() {
    const el = document.getElementById('view-etf');
    el.innerHTML = UI.skeletonTable();
    try {
      this.data = await API.etfs.list();
    } catch (e) {
      el.innerHTML = UI.emptyState('fa-triangle-exclamation', 'Could not load ETFs', e.message);
      return;
    }
    this.paint();
  },

  paint() {
    const el = document.getElementById('view-etf');
    const rows = this.data;

    el.innerHTML = `
      ${rows.length ? this.summaryBar(rows) : ''}
      <div class="toolbar">
        <div></div>
        <button class="btn-add" id="add-etf-btn"><i class="fa-solid fa-plus"></i> Add ETF</button>
      </div>
      ${rows.length ? this.table(rows) : `<div class="table-wrap">${UI.emptyState('fa-cubes', 'No ETFs added yet', 'Click "Add ETF" to record your first holding.')}</div>`}
    `;
    document.getElementById('add-etf-btn').addEventListener('click', () => this.openForm());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.openForm(Number(b.dataset.edit))));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => this.remove(Number(b.dataset.delete))));
    el.querySelectorAll('[data-price]').forEach(b => b.addEventListener('click', () => this.openPriceForm(Number(b.dataset.price))));
  },

  // Quick-glance strip, same pattern as Stocks — Today's P/L only becomes
  // meaningful once at least one "Update Price" has been recorded.
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
        ${notUpdated} ETF${notUpdated > 1 ? 's' : ''} ${notUpdated > 1 ? "haven't" : "hasn't"} had today's price updated yet — use the
        <i class="fa-solid fa-arrow-rotate-right"></i> button on each row.
      </div>` : ''}
    `;
  },

  openPriceForm(id) {
    const e = this.data.find(r => r.id === id);
    if (!e) return;
    UI.openModal(`
      <h2>Update Today's Price</h2>
      <p style="color:var(--text-1);font-size:13px;margin:-10px 0 18px;">${UI.escapeHtml(e.etf_name)}</p>
      <div class="form-grid">
        <div><label>Previous Price</label><input type="text" value="${UI.currency(e.current_price)}" disabled /></div>
        ${UI.field({ label: "Today's Current Price (₹)", id: 'f-newprice', type: 'number', step: 'any', value: e.current_price })}
      </div>
      <p style="color:var(--text-2);font-size:12px;margin-top:10px;">
        Saving will move the current price (${UI.currency(e.current_price)}) into "Previous Price", and calculate
        Today's P/L from the new price you enter here.
      </p>
      <div class="modal-actions">
        <button class="btn-ghost" id="cancel-btn">Cancel</button>
        <button class="btn-primary" style="width:auto;margin:0;padding:10px 20px;" id="save-price-btn">Save Price</button>
      </div>
    `);
    document.getElementById('cancel-btn').addEventListener('click', UI.closeModal);
    document.getElementById('save-price-btn').addEventListener('click', () => this.savePrice(id));
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
      await API.etfs.updatePrice(id, price);
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
          <thead><tr><th>ETF</th><th>Broker</th><th>Qty</th><th>Avg Price</th><th>Prev Price</th><th>LTP</th><th>Today's P/L</th><th>Overall P/L</th><th>XIRR</th><th></th></tr></thead>
          <tbody>
            ${rows.map(e => `
              <tr>
                <td><strong>${UI.escapeHtml(e.etf_name)}</strong></td>
                <td>${UI.escapeHtml(e.broker || '—')}</td>
                <td class="cell-mono">${e.quantity}</td>
                <td class="cell-mono">${UI.currency(e.avg_price)}</td>
                <td class="cell-mono">${UI.currency(e.previous_price)}</td>
                <td class="cell-mono">${UI.currency(e.current_price)}${e.price_updated_at ? `<div class="cell-sub">as of ${e.price_updated_at}</div>` : `<div class="cell-sub">not updated yet</div>`}</td>
                <td>${UI.pnlPill(e.daily_pnl, e.daily_pnl_pct)}</td>
                <td>${UI.pnlPill(e.pnl, e.return_pct)}</td>
                <td>${UI.xirrBadge(e.xirr)}</td>
                <td><div class="row-actions">
                  <button data-price="${e.id}" title="Update Price" class="update-price-btn"><i class="fa-solid fa-arrow-rotate-right"></i></button>
                  <button data-edit="${e.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button data-delete="${e.id}" class="danger" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openForm(id = null) {
    const e = id ? this.data.find(r => r.id === id) : {};
    const isEdit = !!id;
    UI.openModal(`
      <h2>${isEdit ? 'Edit' : 'Add'} ETF</h2>
      <div class="form-grid">
        ${UI.field({ label: 'ETF Name', id: 'f-name', full: true, value: e.etf_name })}
        ${UI.field({ label: 'Broker', id: 'f-broker', required: false, value: e.broker })}
        ${UI.field({ label: 'Quantity', id: 'f-qty', type: 'number', step: 'any', value: e.quantity })}
        ${UI.field({ label: 'Average Price (₹)', id: 'f-avg', type: 'number', step: 'any', value: e.avg_price })}
        ${UI.field({ label: 'Current Price (₹)', id: 'f-cur', type: 'number', step: 'any', required: false, value: e.current_price })}
        ${UI.field({ label: 'Purchase Date', id: 'f-date', type: 'date', required: false, value: e.purchase_date })}
        ${UI.field({ label: 'Notes', id: 'f-notes', type: 'textarea', required: false, value: e.notes })}
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
      etf_name: document.getElementById('f-name').value.trim(),
      broker: document.getElementById('f-broker').value.trim(),
      quantity: parseFloat(document.getElementById('f-qty').value),
      avg_price: parseFloat(document.getElementById('f-avg').value),
      current_price: parseFloat(document.getElementById('f-cur').value) || 0,
      purchase_date: document.getElementById('f-date').value || null,
      notes: document.getElementById('f-notes').value.trim()
    };
    try {
      if (id) await API.etfs.update(id, payload);
      else await API.etfs.create(payload);
      UI.closeModal();
      UI.toast(id ? 'ETF updated' : 'ETF added');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Delete this ETF entry?')) return;
    try {
      await API.etfs.remove(id);
      UI.toast('ETF deleted');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  }
};
