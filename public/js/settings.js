// settings.js — Settings view: theme, currency, notifications, backup/restore.

const SettingsView = {
  settings: {},

  async render() {
    const el = document.getElementById('view-settings');
    try {
      this.settings = await API.settingsGet();
    } catch (e) { this.settings = {}; }

    const notif = Object.assign({
      large_profit_alert: true, large_loss_alert: true, sip_reminder: true,
      expiry_reminder: true, dividend_reminder: false
    }, this.settings.notifications || {});

    el.innerHTML = `
      <div class="grid grid-2">
        <div class="panel">
          <h3>Appearance</h3>
          <p class="panel-sub">Currency is fixed to Indian Rupee (₹) for this app</p>
          <div style="display:flex;gap:10px;margin-top:14px;">
            <button class="chip ${document.body.classList.contains('light') ? '' : 'active'}" id="set-dark">Dark Mode</button>
            <button class="chip ${document.body.classList.contains('light') ? 'active' : ''}" id="set-light">Light Mode</button>
          </div>
        </div>

        <div class="panel">
          <h3>Backup &amp; Restore</h3>
          <p class="panel-sub">Your data lives in a local SQLite file — back it up regularly</p>
          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
            <button class="btn-add" id="backup-btn"><i class="fa-solid fa-cloud-arrow-down"></i> Backup Database</button>
            <label class="btn-ghost" style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-cloud-arrow-up"></i> Restore Database
              <input type="file" id="restore-input" accept="application/json" style="display:none;" />
            </label>
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:22px;">
        <h3>Notifications</h3>
        <p class="panel-sub">Choose which alerts you want to see (checked = on)</p>
        <div class="grid grid-cards" style="margin-top:16px;">
          ${this.toggleCard('large_profit_alert', 'Large Profit Alert', 'fa-arrow-trend-up', notif.large_profit_alert)}
          ${this.toggleCard('large_loss_alert', 'Large Loss Alert', 'fa-arrow-trend-down', notif.large_loss_alert)}
          ${this.toggleCard('sip_reminder', 'SIP Reminder', 'fa-calendar-check', notif.sip_reminder)}
          ${this.toggleCard('expiry_reminder', 'Expiry Reminder', 'fa-hourglass-half', notif.expiry_reminder)}
          ${this.toggleCard('dividend_reminder', 'Dividend Reminder', 'fa-hand-holding-dollar', notif.dividend_reminder)}
        </div>
      </div>
    `;

    document.getElementById('set-dark').addEventListener('click', () => App.setTheme('dark'));
    document.getElementById('set-light').addEventListener('click', () => App.setTheme('light'));
    document.getElementById('backup-btn').addEventListener('click', () => this.backup());
    document.getElementById('restore-input').addEventListener('change', (e) => this.restore(e));
    el.querySelectorAll('[data-notif]').forEach(card => card.addEventListener('click', () => this.toggleNotif(card.dataset.notif, notif)));
  },

  toggleCard(key, label, icon, on) {
    return `
      <div class="card" data-notif="${key}" style="cursor:pointer;">
        <div class="stat-label"><i class="fa-solid ${icon}"></i> ${label}</div>
        <div style="margin-top:10px;"><span class="pill ${on ? 'up' : 'neutral'}"><i class="fa-solid ${on ? 'fa-toggle-on' : 'fa-toggle-off'}"></i> ${on ? 'On' : 'Off'}</span></div>
      </div>
    `;
  },

  async toggleNotif(key, notif) {
    notif[key] = !notif[key];
    try {
      await API.settingsSet('notifications', notif);
      this.render();
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  async backup() {
    try {
      const data = await API.backup.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      UI.toast('Backup downloaded');
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  async restore(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Restoring will replace ALL current data with the backup file. Continue?')) { e.target.value = ''; return; }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await API.backup.import(json.data || json);
      UI.toast('Database restored');
      if (window.App) App.refreshBadges();
      this.render();
    } catch (err) {
      UI.toast('Restore failed: ' + err.message, 'error');
    }
    e.target.value = '';
  }
};
