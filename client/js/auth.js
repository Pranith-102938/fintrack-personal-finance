// Authentication State Manager — handles login/register/logout + UI toggling
window.Auth = (function () {
  const TOKEN_KEY = 'finance_tracker_token';
  const USER_KEY = 'finance_tracker_user';

  // Public views that don't require authentication
  const PUBLIC_VIEWS = ['home', 'login', 'register'];
  // Views that logged-in users should not see (redirect to home)
  const GUEST_ONLY_VIEWS = ['login', 'register'];

  // Store session data in localStorage
  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // Clear all session data
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Get current token
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Get stored user data
  function getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // Check if user is currently authenticated
  function isLoggedIn() {
    return !!getToken();
  }

  // Update all UI elements to reflect auth state
  function updateUI() {
    const user = getUser();
    const loggedIn = isLoggedIn();

    // Toggle Public Landing vs Logged-In Home Overview
    const publicLanding = document.getElementById('home-public-landing');
    const loggedInOverview = document.getElementById('home-logged-in-overview');

    if (publicLanding) {
      publicLanding.style.display = loggedIn ? 'none' : 'block';
    }
    if (loggedInOverview) {
      loggedInOverview.style.display = loggedIn ? 'block' : 'none';
    }

    // Sidebar visibility
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.style.display = loggedIn ? '' : 'none';
    }

    // Main wrapper margin when sidebar hidden
    const mainWrapper = document.getElementById('main-wrapper');
    if (mainWrapper) {
      mainWrapper.style.marginLeft = loggedIn ? '' : '0';
    }

    // User header profile area
    const userProfile = document.getElementById('user-header-profile');
    if (userProfile) {
      if (loggedIn && user) {
        const initials = user.name
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);

        userProfile.innerHTML = `
          <div style="width: 36px; height: 36px; border-radius: 50%; background-color: var(--accent-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
            ${initials}
          </div>
          <span style="font-weight: 500; font-size: 0.9rem; color: var(--text-primary);">${user.name}</span>
          <button id="header-logout-btn" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Logout</button>
        `;

        // Re-attach logout handler to the dynamically rendered button
        const logoutBtn = document.getElementById('header-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => logout());
        }
      } else {
        userProfile.innerHTML = `
          <button id="header-login-link" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Sign In</button>
        `;
        const loginLink = document.getElementById('header-login-link');
        if (loginLink) {
          loginLink.addEventListener('click', () => window.Router.navigateTo('login'));
        }
      }
    }

    // Profile page: populate form fields with stored user data
    if (loggedIn && user) {
      const profileName = document.getElementById('profile-name');
      const profileEmail = document.getElementById('profile-email');
      const profileCurrency = document.getElementById('profile-currency');
      const profileTarget = document.getElementById('profile-income-target');

      if (profileName) profileName.value = user.name || '';
      if (profileEmail) profileEmail.value = user.email || '';
      if (profileCurrency) profileCurrency.value = user.currency || 'USD';
      if (profileTarget) profileTarget.value = user.monthlyIncomeTarget || 0;
    }
  }

  // Register new user account
  async function register(name, email, password) {
    const result = await window.API.post('/auth/register', { name, email, password });
    saveSession(result.token, result.user);
    updateUI();
    return result;
  }

  // Login existing user
  async function login(email, password) {
    const result = await window.API.post('/auth/login', { email, password });
    saveSession(result.token, result.user);
    updateUI();
    return result;
  }

  // Logout — clear session and redirect to login
  function logout(silent = false) {
    clearSession();
    updateUI();
    if (window.Router) {
      window.Router.navigateTo('login');
    }
    if (!silent && window.UI) {
      window.UI.showToast('You have been logged out successfully.', 'info');
    }
  }

  // Fetch fresh user data from server using stored token
  async function refreshUser() {
    try {
      const result = await window.API.get('/auth/me');
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      updateUI();
      return result.user;
    } catch {
      // Token invalid or expired — logout silently
      logout(true);
      return null;
    }
  }

  // Update user profile on server
  async function updateProfile(data) {
    const result = await window.API.put('/auth/profile', data);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    updateUI();
    return result;
  }

  // Change user password on server
  async function changePassword(currentPassword, newPassword) {
    const result = await window.API.put('/auth/change-password', { currentPassword, newPassword });
    return result;
  }

  // Route guard — called by Router before navigating to enforce auth rules
  function guardRoute(viewName) {
    const loggedIn = isLoggedIn();

    // Unauthenticated user trying to access protected view
    if (!loggedIn && !PUBLIC_VIEWS.includes(viewName)) {
      return 'login';
    }

    // Authenticated user trying to access guest-only view (login/register)
    if (loggedIn && GUEST_ONLY_VIEWS.includes(viewName)) {
      return 'dashboard';
    }

    return viewName; // Allow navigation as-is
  }

  // Initialize auth state on page load
  function init() {
    updateUI();

    // If user has a token, verify it's still valid
    if (isLoggedIn()) {
      refreshUser();
    }
  }

  return {
    register,
    login,
    logout,
    isLoggedIn,
    getUser,
    getToken,
    refreshUser,
    updateProfile,
    changePassword,
    updateUI,
    guardRoute,
    init
  };
})();
