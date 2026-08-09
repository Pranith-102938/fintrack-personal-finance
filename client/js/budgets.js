// Budget Management Module — handles CRUD, rendering, alerts, dashboard integration
window.Budgets = (function () {
  // State
  let selectedMonth = new Date().getMonth() + 1;
  let selectedYear = new Date().getFullYear();

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // ─── Helpers ─────────────────────────────────

  function formatCurrency(amount) {
    const symbol = window.UI ? window.UI.getCurrencySymbol() : '$';
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function getStatusBadge(status) {
    const map = {
      normal: '<span class="badge badge-success">Normal</span>',
      warning: '<span class="badge badge-warning">Warning</span>',
      exceeded: '<span class="badge badge-danger">Exceeded</span>'
    };
    return map[status] || map.normal;
  }

  function getProgressColor(status) {
    const map = {
      normal: 'var(--accent-primary)',
      warning: 'var(--accent-warning)',
      exceeded: 'var(--accent-danger)'
    };
    return map[status] || map.normal;
  }

  // ─── Populate Month/Year Selectors ────────────

  function initSelectors() {
    const monthSelect = document.getElementById('budget-month-select');
    const yearSelect = document.getElementById('budget-year-select');

    if (monthSelect && monthSelect.options.length === 0) {
      MONTH_NAMES.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1;
        opt.textContent = name;
        if (i + 1 === selectedMonth) opt.selected = true;
        monthSelect.appendChild(opt);
      });

      monthSelect.addEventListener('change', () => {
        selectedMonth = parseInt(monthSelect.value);
        loadBudgets();
      });
    }

    if (yearSelect && yearSelect.options.length === 0) {
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 2; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === selectedYear) opt.selected = true;
        yearSelect.appendChild(opt);
      }

      yearSelect.addEventListener('change', () => {
        selectedYear = parseInt(yearSelect.value);
        loadBudgets();
      });
    }
  }

  // ─── Render Budget Cards Grid ─────────────────

  function renderBudgetCards(budgets) {
    const grid = document.getElementById('budgets-grid');
    if (!grid) return;

    if (!budgets || budgets.length === 0) {
      grid.innerHTML = `
        <div id="budgets-empty-state" class="card" style="text-align: center; padding: 3rem; color: var(--text-muted); grid-column: 1 / -1;">
          No budgets set for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}. Click "Set New Budget" to create one.
        </div>
      `;
      return;
    }

    const esc = window.UI ? window.UI.escapeHtml : (s => s);

    grid.innerHTML = budgets.map(b => {
      const safeId = esc(b._id || '');
      const safeCategory = esc(b.category || '');
      const safeNotes = b.notes ? esc(b.notes) : '';

      return `
        <div class="card" data-budget-id="${safeId}">
          <div class="budget-card-header">
            <h3>${safeCategory}</h3>
            ${getStatusBadge(b.status)}
          </div>
          <div class="progress-bar-bg" style="height: 10px; margin-bottom: 0.75rem;">
            <div class="progress-bar-fill" style="width: ${Math.min(100, b.percentage)}%; background-color: ${getProgressColor(b.status)}; transition: width 0.4s ease;"></div>
          </div>
          <div class="budget-meta">
            <span>Spent: ${formatCurrency(b.spent)}</span>
            <span>Limit: ${formatCurrency(b.limit)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              ${b.percentage}% used · ${formatCurrency(b.remaining)} left
            </span>
          </div>
          ${safeNotes ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.5rem; font-style: italic;">📝 ${safeNotes}</div>` : ''}
          <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button class="btn btn-secondary edit-budget-btn" data-id="${safeId}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Edit</button>
            <button class="btn btn-danger delete-budget-btn" data-id="${safeId}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── Render Summary Bar ────────────────────────

  function renderSummary(summary) {
    const bar = document.getElementById('budget-summary-bar');
    if (!bar || !summary) return;

    if (summary.budgetCount === 0) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = '';
    document.getElementById('budget-total-limit').textContent = formatCurrency(summary.totalLimit);
    document.getElementById('budget-total-spent').textContent = formatCurrency(summary.totalSpent);
    document.getElementById('budget-total-remaining').textContent = formatCurrency(summary.totalRemaining);
    document.getElementById('budget-exceeded-count').textContent = summary.exceededCount;
  }

  // ─── Render Alerts Banner ──────────────────────

  async function loadAlerts() {
    try {
      const result = await window.API.get('/budgets/alerts/check');
      const container = document.getElementById('budget-alerts-container');
      if (!container) return;

      if (!result.hasAlerts) {
        container.style.display = 'none';
        return;
      }

      const esc = window.UI ? window.UI.escapeHtml : (s => s);

      container.style.display = '';
      container.innerHTML = result.data.map(alert => {
        const bgColor = alert.status === 'exceeded'
          ? 'rgba(239, 68, 68, 0.1)'
          : 'rgba(245, 158, 11, 0.1)';
        const borderColor = alert.status === 'exceeded'
          ? 'var(--accent-danger)'
          : 'var(--accent-warning)';

        const safeMsg = esc(alert.message || '');

        return `
          <div class="card" style="padding: 0.75rem 1rem; margin-bottom: 0.5rem; border-left: 4px solid ${borderColor}; background: ${bgColor};">
            <div style="font-size: 0.85rem; font-weight: 500; color: var(--text-primary);">${safeMsg}</div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.warn('Budget alerts check skipped:', error.message);
    }
  }

  // ─── Load Budgets (main data loader) ───────────

  async function loadBudgets() {
    initSelectors();

    try {
      const result = await window.API.get(`/budgets?month=${selectedMonth}&year=${selectedYear}`);
      renderBudgetCards(result.data);
      renderSummary(result.summary);
      loadAlerts();
    } catch (error) {
      console.error('Load Budgets Error:', error);
      if (error.status !== 401) {
        window.UI.showToast(error.message || 'Failed to load budgets.', 'danger');
      }
    }
  }

  // ─── Dashboard Budget Health Widget ────────────

  async function loadDashboardBudgetHealth() {
    try {
      const now = new Date();
      const result = await window.API.get(`/budgets?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      const container = document.getElementById('dashboard-budget-health');
      if (!container) return;

      if (!result.data || result.data.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
            No budgets set for this month. <a href="#budgets" style="color: var(--accent-primary); cursor: pointer;">Set one now</a>
          </div>
        `;
        return;
      }

      container.innerHTML = result.data.map(b => `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
            <span>${b.category}</span>
            <span>${formatCurrency(b.spent)} / ${formatCurrency(b.limit)} (${b.percentage}%)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${Math.min(100, b.percentage)}%; background-color: ${getProgressColor(b.status)}; transition: width 0.4s ease;"></div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.warn('Dashboard budget health skipped:', error.message);
    }
  }

  // ─── Create Budget ─────────────────────────────

  async function createBudget(data) {
    data.month = selectedMonth;
    data.year = selectedYear;
    const result = await window.API.post('/budgets', data);
    window.UI.showToast(result.message || 'Budget created.', 'success');
    await loadBudgets();
    loadDashboardBudgetHealth();
    return result;
  }

  // ─── Update Budget ─────────────────────────────

  async function updateBudget(id, data) {
    const result = await window.API.put(`/budgets/${id}`, data);
    window.UI.showToast(result.message || 'Budget updated.', 'success');
    await loadBudgets();
    loadDashboardBudgetHealth();
    return result;
  }

  // ─── Delete Budget ─────────────────────────────

  async function deleteBudgetById(id) {
    const result = await window.API.delete(`/budgets/${id}`);
    window.UI.showToast(result.message || 'Budget deleted.', 'success');
    await loadBudgets();
    loadDashboardBudgetHealth();
    return result;
  }

  // ─── Load Budget Into Edit Modal ───────────────

  async function loadBudgetForEdit(id) {
    try {
      const result = await window.API.get(`/budgets/${id}`);
      const b = result.data;

      document.getElementById('budget-modal-title').textContent = 'Edit Budget';
      document.getElementById('budget-id').value = b._id;
      document.getElementById('budget-category').value = b.category;
      document.getElementById('budget-limit').value = b.limit;
      document.getElementById('budget-alert-threshold').value = b.alertThreshold;
      document.getElementById('budget-notes').value = b.notes || '';

      window.UI.openModal('budget-modal');
    } catch (error) {
      window.UI.showToast(error.message || 'Failed to load budget details.', 'danger');
    }
  }

  // ─── Event Binding (called once on DOMContentLoaded) ─

  function bindEvents() {
    // Delegated click handlers for Edit & Delete buttons in budget cards
    document.addEventListener('click', async (e) => {
      // Edit budget
      if (e.target.classList.contains('edit-budget-btn') && e.target.closest('#budgets-grid')) {
        const id = e.target.dataset.id;
        if (id) await loadBudgetForEdit(id);
      }

      // Delete budget
      if (e.target.classList.contains('delete-budget-btn') && e.target.closest('#budgets-grid')) {
        const id = e.target.dataset.id;
        if (id) {
          const confirmed = await window.UI.confirm({
            title: 'Delete Monthly Budget',
            message: 'Are you sure you want to delete this category budget limit? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel'
          });
          if (confirmed) {
            try {
              e.target.disabled = true;
              e.target.textContent = '...';
              await deleteBudgetById(id);
            } catch (error) {
              window.UI.showToast(error.message || 'Failed to delete budget.', 'danger');
              e.target.disabled = false;
              e.target.textContent = 'Delete';
            }
          }
        }
      }
    });
  }

  // ─── Public API ────────────────────────────────

  return {
    loadBudgets,
    createBudget,
    updateBudget,
    deleteBudgetById,
    loadBudgetForEdit,
    loadDashboardBudgetHealth,
    loadAlerts,
    bindEvents,
    initSelectors
  };
})();
