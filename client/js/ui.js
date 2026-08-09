// UI Utilities & Modal Controller Module
window.UI = (function () {
  let pendingConfirmCallback = null;

  // ─── 1. Toast Notification System ────────────────
  function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger' || type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close">✕</button>
    `;

    // Close button click handler
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => removeToast(toast));
    }

    container.appendChild(toast);

    // Auto dismiss timer
    const timer = setTimeout(() => removeToast(toast), duration);

    function removeToast(el) {
      clearTimeout(timer);
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }
  }

  // ─── 2. Modal Controller ─────────────────────────
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // ─── 3. Custom Modal Confirmation Dialog ─────────
  function confirmDialog(options = {}) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-msg');
      const confirmBtn = document.getElementById('confirm-modal-ok-btn');
      const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

      if (!modal || !confirmBtn || !cancelBtn) {
        // Fallback to native confirm if modal element not found
        const res = window.confirm(options.message || 'Are you sure?');
        resolve(res);
        return;
      }

      if (titleEl) titleEl.textContent = options.title || 'Confirm Action';
      if (msgEl) msgEl.textContent = options.message || 'Are you sure you want to proceed?';
      if (confirmBtn) confirmBtn.textContent = options.confirmText || 'Confirm';
      if (cancelBtn) cancelBtn.textContent = options.cancelText || 'Cancel';

      openModal('confirm-modal');

      const cleanup = () => {
        closeModal('confirm-modal');
        confirmBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
      };

      const onOk = () => {
        cleanup();
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      confirmBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  // ─── 4. Global Loading Overlay ────────────────────
  function showLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('active');
  }

  function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('active');
  }

  // ─── 5. Responsive Mobile Sidebar Drawer ──────────
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    let backdrop = document.getElementById('mobile-sidebar-backdrop');

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'mobile-sidebar-backdrop';
      document.body.appendChild(backdrop);

      const handleBackdropClose = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        closeMobileSidebar();
      };

      backdrop.addEventListener('click', handleBackdropClose);
      backdrop.addEventListener('touchend', handleBackdropClose);
    }

    if (sidebar) {
      const isOpen = sidebar.classList.contains('open');
      if (isOpen) {
        closeMobileSidebar();
      } else {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    if (sidebar) {
      sidebar.classList.remove('open');
    }
    if (backdrop) {
      backdrop.classList.remove('active');
    }
    document.body.style.overflow = '';
  }

  // ─── 6. Centralized Currency Symbol Resolver ──────
  const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹'
  };

  function getCurrencySymbol(code) {
    if (!code && window.Auth) {
      const user = window.Auth.getUser();
      code = user?.currency || 'USD';
    }
    return CURRENCY_SYMBOLS[code] || '$';
  }

  return {
    showToast,
    openModal,
    closeModal,
    confirm: confirmDialog,
    showLoader,
    hideLoader,
    toggleSidebar,
    closeMobileSidebar,
    getCurrencySymbol
  };
})();
