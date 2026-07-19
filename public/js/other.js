// other.js — Gold / Bonds / Cash category view.

const OtherView = {
  data: [],
  filterType: 'All',

  async render() {
    const el = document.getElementById('view-other');
    try {
      this.data = await API.other.list();
    } catch (e) {
      el.innerHTML = UI.emptyState('fa-triangle-exclamation', 'Could not load assets', e.message);
      return;
    }
    this.paint();
  },

  paint() {
    const el = document.getElementById('view-other');
    const rows = this.filterType === 'All' ? this.data : this.data.filter(r => r.asset_type === this.filterType);

    el.innerHTML = `
      <div class="toolbar">
        <div class="filter-chips">
          ${['All', 'Gold', 'Bonds', 'Cash'].map(f => `<button class="chip ${this.filterType === f ? 'active' : ''}" data-type="${f}">${f}</button>`).join('')}
        </div>
        <button class="btn-add" id="add-other-btn"><i class="fa-solid fa-plus"></i> Add Asset</button>
      </div>
      ${rows.length ? this.table(rows) : `<div class="table-wrap">${UI.emptyState('fa-coins', 'No assets added yet', 'Click "Add Asset" to record Gold, Bonds or Cash holdings.')}</div>`}
    `;
    el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { this.filterType = c.dataset.type; this.paint(); }));
    document.getElementById('add-other-btn').addEventListener('click', () => this.openForm());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.openForm(Number(b.dataset.edit))));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => this.remove(Number(b.dataset.delete))));
  },

  table(rows) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Broker/Bank</th><th>Invested</th><th>Current Value</th><th>P/L</th><th></th></tr></thead>
          <tbody>
            ${rows.map(o => `
              <tr>
                <td><strong>${UI.escapeHtml(o.name)}</strong></td>
                <td>${UI.escapeHtml(o.asset_type)}</td>
                <td>${UI.escapeHtml(o.broker || '—')}</td>
                <td class="cell-mono">${UI.currency(o.invested_amount)}</td>
                <td class="cell-mono">${UI.currency(o.current_value)}</td>
                <td>${UI.pnlPill(o.pnl, o.return_pct)}</td>
                <td><div class="row-actions">
                  <button data-edit="${o.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button data-delete="${o.id}" class="danger" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openForm(id = null) {
    const o = id ? this.data.find(r => r.id === id) : {};
    const isEdit = !!id;
    UI.openModal(`
      <h2>${isEdit ? 'Edit' : 'Add'} Asset</h2>
      <div class="form-grid">
        ${UI.field({ label: 'Asset Type', id: 'f-type', type: 'select', options: ['Gold', 'Bonds', 'Cash'], value: o.asset_type })}
        ${UI.field({ label: 'Name (e.g. SGB 2028, SBI Savings)', id: 'f-name', value: o.name })}
        ${UI.field({ label: 'Invested Amount (₹)', id: 'f-invested', type: 'number', step: 'any', value: o.invested_amount })}
        ${UI.field({ label: 'Current Value (₹)', id: 'f-current', type: 'number', step: 'any', required: false, value: o.current_value })}
        ${UI.field({ label: 'Broker / Bank', id: 'f-broker', required: false, value: o.broker })}
        ${UI.field({ label: 'Purchase Date', id: 'f-date', type: 'date', required: false, value: o.purchase_date })}
        ${UI.field({ label: 'Notes', id: 'f-notes', type: 'textarea', required: false, value: o.notes })}
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
      asset_type: document.getElementById('f-type').value,
      name: document.getElementById('f-name').value.trim(),
      invested_amount: parseFloat(document.getElementById('f-invested').value),
      current_value: parseFloat(document.getElementById('f-current').value) || undefined,
      broker: document.getElementById('f-broker').value.trim(),
      purchase_date: document.getElementById('f-date').value || null,
      notes: document.getElementById('f-notes').value.trim()
    };
    try {
      if (id) await API.other.update(id, payload);
      else await API.other.create(payload);
      UI.closeModal();
      UI.toast(id ? 'Asset updated' : 'Asset added');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Delete this asset entry?')) return;
    try {
      await API.other.remove(id);
      UI.toast('Asset deleted');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  }
};
