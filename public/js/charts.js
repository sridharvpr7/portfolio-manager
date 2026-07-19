// charts.js — small registry so we can safely destroy/recreate Chart.js
// instances every time a view re-renders (avoids "canvas already in use").

const ChartRegistry = {
  instances: {},

  destroy(key) {
    if (this.instances[key]) {
      this.instances[key].destroy();
      delete this.instances[key];
    }
  },

  create(key, ctx, config) {
    this.destroy(key);
    this.instances[key] = new Chart(ctx, config);
    return this.instances[key];
  },

  palette: ['#6366f1', '#22d3ee', '#f5b301', '#16c784', '#ea3943', '#a78bfa', '#f472b6', '#38bdf8', '#fb923c', '#94a3b8'],

  baseOptions(overrides = {}) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: getComputedStyle(document.body).getPropertyValue('--text-1') || '#aeb4c7', boxWidth: 10, font: { family: 'Sora', size: 11 } }
        }
      },
      scales: {}
    }, overrides);
  }
};
