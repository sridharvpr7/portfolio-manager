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
    el.innerHTML = `
      <div class="toolbar">
        <div></div>
        <button class="btn-add" id="add-etf-btn"><i class="fa-solid fa-plus"></i> Add ETF</button>
      </div>
      ${this.data.length ? this.table() : `<div class="table-wrap">${UI.emptyState('fa-cubes', 'No ETFs added yet', 'Click "Add ETF" to record your first holding.')}</div>`}
    `;
    document.getElementById('add-etf-btn').addEventListener('click', () => this.openForm());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.openForm(Number(b.dataset.edit))));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => this.remove(Number(b.dataset.delete))));
  },

  table() {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>ETF</th><th>Broker</th><th>Qty</th><th>Avg Price</th><th>LTP</th><th>Investment</th><th>Current Value</th><th>P/L</th><th></th></tr></thead>
          <tbody>
            ${this.data.map(e => `
              <tr>
                <td><strong>${UI.escapeHtml(e.etf_name)}</strong></td>
                <td>${UI.escapeHtml(e.broker || '—')}</td>
                <td class="cell-mono">${e.quantity}</td>
                <td class="cell-mono">${UI.currency(e.avg_price)}</td>
                <td class="cell-mono">${UI.currency(e.current_price)}</td>
                <td class="cell-mono">${UI.currency(e.investment)}</td>
                <td class="cell-mono">${UI.currency(e.current_value)}</td>
                <td>${UI.pnlPill(e.pnl, e.return_pct)}</td>
                <td><div class="row-actions">
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
