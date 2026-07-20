// fno.js — Futures & Options category view.

const FnoView = {
  data: [],

  async render() {
    const el = document.getElementById('view-fno');
    el.innerHTML = UI.skeletonTable();
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
    const rows = this.data;

    el.innerHTML = `
      ${rows.length ? this.summaryBar(rows) : ''}
      <div class="toolbar">
        <div></div>
        <button class="btn-add" id="add-fno-btn"><i class="fa-solid fa-plus"></i> Add F&amp;O Position</button>
      </div>
      ${rows.length ? this.table(rows) : `<div class="table-wrap">${UI.emptyState('fa-arrow-trend-up', 'No F&O positions yet', 'Click "Add F&O Position" to record a future or option trade.')}</div>`}
    `;
    document.getElementById('add-fno-btn').addEventListener('click', () => this.openForm());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.openForm(Number(b.dataset.edit))));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => this.remove(Number(b.dataset.delete))));
    el.querySelectorAll('[data-price]').forEach(b => b.addEventListener('click', () => this.openPriceForm(Number(b.dataset.price))));
  },

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
          <div class="stat-label"><i class="fa-solid fa-wallet"></i> Mark-to-Market Value</div>
          <div class="stat-value">${UI.currency(currentValue)}</div>
        </div>
        <div class="card">
          <div class="stat-label"><i class="fa-solid fa-vault"></i> Total Investment</div>
          <div class="stat-value">${UI.currency(investment)}</div>
        </div>
      </div>
      ${notUpdated > 0 ? `<div class="panel" style="margin-bottom:18px;border-left:3px solid var(--gold);">
        <i class="fa-solid fa-circle-exclamation" style="color:var(--gold);"></i>
        ${notUpdated} position${notUpdated > 1 ? 's' : ''} ${notUpdated > 1 ? "haven't" : "hasn't"} had today's price updated yet — use the
        <i class="fa-solid fa-arrow-rotate-right"></i> button on each row.
      </div>` : ''}
    `;
  },

  openPriceForm(id) {
    const f = this.data.find(r => r.id === id);
    if (!f) return;
    UI.openModal(`
      <h2>Update Today's Price</h2>
      <p style="color:var(--text-1);font-size:13px;margin:-10px 0 18px;">${UI.escapeHtml(f.instrument)}</p>
      <div class="form-grid">
        <div><label>Previous Price</label><input type="text" value="${UI.currency(f.current_price)}" disabled /></div>
        ${UI.field({ label: "Today's Current Price (₹)", id: 'f-newprice', type: 'number', step: 'any', value: f.current_price })}
      </div>
      <p style="color:var(--text-2);font-size:12px;margin-top:10px;">
        Saving will move the current price (${UI.currency(f.current_price)}) into "Previous Price", and calculate
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
      await API.fno.updatePrice(id, price);
      UI.closeModal();
      UI.toast("Today's price saved");
      await this.render();
      if (window.App) App.refreshBadges();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  table() {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Instrument</th><th>Type</th><th>Strike / Expiry</th><th>Lots × Size</th><th>Entry</th><th>Prev Price</th><th>LTP</th><th>Today's P/L</th><th>Overall P/L</th><th></th></tr></thead>
          <tbody>
            ${this.data.map(f => `
              <tr>
                <td><strong>${UI.escapeHtml(f.instrument)}</strong><div class="cell-sub">${UI.escapeHtml(f.broker || '')}</div></td>
                <td>${UI.escapeHtml(f.segment)}${f.option_type ? ' · ' + UI.escapeHtml(f.option_type) : ''}</td>
                <td class="cell-mono">${f.strike_price ? UI.currency(f.strike_price) : '—'}<div class="cell-sub">${f.expiry_date || 'No expiry'}</div></td>
                <td class="cell-mono">${f.num_lots} × ${f.lot_size} = ${f.total_quantity}</td>
                <td class="cell-mono">${UI.currency(f.entry_price)}</td>
                <td class="cell-mono">${UI.currency(f.previous_price)}</td>
                <td class="cell-mono">${UI.currency(f.current_price)}${f.price_updated_at ? `<div class="cell-sub">as of ${f.price_updated_at}</div>` : `<div class="cell-sub">not updated yet</div>`}</td>
                <td>${UI.pnlPill(f.daily_pnl, f.daily_pnl_pct)}</td>
                <td>${UI.pnlPill(f.pnl, f.return_pct)}</td>
                <td><div class="row-actions">
                  <button data-price="${f.id}" title="Update Price" class="update-price-btn"><i class="fa-solid fa-arrow-rotate-right"></i></button>
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
        ${UI.field({ label: 'Entry Date', id: 'f-entrydate', type: 'date', required: false, value: f.entry_date })}
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
      entry_date: document.getElementById('f-entrydate').value || null,
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
