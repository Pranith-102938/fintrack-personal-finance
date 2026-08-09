// Single Page Application Client Router — with Auth Route Guards & Data Loading
window.Router = (function () {
  const views = [
    'home',
    'dashboard',
    'expenses',
    'budgets',
    'reports',
    'tips',
    'profile',
    'login',
    'register',
    'error',
    '404'
  ];

  function navigateTo(viewName) {
    let target = viewName.toLowerCase().replace('#', '').replace('view-', '');

    if (!views.includes(target)) {
      target = '404';
    }

    // Apply auth route guard — redirects unauthenticated users or logged-in users away from login/register
    if (window.Auth) {
      target = window.Auth.guardRoute(target);
    }

    // Hide all views
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const targetElement = document.getElementById(`view-${target}`);
    if (targetElement) {
      targetElement.classList.add('active');
    }

    // Update active nav link
    document.querySelectorAll('.nav-item').forEach(nav => {
      nav.classList.remove('active');
      if (nav.dataset.view === target) {
        nav.classList.add('active');
      }
    });

    // Update Page Header Title
    const titleElement = document.getElementById('page-title');
    if (titleElement) {
      const formattedTitle = target.charAt(0).toUpperCase() + target.slice(1);
      titleElement.textContent = formattedTitle === 'Tips' ? 'Financial Tips' : formattedTitle;
    }

    // ─── View-specific data loading ──────────────
    if (window.Auth && window.Auth.isLoggedIn()) {
      if (target === 'home') {
        if (window.Home) {
          window.Home.loadHomeOverview();
        }
      }

      if (target === 'dashboard') {
        if (window.Dashboard) {
          window.Dashboard.loadDashboard();
        }
      }

      if (target === 'expenses') {
        if (window.Expenses) {
          window.Expenses.loadTransactions(1);
        }
      }

      if (target === 'budgets') {
        if (window.Budgets) {
          window.Budgets.loadBudgets();
        }
      }

      if (target === 'tips') {
        if (window.Tips) {
          window.Tips.loadTips();
        }
      }

      if (target === 'profile') {
        if (window.Profile) {
          window.Profile.renderProfile();
        }
      }

      if (target === 'reports') {
        if (window.Reports) {
          window.Reports.loadReports();
        }
      }
    }

    window.location.hash = target;
  }

  function init() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        navigateTo(hash);
      }
    });

    // Initial Route Check — respect auth state
    const initialHash = window.location.hash.substring(1) || 'dashboard';
    navigateTo(initialHash);
  }

  return {
    navigateTo,
    init
  };
})();
