// api.js — thin wrapper around fetch for all backend calls.
const API = {
  base: '/api',

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // Auth
  authStatus: () => API.get('/auth/status'),
  register: (username, password) => API.post('/auth/register', { username, password }),
  login: (username, password) => API.post('/auth/login', { username, password }),
  logout: () => API.post('/auth/logout'),

  // Dashboard
  summary: () => API.get('/dashboard/summary'),
  timeline: () => API.get('/dashboard/timeline'),

  // Stocks
  stocks: {
    list: () => API.get('/stocks'),
    create: (d) => API.post('/stocks', d),
    update: (id, d) => API.put(`/stocks/${id}`, d),
    remove: (id) => API.del(`/stocks/${id}`)
  },
  // Mutual funds
  mfs: {
    list: () => API.get('/mutualfunds'),
    create: (d) => API.post('/mutualfunds', d),
    update: (id, d) => API.put(`/mutualfunds/${id}`, d),
    remove: (id) => API.del(`/mutualfunds/${id}`)
  },
  // ETF
  etfs: {
    list: () => API.get('/etf'),
    create: (d) => API.post('/etf', d),
    update: (id, d) => API.put(`/etf/${id}`, d),
    remove: (id) => API.del(`/etf/${id}`)
  },
  // F&O
  fno: {
    list: () => API.get('/fno'),
    create: (d) => API.post('/fno', d),
    update: (id, d) => API.put(`/fno/${id}`, d),
    remove: (id) => API.del(`/fno/${id}`)
  },
  // Other assets (Gold/Bonds/Cash)
  other: {
    list: (type) => API.get('/other' + (type ? `?asset_type=${encodeURIComponent(type)}` : '')),
    create: (d) => API.post('/other', d),
    update: (id, d) => API.put(`/other/${id}`, d),
    remove: (id) => API.del(`/other/${id}`)
  },

  // Backup / restore
  backup: {
    export: () => API.get('/backup/export'),
    import: (data) => API.post('/backup/import', { data })
  },

  settingsGet: () => API.get('/settings'),
  settingsSet: (key, value) => API.put(`/settings/${key}`, { value })
};
