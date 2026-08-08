// Expense Management Module — handles CRUD, filtering, searching, sorting, pagination
window.Expenses = (function () {
  // State
  let currentPage = 1;
  let totalPages = 1;
  let debounceTimer = null;

  // Payment method labels for display
  const PAYMENT_LABELS = {
    card: 'Card',
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    upi: 'UPI',
    other: 'Other'
  };

  // ─── Helpers ─────────────────────────────────

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  }

  function formatCurrency(amount) {
    const symbol = window.UI ? window.UI.getCurrencySymbol() : '$';
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  // Read all current filter/sort/search values from the DOM
  function getFilterParams() {
    const sortValue = document.getElementById('expense-sort-select')?.value || 'date-desc';
    const [sortBy, sortOrder] = sortValue.split('-');

    return {
      page: currentPage,
      limit: 10,
      search: document.getElementById('expense-search-input')?.value.trim() || '',
      category: document.getElementById('expense-category-filter')?.value || 'all',
      type: document.getElementById('expense-type-filter')?.value || 'all',
      startDate: document.getElementById('expense-start-date')?.value || '',
      endDate: document.getElementById('expense-end-date')?.value || '',
      sortBy,
      sortOrder
    };
  }

  // Build query string from filter params
  function buildQueryString(params) {
    const qs = new URLSearchParams();
    qs.set('page', params.page);
    qs.set('limit', params.limit);
    qs.set('sortBy', params.sortBy);
    qs.set('sortOrder', params.sortOrder);

    if (params.search) qs.set('search', params.search);
    if (params.category && params.category !== 'all') qs.set('category', params.category);
    if (params.type && params.type !== 'all') qs.set('type', params.type);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);

    return qs.toString();
  }

  // ─── Render Table ─────────────────────────────

  function renderTable(transactions) {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = `
        <tr id="expenses-empty-row">
          <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            No transactions found. Click "Add Entry" to create one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = transactions.map(txn => {
      const isIncome = txn.type === 'income';
      const sign = isIncome ? '+' : '-';
      const colorVar = isIncome ? 'var(--accent-success)' : 'var(--accent-danger)';
      const badgeClass = isIncome ? 'badge-income' : 'badge-expense';

      return `
        <tr data-txn-id="${txn._id}">
          <td>${formatDate(txn.date)}</td>
          <td>${txn.description || '—'}</td>
          <td>${txn.category}</td>
          <td><span class="badge ${badgeClass}">${txn.type}</span></td>
          <td>${PAYMENT_LABELS[txn.paymentMethod] || txn.paymentMethod}</td>
          <td style="font-weight: 600; color: ${colorVar};">${sign}${formatCurrency(txn.amount)}</td>
          <td>
            <button class="btn btn-secondary edit-btn" data-id="${txn._id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Edit</button>
            <button class="btn btn-danger delete-btn" data-id="${txn._id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ─── Update Pagination Controls ────────────────

  function renderPagination(pagination) {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (!pagination || pagination.totalItems === 0) {
      if (pageInfo) pageInfo.textContent = 'Showing 0 entries';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const end = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);

    if (pageInfo) {
      pageInfo.textContent = `Showing ${start} to ${end} of ${pagination.totalItems} entries (Page ${pagination.currentPage} of ${pagination.totalPages})`;
    }

    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages;

    if (prevBtn) prevBtn.disabled = !pagination.hasPrevPage;
    if (nextBtn) nextBtn.disabled = !pagination.hasNextPage;
  }

  // ─── Fetch & Render (main data loader) ─────────

  async function loadTransactions(page) {
    if (page !== undefined) currentPage = page;

    const params = getFilterParams();
    const queryString = buildQueryString(params);

    try {
      const result = await window.API.get(`/transactions?${queryString}`);
      renderTable(result.data);
      renderPagination(result.pagination);
    } catch (error) {
      console.error('Load Transactions Error:', error);
      if (error.status !== 401) {
        window.UI.showToast(error.message || 'Failed to load transactions.', 'danger');
      }
    }
  }

  // ─── Refresh Budget & Report Modules Automatically ───

  function refreshBudgetModules() {
    if (window.Budgets) {
      if (typeof window.Budgets.loadDashboardBudgetHealth === 'function') {
        window.Budgets.loadDashboardBudgetHealth();
      }
      if (typeof window.Budgets.loadAlerts === 'function') {
        window.Budgets.loadAlerts();
      }
      if (typeof window.Budgets.loadBudgets === 'function') {
        window.Budgets.loadBudgets();
      }
    }
    if (window.Reports && typeof window.Reports.loadReports === 'function') {
      window.Reports.loadReports();
    }
  }

  // ─── Create Transaction ────────────────────────

  async function createTransaction(data) {
    const result = await window.API.post('/transactions', data);
    window.UI.showToast(result.message || 'Transaction created.', 'success');
    // Reload current page to reflect new data
    await loadTransactions(1);
    // Update dashboard summary if available
    loadDashboardSummary();
    // Auto-refresh budget progress & alerts
    refreshBudgetModules();
    return result;
  }

  // ─── Update Transaction ────────────────────────

  async function updateTransaction(id, data) {
    const result = await window.API.put(`/transactions/${id}`, data);
    window.UI.showToast(result.message || 'Transaction updated.', 'success');
    await loadTransactions();
    loadDashboardSummary();
    refreshBudgetModules();
    return result;
  }

  // ─── Delete Transaction ────────────────────────

  async function deleteTransactionById(id) {
    const result = await window.API.delete(`/transactions/${id}`);
    window.UI.showToast(result.message || 'Transaction deleted.', 'success');
    // If current page becomes empty after deletion, go back one page
    const tbody = document.getElementById('expenses-table-body');
    const rowsRemaining = tbody ? tbody.querySelectorAll('tr[data-txn-id]').length : 0;
    if (rowsRemaining <= 1 && currentPage > 1) {
      currentPage--;
    }
    await loadTransactions();
    loadDashboardSummary();
    refreshBudgetModules();
    return result;
  }

  // ─── Load single transaction into edit modal ───

  async function loadTransactionForEdit(id) {
    try {
      const result = await window.API.get(`/transactions/${id}`);
      const txn = result.data;

      document.getElementById('modal-title').textContent = 'Edit Transaction';
      document.getElementById('txn-id').value = txn._id;
      document.getElementById('txn-type').value = txn.type;
      document.getElementById('txn-amount').value = txn.amount;
      document.getElementById('txn-category').value = txn.category;
      document.getElementById('txn-date').value = formatDate(txn.date);
      document.getElementById('txn-method').value = txn.paymentMethod;
      document.getElementById('txn-desc').value = txn.description || '';

      window.UI.openModal('transaction-modal');
    } catch (error) {
      window.UI.showToast(error.message || 'Failed to load transaction details.', 'danger');
    }
  }

  // ─── Dashboard Summary Loader ──────────────────

  async function loadDashboardSummary() {
    try {
      const result = await window.API.get('/transactions/summary/totals');
      const d = result.data;

      const incomeEl = document.getElementById('metric-income');
      const expenseEl = document.getElementById('metric-expense');
      const savingsEl = document.getElementById('metric-savings');
      const rateEl = document.getElementById('metric-savings-rate');

      if (incomeEl) incomeEl.textContent = formatCurrency(d.totalIncome);
      if (expenseEl) expenseEl.textContent = formatCurrency(d.totalExpense);
      if (savingsEl) savingsEl.textContent = formatCurrency(d.netSavings);
      if (rateEl) rateEl.textContent = `${d.savingsRate}%`;
    } catch (error) {
      // Silently fail — dashboard summary is non-critical
      console.warn('Dashboard summary load skipped:', error.message);
    }
  }

  // ─── Load Recent Transactions for Dashboard ────

  async function loadRecentTransactions() {
    try {
      const result = await window.API.get('/transactions?limit=5&sortBy=date&sortOrder=desc');
      const tbody = document.getElementById('dashboard-recent-transactions');
      if (!tbody) return;

      if (!result.data || result.data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No recent transactions.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = result.data.map(txn => {
        const isIncome = txn.type === 'income';
        const sign = isIncome ? '+' : '-';
        const color = isIncome ? 'var(--accent-success)' : 'var(--accent-danger)';
        const badgeClass = isIncome ? 'badge-income' : 'badge-expense';

        return `
          <tr>
            <td>${formatDate(txn.date)}</td>
            <td>${txn.category}</td>
            <td><span class="badge ${badgeClass}">${txn.type}</span></td>
            <td style="font-weight: 600; color: ${color};">${sign}${formatCurrency(txn.amount)}</td>
          </tr>
        `;
      }).join('');
    } catch (error) {
      console.warn('Recent transactions load skipped:', error.message);
    }
  }

  // ─── Event Binding (called once on DOMContentLoaded) ─

  function bindEvents() {
    // Debounced search input
    const searchInput = document.getElementById('expense-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentPage = 1;
          loadTransactions();
        }, 350);
      });
    }

    // Filter & sort dropdowns — instant reload on change
    const filterIds = ['expense-category-filter', 'expense-type-filter', 'expense-sort-select'];
    filterIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          currentPage = 1;
          loadTransactions();
        });
      }
    });

    // Date range filters
    ['expense-start-date', 'expense-end-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          currentPage = 1;
          loadTransactions();
        });
      }
    });

    // Pagination buttons
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          loadTransactions(currentPage - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          loadTransactions(currentPage + 1);
        }
      });
    }

    // Delegated click handlers for Edit & Delete buttons in table
    document.addEventListener('click', async (e) => {
      // Edit button
      if (e.target.classList.contains('edit-btn') && e.target.closest('#expenses-table-body')) {
        const id = e.target.dataset.id;
        if (id) await loadTransactionForEdit(id);
      }

      // Delete button
      if (e.target.classList.contains('delete-btn') && e.target.closest('#expenses-table-body')) {
        const id = e.target.dataset.id;
        if (id) {
          const confirmed = await window.UI.confirm({
            title: 'Delete Transaction',
            message: 'Are you sure you want to delete this transaction record? This cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel'
          });
          if (confirmed) {
            try {
              e.target.disabled = true;
              e.target.textContent = '...';
              await deleteTransactionById(id);
            } catch (error) {
              window.UI.showToast(error.message || 'Failed to delete transaction.', 'danger');
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
    loadTransactions,
    createTransaction,
    updateTransaction,
    deleteTransactionById,
    loadTransactionForEdit,
    loadDashboardSummary,
    loadRecentTransactions,
    bindEvents
  };
})();
