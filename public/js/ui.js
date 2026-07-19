// ui.js — shared helpers used by every view module.

const UI = {
  currency(n) {
    const v = Number(n) || 0;
    return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  },
  currencyShort(n) {
    const v = Number(n) || 0;
    const abs = Math.abs(v);
    if (abs >= 1e7) return '₹' + (v / 1e7).toFixed(2) + ' Cr';
    if (abs >= 1e5) return '₹' + (v / 1e5).toFixed(2) + ' L';
    if (abs >= 1e3) return '₹' + (v / 1e3).toFixed(2) + ' K';
    return '₹' + v.toFixed(2);
  },
  pct(n) {
    const v = Number(n) || 0;
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  },
  pnlPill(pnl, pct) {
    const up = Number(pnl) >= 0;
    return `<span class="pill ${up ? 'up' : 'down'}"><i class="fa-solid fa-caret-${up ? 'up' : 'down'}"></i> ${UI.currency(Math.abs(pnl))} (${UI.pct(pct)})</span>`;
  },
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  },

  toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${UI.escapeHtml(message)}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3200);
  },

  emptyState(icon, title, sub) {
    return `<div class="empty-state"><i class="fa-solid ${icon}"></i><h4>${UI.escapeHtml(title)}</h4><p>${UI.escapeHtml(sub)}</p></div>`;
  },

  openModal(html) {
    document.getElementById('modal-box').innerHTML = html;
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.remove('hidden');
    if (window.gsap) {
      gsap.fromTo('#modal-box', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out' });
    }
  },
  closeModal() {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.getElementById('modal-box').innerHTML = '';
  },

  // Build a labeled form field
  field({ label, id, type = 'text', options, step, required = true, full = false, value = '' }) {
    const req = required ? 'required' : '';
    if (type === 'select') {
      const opts = options.map(o => `<option value="${UI.escapeHtml(o)}" ${o === value ? 'selected' : ''}>${UI.escapeHtml(o)}</option>`).join('');
      return `<div class="${full ? 'full' : ''}"><label>${label}</label><select id="${id}" ${req}>${opts}</select></div>`;
    }
    if (type === 'textarea') {
      return `<div class="full"><label>${label}</label><textarea id="${id}" rows="2">${UI.escapeHtml(value)}</textarea></div>`;
    }
    return `<div class="${full ? 'full' : ''}"><label>${label}</label><input type="${type}" id="${id}" ${step ? `step="${step}"` : ''} value="${UI.escapeHtml(value)}" ${req} /></div>`;
  }
};

document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modal-backdrop') UI.closeModal();
});
