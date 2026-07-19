// main.js — App bootstrap: authentication flow, view routing, theme, search.

const Views = {
  dashboard: DashboardView,
  stocks: StocksView,
  mutualfunds: MutualFundsView,
  etf: EtfView,
  fno: FnoView,
  other: OtherView,
  analysis: AnalysisView,
  reports: ReportsView,
  settings: SettingsView
};

const Titles = {
  dashboard: ['Dashboard', 'Your entire net worth, in one place'],
  stocks: ['Stocks', 'NSE & BSE equity holdings'],
  mutualfunds: ['Mutual Funds', 'SIP & lump sum fund holdings'],
  etf: ['ETF', 'Exchange traded fund holdings'],
  fno: ['Futures & Options', 'Derivative positions'],
  other: ['Gold / Bonds / Cash', 'Non-market linked holdings'],
  analysis: ['Portfolio Analysis', 'Deeper breakdowns of your holdings'],
  reports: ['Reports', 'Generate and export portfolio reports'],
  settings: ['Settings', 'Appearance, backup and notifications']
};

const App = {
  isRegisterMode: false,

  async init() {
    this.bindAuthForm();
    this.bindNav();
    this.bindTheme();
    this.bindSearch();

    const theme = localStorage.getItem('pm-theme') || 'dark';
    this.setTheme(theme, false);

    try {
      const status = await API.authStatus();
      this.isRegisterMode = status.setupRequired;
      this.paintAuthScreen();
      if (status.loggedIn) {
        this.showApp();
      } else {
        this.showAuth();
      }
    } catch (e) {
      this.showAuth();
    }
  },

  paintAuthScreen() {
    document.getElementById('auth-title').textContent = this.isRegisterMode ? 'Create your vault' : 'Welcome back';
    document.getElementById('auth-sub').textContent = this.isRegisterMode
      ? 'Set up local authentication to secure your portfolio'
      : 'Log in to your local portfolio vault';
    document.getElementById('auth-submit').textContent = this.isRegisterMode ? 'Create Account' : 'Log In';
  },

  bindAuthForm() {
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value;
      const errorEl = document.getElementById('auth-error');
      errorEl.textContent = '';
      try {
        if (this.isRegisterMode) {
          await API.register(username, password);
        } else {
          await API.login(username, password);
        }
        this.showApp();
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  },

  showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  },

  async showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('logout-btn').onclick = async () => {
      await API.logout();
      location.reload();
    };
    await this.navigate('dashboard');
  },

  bindNav() {
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.view));
    });
  },

  async navigate(view) {
    document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    target.classList.add('active');

    const [title, sub] = Titles[view];
    document.getElementById('view-title').textContent = title;
    document.getElementById('view-sub').textContent = sub;

    const module = Views[view];
    if (module && module.render) await module.render();
  },

  bindTheme() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const next = document.body.classList.contains('light') ? 'dark' : 'light';
      this.setTheme(next);
    });
  },

  setTheme(theme, persist = true) {
    document.body.classList.toggle('light', theme === 'light');
    const icon = document.querySelector('#theme-toggle i');
    if (icon) icon.className = `fa-solid ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`;
    if (persist) localStorage.setItem('pm-theme', theme);
    // Repaint settings view if currently active so its toggle buttons stay in sync
    if (document.getElementById('view-settings').classList.contains('active')) SettingsView.render();
  },

  bindSearch() {
    const input = document.getElementById('global-search');
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this.runSearch(input.value.trim()), 250);
    });
  },

  async runSearch(query) {
    if (!query) return;
    // Simple client-side search across already-loaded categories, then jump
    // to the first matching category's view.
    const q = query.toLowerCase();
    const targets = [
      { view: 'stocks', data: () => API.stocks.list(), match: s => [s.stock_name, s.symbol, s.sector, s.broker].some(v => (v || '').toLowerCase().includes(q)) },
      { view: 'mutualfunds', data: () => API.mfs.list(), match: m => [m.fund_name, m.category, m.broker].some(v => (v || '').toLowerCase().includes(q)) },
      { view: 'etf', data: () => API.etfs.list(), match: e => (e.etf_name || '').toLowerCase().includes(q) },
      { view: 'fno', data: () => API.fno.list(), match: f => (f.instrument || '').toLowerCase().includes(q) }
    ];
    for (const t of targets) {
      try {
        const rows = await t.data();
        if (rows.some(t.match)) {
          await this.navigate(t.view);
          UI.toast(`Found matches in ${Titles[t.view][0]}`);
          return;
        }
      } catch (e) { /* ignore */ }
    }
  },

  // Called after any add/edit/delete so other loaded views (like the
  // dashboard) reflect the change instantly if the user navigates back.
  refreshBadges() {
    // Views re-fetch on navigate, so nothing to do eagerly; kept as a hook
    // for future live-refresh behaviour.
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
