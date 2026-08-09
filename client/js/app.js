// Main Application Entry & Event Listener Binding
document.addEventListener('DOMContentLoaded', () => {
  console.log('Finance Tracker Application Initializing...');

  // Initialize Auth State (updates UI, verifies stored token)
  if (window.Auth) {
    window.Auth.init();
  }

  // Initialize Expenses module event bindings
  if (window.Expenses) {
    window.Expenses.bindEvents();
  }

  // Initialize Budgets module event bindings
  if (window.Budgets) {
    window.Budgets.bindEvents();
  }

  // Initialize Tips module event bindings
  if (window.Tips) {
    window.Tips.bindEvents();
  }

  // Initialize Profile module event bindings
  if (window.Profile) {
    window.Profile.bindEvents();
  }

  // Initialize Router (reads hash, applies auth guard, navigates)
  if (window.Router) {
    window.Router.init();
  }

  // Helper: Get local calendar date in YYYY-MM-DD format
  function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Set default transaction date to local today in modal
  const dateInput = document.getElementById('txn-date');
  if (dateInput) {
    dateInput.value = getLocalDateString();
  }

  // ──────────────────────────────────────────────
  // 1. Sidebar & Mobile Drawer Toggles
  // ──────────────────────────────────────────────
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.UI.closeMobileSidebar();
    });
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.UI.toggleSidebar();
    });
  }

  // ──────────────────────────────────────────────
  // 2. Navigation Item & Action Card Keyboard Controls
  // ──────────────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(item => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      if (view && window.Router) {
        window.Router.navigateTo(view);
      }
      if (window.UI && typeof window.UI.closeMobileSidebar === 'function') {
        window.UI.closeMobileSidebar();
      }
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });

  document.querySelectorAll('.home-action-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Global Escape key listener to dismiss open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModals = document.querySelectorAll('.modal-backdrop.active');
      activeModals.forEach(m => {
        if (window.UI && typeof window.UI.closeModal === 'function') {
          window.UI.closeModal(m.id);
        }
      });
    }
  });

  // ──────────────────────────────────────────────
  // 3. Transaction Modal Controls
  // ──────────────────────────────────────────────
  const quickAddBtn = document.getElementById('quick-add-btn');
  const expensesAddBtn = document.getElementById('expenses-add-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  const openTxnModal = () => {
    document.getElementById('modal-title').textContent = 'Add Transaction';
    document.getElementById('transaction-form').reset();
    document.getElementById('txn-id').value = '';
    if (dateInput) dateInput.value = getLocalDateString();
    window.UI.openModal('transaction-modal');
  };

  const closeTxnModal = () => window.UI.closeModal('transaction-modal');

  if (quickAddBtn) quickAddBtn.addEventListener('click', openTxnModal);
  if (expensesAddBtn) expensesAddBtn.addEventListener('click', openTxnModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeTxnModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeTxnModal);

  // Budget Modal Controls
  const dashboardAddBudgetBtn = document.getElementById('dashboard-add-budget-btn');
  const addBudgetBtn = document.getElementById('add-budget-btn');
  const budgetModalCloseBtn = document.getElementById('budget-modal-close-btn');
  const budgetCancelBtn = document.getElementById('budget-cancel-btn');

  const openBudgetModal = () => {
    document.getElementById('budget-modal-title').textContent = 'Set Monthly Category Budget';
    document.getElementById('budget-form').reset();
    document.getElementById('budget-id').value = '';
    document.getElementById('budget-alert-threshold').value = '80';
    window.UI.openModal('budget-modal');
  };

  const closeBudgetModal = () => window.UI.closeModal('budget-modal');

  if (dashboardAddBudgetBtn) dashboardAddBudgetBtn.addEventListener('click', openBudgetModal);
  if (addBudgetBtn) addBudgetBtn.addEventListener('click', openBudgetModal);
  if (budgetModalCloseBtn) budgetModalCloseBtn.addEventListener('click', closeBudgetModal);
  if (budgetCancelBtn) budgetCancelBtn.addEventListener('click', closeBudgetModal);

  // ──────────────────────────────────────────────
  // 4. AUTHENTICATION FORMS — Connected to Backend
  // ──────────────────────────────────────────────

  // Login Form → POST /api/v1/auth/login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        window.UI.showToast('Please fill in all fields.', 'warning');
        return;
      }

      const submitBtn = document.getElementById('login-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing In...';
      window.UI.showLoader();

      try {
        const result = await window.Auth.login(email, password);
        window.UI.hideLoader();
        window.UI.showToast(result.message || 'Welcome back!', 'success');
        window.Router.navigateTo('home');
      } catch (error) {
        window.UI.hideLoader();
        window.UI.showToast(error.message || 'Login failed. Please try again.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }

  // Register Form → POST /api/v1/auth/register
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;

      if (!name || !email || !password) {
        window.UI.showToast('Please fill in all fields.', 'warning');
        return;
      }

      if (password.length < 6) {
        window.UI.showToast('Password must be at least 6 characters.', 'warning');
        return;
      }

      const submitBtn = document.getElementById('register-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';
      window.UI.showLoader();

      try {
        const result = await window.Auth.register(name, email, password);
        window.UI.hideLoader();
        window.UI.showToast(result.message || `Welcome, ${name}!`, 'success');
        window.Router.navigateTo('home');
      } catch (error) {
        window.UI.hideLoader();
        window.UI.showToast(error.message || 'Registration failed. Please try again.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register Account';
      }
    });
  }

  // Profile form submission is managed by profile.js

  // ──────────────────────────────────────────────
  // 5. TRANSACTION FORM — Connected to Backend API
  // ──────────────────────────────────────────────
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('txn-id').value;
      const type = document.getElementById('txn-type').value;
      const amount = document.getElementById('txn-amount').value;
      const category = document.getElementById('txn-category').value;
      const date = document.getElementById('txn-date').value;
      const paymentMethod = document.getElementById('txn-method').value;
      const description = document.getElementById('txn-desc').value.trim();

      // Client-side validation
      if (!type || !amount || !category || !date) {
        window.UI.showToast('Please fill in all required fields.', 'warning');
        return;
      }

      if (parseFloat(amount) <= 0) {
        window.UI.showToast('Amount must be greater than zero.', 'warning');
        return;
      }

      const saveBtn = document.getElementById('save-txn-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const payload = { type, amount: parseFloat(amount), category, date, paymentMethod, description };

      try {
        if (id) {
          // Editing existing transaction
          await window.Expenses.updateTransaction(id, payload);
        } else {
          // Creating new transaction
          await window.Expenses.createTransaction(payload);
        }
        closeTxnModal();
      } catch (error) {
        window.UI.showToast(error.message || 'Failed to save transaction.', 'danger');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Transaction';
      }
    });
  }

  // ──────────────────────────────────────────────
  // 6. BUDGET FORM — Connected to Backend API
  // ──────────────────────────────────────────────
  const budgetForm = document.getElementById('budget-form');
  if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('budget-id').value;
      const category = document.getElementById('budget-category').value;
      const limit = document.getElementById('budget-limit').value;
      const alertThreshold = document.getElementById('budget-alert-threshold').value || 80;
      const notes = document.getElementById('budget-notes').value.trim();

      if (!category || !limit) {
        window.UI.showToast('Please fill in all required fields.', 'warning');
        return;
      }

      if (parseFloat(limit) < 1) {
        window.UI.showToast('Budget limit must be at least $1.', 'warning');
        return;
      }

      const saveBtn = document.getElementById('save-budget-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const payload = {
        category,
        limit: parseFloat(limit),
        alertThreshold: parseInt(alertThreshold),
        notes
      };

      try {
        if (id) {
          await window.Budgets.updateBudget(id, payload);
        } else {
          await window.Budgets.createBudget(payload);
        }
        closeBudgetModal();
      } catch (error) {
        window.UI.showToast(error.message || 'Failed to save budget.', 'danger');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Budget';
      }
    });
  }

  // ──────────────────────────────────────────────
  // 7. Hero & View Redirect Buttons
  // ──────────────────────────────────────────────
  const homeGetStartedBtn = document.getElementById('home-get-started-btn');
  const homeLoginBtn = document.getElementById('home-login-btn');
  const gotoRegisterBtn = document.getElementById('goto-register-btn');
  const gotoLoginBtn = document.getElementById('goto-login-btn');
  const dashboardViewAllExpensesBtn = document.getElementById('dashboard-view-all-expenses-btn');
  const notFoundHomeBtn = document.getElementById('not-found-home-btn');
  const errorRetryBtn = document.getElementById('error-retry-btn');

  if (homeGetStartedBtn) homeGetStartedBtn.addEventListener('click', () => window.Router.navigateTo('register'));
  if (homeLoginBtn) homeLoginBtn.addEventListener('click', () => window.Router.navigateTo('login'));
  if (gotoRegisterBtn) gotoRegisterBtn.addEventListener('click', () => window.Router.navigateTo('register'));
  if (gotoLoginBtn) gotoLoginBtn.addEventListener('click', () => window.Router.navigateTo('login'));
  if (dashboardViewAllExpensesBtn) dashboardViewAllExpensesBtn.addEventListener('click', () => window.Router.navigateTo('expenses'));
  if (notFoundHomeBtn) notFoundHomeBtn.addEventListener('click', () => window.Router.navigateTo('dashboard'));
  if (errorRetryBtn) {
    errorRetryBtn.addEventListener('click', () => {
      window.UI.showLoader();
      setTimeout(() => {
        window.UI.hideLoader();
        window.UI.showToast('Server connection restored.', 'success');
        window.Router.navigateTo('dashboard');
      }, 500);
    });
  }

  // ──────────────────────────────────────────────
  // 8. Report Export Triggers
  // ──────────────────────────────────────────────
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  const applyReportFilterBtn = document.getElementById('apply-report-filter-btn');

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (window.Reports) {
        window.Reports.exportCSV();
      }
    });
  }
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      if (window.Reports) {
        window.Reports.exportPDF();
      } else {
        window.print();
      }
    });
  }
  if (applyReportFilterBtn) {
    applyReportFilterBtn.addEventListener('click', () => {
      if (window.Reports) {
        window.Reports.loadReports();
      }
    });
  }

  // ──────────────────────────────────────────────
  // 9. Miscellaneous Delegated Handlers
  // ──────────────────────────────────────────────
  // Note: Budget edit/delete handlers are in budgets.js (scoped to #budgets-grid)
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tip-action-btn')) {
      const action = e.target.dataset.action;
      window.UI.showToast(`Executing action: ${action}`, 'info');
    }
  });

  // ──────────────────────────────────────────────
  // 10. Notifications & Misc
  // ──────────────────────────────────────────────
  const notificationsBtn = document.getElementById('notifications-btn');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', () => {
      window.UI.showToast('No new unread notifications.', 'info');
    });
  }

  const avatarUploadBtn = document.getElementById('avatar-upload-btn');
  if (avatarUploadBtn) {
    avatarUploadBtn.addEventListener('click', () => {
      window.UI.showToast('Select a new profile photo image file.', 'info');
    });
  }
});
