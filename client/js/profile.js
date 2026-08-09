// User Profile & Settings Management Module
window.Profile = (function () {

  // Preset avatar icons for easy profile photo selection
  const AVATAR_PRESETS = [
    '👤', '👨‍💼', '👩‍💼', '🧑‍💻', '👨‍🎨', '👩‍🔬', '🚀', '👑'
  ];

  // Populate profile view elements from current user state
  function renderProfile() {
    if (!window.Auth) return;
    const user = window.Auth.getUser();
    if (!user) return;

    // Avatar & Header elements
    const avatarBox = document.getElementById('profile-avatar-display');
    const nameEl = document.getElementById('profile-display-name');
    const emailEl = document.getElementById('profile-display-email');
    const createdEl = document.getElementById('profile-display-created');

    // Input fields
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const currencySelect = document.getElementById('profile-currency');
    const targetInput = document.getElementById('profile-income-target');

    // Compute initials fallback
    const initials = (user.name || 'User')
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    if (avatarBox) {
      const esc = window.UI ? window.UI.escapeHtml : (s => s);
      const safeAvatar = esc(user.avatar || '');
      const safeInitials = esc(initials);

      if (user.avatar && user.avatar.length <= 4) {
        // Emoji avatar
        avatarBox.innerHTML = `<span style="font-size: 2.5rem;">${safeAvatar}</span>`;
      } else if (user.avatar && /^https?:\/\//i.test(user.avatar)) {
        // Image URL avatar (enforce http/https protocol and escape attribute)
        avatarBox.innerHTML = `<img src="${safeAvatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        avatarBox.innerHTML = `<span style="font-weight: 700; font-size: 2rem;">${safeInitials}</span>`;
      }
    }

    if (nameEl) nameEl.textContent = user.name || 'User';
    if (emailEl) emailEl.textContent = user.email || 'user@example.com';
    if (createdEl && user.createdAt) {
      const d = new Date(user.createdAt);
      createdEl.textContent = `Member since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }

    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (currencySelect) currencySelect.value = user.currency || 'USD';
    if (targetInput) targetInput.value = user.monthlyIncomeTarget || 0;

    renderAvatarPresets(user.avatar);
  }

  // Render avatar preset buttons
  function renderAvatarPresets(currentAvatar) {
    const container = document.getElementById('avatar-presets-grid');
    if (!container) return;

    container.innerHTML = AVATAR_PRESETS.map(icon => `
      <button type="button" class="btn btn-secondary avatar-preset-btn ${currentAvatar === icon ? 'active' : ''}" 
              data-avatar="${icon}" 
              style="width: 42px; height: 42px; padding: 0; font-size: 1.25rem; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        ${icon}
      </button>
    `).join('');
  }

  // Handle avatar preset click
  async function selectAvatar(icon) {
    try {
      window.UI.showLoader();
      const result = await window.Auth.updateProfile({ avatar: icon });
      window.UI.hideLoader();
      window.UI.showToast('Profile photo updated!', 'success');
      renderProfile();
    } catch (error) {
      window.UI.hideLoader();
      window.UI.showToast(error.message || 'Failed to update avatar.', 'danger');
    }
  }

  // Bind event listeners for forms
  function bindEvents() {
    // Delegated click for avatar presets
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.avatar-preset-btn');
      if (btn) {
        const icon = btn.dataset.avatar;
        selectAvatar(icon);
      }
    });

    // Profile Info Form Submit
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('profile-name').value.trim();
        const email = document.getElementById('profile-email').value.trim();
        const currency = document.getElementById('profile-currency').value;
        const monthlyIncomeTarget = parseFloat(document.getElementById('profile-income-target').value) || 0;

        if (!name || !email) {
          window.UI.showToast('Name and email are required.', 'warning');
          return;
        }

        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        window.UI.showLoader();

        try {
          const result = await window.Auth.updateProfile({ name, email, currency, monthlyIncomeTarget });
          window.UI.hideLoader();
          window.UI.showToast(result.message || 'Profile saved successfully.', 'success');
          renderProfile();
        } catch (error) {
          window.UI.hideLoader();
          window.UI.showToast(error.message || 'Failed to save profile.', 'danger');
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      });
    }

    // Change Password Form Submit
    const passwordForm = document.getElementById('change-password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!currentPassword || !newPassword) {
          window.UI.showToast('Please enter your current and new password.', 'warning');
          return;
        }

        if (newPassword.length < 6) {
          window.UI.showToast('New password must be at least 6 characters.', 'warning');
          return;
        }

        if (newPassword !== confirmPassword) {
          window.UI.showToast('New passwords do not match.', 'danger');
          return;
        }

        const submitBtn = document.getElementById('change-password-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
        window.UI.showLoader();

        try {
          const result = await window.Auth.changePassword(currentPassword, newPassword);
          window.UI.hideLoader();
          window.UI.showToast(result.message || 'Password changed successfully.', 'success');
          passwordForm.reset();
        } catch (error) {
          window.UI.hideLoader();
          window.UI.showToast(error.message || 'Failed to change password.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Password';
        }
      });
    }
  }

  return {
    renderProfile,
    bindEvents
  };
})();
