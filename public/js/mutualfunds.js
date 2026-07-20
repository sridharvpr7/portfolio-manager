// mutualfunds.js — Mutual Funds category view.

const MutualFundsView = {
  data: [],

  async render() {
    const el = document.getElementById('view-mutualfunds');
    el.innerHTML = UI.skeletonTable();
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
      ${this.data.length ? this.summaryBar() : ''}
      <div class="toolbar">
        <div></div>
        <button class="btn-add" id="add-mf-btn"><i class="fa-solid fa-plus"></i> Add Mutual Fund</button>
      </div>
      ${this.data.length ? this.table() : `<div class="table-wrap">${UI.emptyState('fa-layer-group', 'No mutual funds added yet', 'Click "Add Mutual Fund" to record your first SIP or lump sum.')}</div>`}
    `;
    document.getElementById('add-mf-btn').addEventListener('click', () => this.openForm());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.openForm(Number(b.dataset.edit))));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => this.remove(Number(b.dataset.delete))));
    el.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => this.openNavForm(Number(b.dataset.nav))));
  },

  // Quick-glance strip, same pattern as the Stocks tab, so a daily NAV
  // update is immediately reflected without hunting through the table.
  summaryBar() {
    const rows = this.data;
    const todaysPnl = rows.reduce((s, r) => s + (Number(r.daily_pnl) || 0), 0);
    const overallPnl = rows.reduce((s, r) => s + (Number(r.pnl) || 0), 0);
    const investment = rows.reduce((s, r) => s + (Number(r.investment) || 0), 0);
    const currentValue = rows.reduce((s, r) => s + (Number(r.current_value) || 0), 0);
    const notUpdated = rows.filter(r => !r.nav_updated_at).length;

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
        ${notUpdated} fund${notUpdated > 1 ? 's' : ''} ${notUpdated > 1 ? "haven't" : "hasn't"} had today's NAV updated yet — use the
        <i class="fa-solid fa-arrow-rotate-right"></i> button on each row.
      </div>` : ''}
    `;
  },

  table() {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Fund</th><th>Category</th><th>Units</th><th>Purchase NAV</th><th>Prev NAV</th><th>Current NAV</th><th>Today's P/L</th><th>Overall P/L (XIRR)</th><th></th>
          </tr></thead>
          <tbody>
            ${this.data.map(m => `
              <tr>
                <td><strong>${UI.escapeHtml(m.fund_name)}</strong><div class="cell-sub">${UI.escapeHtml(m.amc || '')} · ${UI.escapeHtml(m.investment_mode || '')}</div></td>
                <td>${UI.escapeHtml(m.category || '—')}</td>
                <td class="cell-mono">${m.units}</td>
                <td class="cell-mono">${UI.currency(m.purchase_nav)}</td>
                <td class="cell-mono">${UI.currency(m.previous_nav)}</td>
                <td class="cell-mono">${UI.currency(m.current_nav)}${m.nav_updated_at ? `<div class="cell-sub">as of ${m.nav_updated_at}</div>` : `<div class="cell-sub">not updated yet</div>`}</td>
                <td>${UI.pnlPill(m.daily_pnl, m.daily_pnl_pct)}</td>
                <td>${UI.pnlPill(m.pnl, m.return_pct)}<div class="cell-sub">XIRR ${m.xirr !== null ? m.xirr + '%' : '—'}</div></td>
                <td><div class="row-actions">
                  <button data-nav="${m.id}" title="Update NAV" class="update-price-btn"><i class="fa-solid fa-arrow-rotate-right"></i></button>
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

  openNavForm(id) {
    const m = this.data.find(r => r.id === id);
    if (!m) return;
    UI.openModal(`
      <h2>Update Today's NAV</h2>
      <p style="color:var(--text-1);font-size:13px;margin:-10px 0 18px;">${UI.escapeHtml(m.fund_name)}</p>
      <div class="form-grid">
        <div><label>Previous NAV</label><input type="text" value="${UI.currency(m.current_nav)}" disabled /></div>
        ${UI.field({ label: "Today's Current NAV (₹)", id: 'f-newnav', type: 'number', step: 'any', value: m.current_nav })}
      </div>
      <p style="color:var(--text-2);font-size:12px;margin-top:10px;">
        Saving will move the current NAV (${UI.currency(m.current_nav)}) into "Previous NAV", and calculate
        Today's P/L from the new NAV you enter here.
      </p>
      <div class="modal-actions">
        <button class="btn-ghost" id="cancel-btn">Cancel</button>
        <button class="btn-primary" style="width:auto;margin:0;padding:10px 20px;" id="save-nav-btn">Save NAV</button>
      </div>
    `);
    document.getElementById('cancel-btn').addEventListener('click', UI.closeModal);
    document.getElementById('save-nav-btn').addEventListener('click', () => this.saveNav(id));
    const input = document.getElementById('f-newnav');
    input.focus();
    input.select();
  },

  async saveNav(id) {
    const nav = parseFloat(document.getElementById('f-newnav').value);
    if (isNaN(nav) || nav < 0) {
      UI.toast('Enter a valid NAV', 'error');
      return;
    }
    try {
      await API.mfs.updateNav(id, nav);
      UI.closeModal();
      UI.toast("Today's NAV saved");
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
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
