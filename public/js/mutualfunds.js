// mutualfunds.js — Mutual Funds category view.

const MutualFundsView = {
  data: [],

  async render() {
    const el = document.getElementById('view-mutualfunds');
    try {
      this.data = await API.mfs.list();
    } catch (e) {
      el.innerHTML = UI.emptyState('fa-triangle-exclamation', 'Could not load mutual funds', e.message);
      return;
    }
    this.paint();
  },

  paint() {
    const el = document.getElementById('view-mutualfunds');
    el.innerHTML = `
      <div class="toolbar">
        <div></div>
        <button class="btn-add" id="add-mf-btn"><i class="fa-solid fa-plus"></i> Add Mutual Fund</button>
      </div>
      ${this.data.length ? this.table() : `<div class="table-wrap">${UI.emptyState('fa-layer-group', 'No mutual funds added yet', 'Click "Add Mutual Fund" to record your first SIP or lump sum.')}</div>`}
    `;
    document.getElementById('add-mf-btn').addEventListener('click', () => this.openForm());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.openForm(Number(b.dataset.edit))));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => this.remove(Number(b.dataset.delete))));
  },

  table() {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Fund</th><th>Category</th><th>Units</th><th>Purchase NAV</th><th>Current NAV</th><th>Investment</th><th>Current Value</th><th>P/L (XIRR)</th><th></th>
          </tr></thead>
          <tbody>
            ${this.data.map(m => `
              <tr>
                <td><strong>${UI.escapeHtml(m.fund_name)}</strong><div class="cell-sub">${UI.escapeHtml(m.amc || '')} · ${UI.escapeHtml(m.investment_mode || '')}</div></td>
                <td>${UI.escapeHtml(m.category || '—')}</td>
                <td class="cell-mono">${m.units}</td>
                <td class="cell-mono">${UI.currency(m.purchase_nav)}</td>
                <td class="cell-mono">${UI.currency(m.current_nav)}</td>
                <td class="cell-mono">${UI.currency(m.investment)}</td>
                <td class="cell-mono">${UI.currency(m.current_value)}</td>
                <td>${UI.pnlPill(m.pnl, m.return_pct)}<div class="cell-sub">XIRR ${m.xirr !== null ? m.xirr + '%' : '—'}</div></td>
                <td><div class="row-actions">
                  <button data-edit="${m.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button data-delete="${m.id}" class="danger" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openForm(id = null) {
    const m = id ? this.data.find(r => r.id === id) : {};
    const isEdit = !!id;
    UI.openModal(`
      <h2>${isEdit ? 'Edit' : 'Add'} Mutual Fund</h2>
      <div class="form-grid">
        ${UI.field({ label: 'Fund Name', id: 'f-name', full: true, value: m.fund_name })}
        ${UI.field({ label: 'AMC', id: 'f-amc', required: false, value: m.amc })}
        ${UI.field({ label: 'Category', id: 'f-category', required: false, value: m.category })}
        ${UI.field({ label: 'Folio Number', id: 'f-folio', required: false, value: m.folio_number })}
        ${UI.field({ label: 'SIP or Lump Sum', id: 'f-mode', type: 'select', options: ['SIP', 'Lump Sum'], value: m.investment_mode })}
        ${UI.field({ label: 'Broker', id: 'f-broker', required: false, value: m.broker })}
        ${UI.field({ label: 'Purchase NAV', id: 'f-pnav', type: 'number', step: 'any', value: m.purchase_nav })}
        ${UI.field({ label: 'Current NAV', id: 'f-cnav', type: 'number', step: 'any', required: false, value: m.current_nav })}
        ${UI.field({ label: 'Units', id: 'f-units', type: 'number', step: 'any', value: m.units })}
        ${UI.field({ label: 'Investment Date', id: 'f-date', type: 'date', required: false, value: m.investment_date })}
        ${UI.field({ label: 'Notes', id: 'f-notes', type: 'textarea', required: false, value: m.notes })}
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
      fund_name: document.getElementById('f-name').value.trim(),
      amc: document.getElementById('f-amc').value.trim(),
      category: document.getElementById('f-category').value.trim(),
      folio_number: document.getElementById('f-folio').value.trim(),
      investment_mode: document.getElementById('f-mode').value,
      broker: document.getElementById('f-broker').value.trim(),
      purchase_nav: parseFloat(document.getElementById('f-pnav').value),
      current_nav: parseFloat(document.getElementById('f-cnav').value) || 0,
      units: parseFloat(document.getElementById('f-units').value),
      investment_date: document.getElementById('f-date').value || null,
      notes: document.getElementById('f-notes').value.trim()
    };
    try {
      if (id) await API.mfs.update(id, payload);
      else await API.mfs.create(payload);
      UI.closeModal();
      UI.toast(id ? 'Mutual fund updated' : 'Mutual fund added');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Delete this mutual fund entry?')) return;
    try {
      await API.mfs.remove(id);
      UI.toast('Mutual fund deleted');
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  }
};
