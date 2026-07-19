// fno.js — Futures & Options category view.

const FnoView = {
  data: [],

  async render() {
    const el = document.getElementById('view-fno');
    try {
      this.data = await API.fno.list();
    } catch (e) {
      el.innerHTML = UI.emptyState('fa-triangle-exclamation', 'Could not load F&O positions', e.message);
      return;
    }
    this.paint();
  },

  paint() {
    const el = document.getElementById('view-fno');
    el.innerHTML = `
      <div class="toolbar">
        <div></div>
        <button class="btn-add" id="add-fno-btn"><i class="fa-solid fa-plus"></i> Add F&amp;O Position</button>
      </div>
      ${this.data.length ? this.table() : `<div class="table-wrap">${UI.emptyState('fa-arrow-trend-up', 'No F&O positions yet', 'Click "Add F&O Position" to record a future or option trade.')}</div>`}
    `;
    document.getElementById('add-fno-btn').addEventListener('click', () => this.openForm());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.openForm(Number(b.dataset.edit))));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => this.remove(Number(b.dataset.delete))));
  },

  table() {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Instrument</th><th>Type</th><th>Strike / Expiry</th><th>Lots × Size</th><th>Entry</th><th>LTP</th><th>Investment</th><th>P/L</th><th></th></tr></thead>
          <tbody>
            ${this.data.map(f => `
              <tr>
                <td><strong>${UI.escapeHtml(f.instrument)}</strong><div class="cell-sub">${UI.escapeHtml(f.broker || '')}</div></td>
                <td>${UI.escapeHtml(f.segment)}${f.option_type ? ' · ' + UI.escapeHtml(f.option_type) : ''}</td>
                <td class="cell-mono">${f.strike_price ? UI.currency(f.strike_price) : '—'}<div class="cell-sub">${f.expiry_date || 'No expiry'}</div></td>
                <td class="cell-mono">${f.num_lots} × ${f.lot_size} = ${f.total_quantity}</td>
                <td class="cell-mono">${UI.currency(f.entry_price)}</td>
                <td class="cell-mono">${UI.currency(f.current_price)}</td>
                <td class="cell-mono">${UI.currency(f.investment)}</td>
                <td>${UI.pnlPill(f.pnl, f.return_pct)}</td>
                <td><div class="row-actions">
                  <button data-edit="${f.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button data-delete="${f.id}" class="danger" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openForm(id = null) {
    const f = id ? this.data.find(r => r.id === id) : {};
    const isEdit = !!id;
    UI.openModal(`
      <h2>${isEdit ? 'Edit' : 'Add'} F&amp;O Position</h2>
      <div class="form-grid">
        ${UI.field({ label: 'Instrument (e.g. NIFTY, RELIANCE)', id: 'f-instrument', full: true, value: f.instrument })}
        ${UI.field({ label: 'Future / Option', id: 'f-segment', type: 'select', options: ['Future', 'Option'], value: f.segment })}
        ${UI.field({ label: 'Call / Put', id: 'f-opttype', type: 'select', options: ['', 'Call', 'Put'], required: false, value: f.option_type })}
        ${UI.field({ label: 'Strike Price', id: 'f-strike', type: 'number', step: 'any', required: false, value: f.strike_price })}
        ${UI.field({ label: 'Expiry Date', id: 'f-expiry', type: 'date', required: false, value: f.expiry_date })}
        ${UI.field({ label: 'Premium', id: 'f-premium', type: 'number', step: 'any', required: false, value: f.premium })}
        ${UI.field({ label: 'Lot Size', id: 'f-lotsize', type: 'number', step: 'any', value: f.lot_size })}
        ${UI.field({ label: 'Number of Lots', id: 'f-numlots', type: 'number', step: 'any', value: f.num_lots })}
        ${UI.field({ label: 'Entry Price', id: 'f-entry', type: 'number', step: 'any', value: f.entry_price })}
        ${UI.field({ label: 'Current Price', id: 'f-cur', type: 'number', step: 'any', required: false, value: f.current_price })}
        ${UI.field({ label: 'Broker', id: 'f-broker', required: false, value: f.broker })}
        ${UI.field({ label: 'Notes', id: 'f-notes', type: 'textarea', required: false, value: f.notes })}
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
      instrument: document.getElementById('f-instrument').value.trim(),
      segment: document.getElementById('f-segment').value,
      option_type: document.getElementById('f-opttype').value || null,
      strike_price: parseFloat(document.getElementById('f-strike').value) || null,
      expiry_date: document.getElementById('f-expiry').value || null,
      premium: parseFloat(document.getElementById('f-premium').value) || null,
      lot_size: parseFloat(document.getElementById('f-lotsize').value),
      num_lots: parseFloat(document.getElementById('f-numlots').value),
      entry_price: parseFloat(document.getElementById('f-entry').value),
      current_price: parseFloat(document.getElementById('f-cur').value) || 0,
      broker: document.getElementById('f-broker').value.trim(),
      notes: document.getElementById('f-notes').value.trim()
    };
    try {
      if (id) await API.fno.update(id, payload);
      else await API.fno.create(payload);
      UI.closeModal();
      UI.toast(id ? 'Position updated' : 'Position added');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Delete this F&O position?')) return;
    try {
      await API.fno.remove(id);
      UI.toast('Position deleted');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  }
};
