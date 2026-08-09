// Home Overview & Personal Finance Launchpad Module
window.Home = (function () {

  function getSymbol() {
    return window.UI ? window.UI.getCurrencySymbol() : '$';
  }

  function formatCurrency(amount) {
    const symbol = getSymbol();
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  // Load and render logged-in user's Home Overview Launchpad
  async function loadHomeOverview() {
    const user = window.Auth ? window.Auth.getUser() : null;
    const symbol = getSymbol();

    // 1. Personalized Greeting
    const welcomeNameEl = document.getElementById('home-user-name');
    if (welcomeNameEl) {
      welcomeNameEl.textContent = (user && user.name) ? user.name.split(' ')[0] : 'Friend';
    }

    // 2. Fetch Summary Data (reusing existing API endpoints safely)
    try {
      const [statsRes, txnsRes, tipsRes] = await Promise.all([
        window.API.get('/dashboard/stats').catch(() => null),
        window.API.get('/transactions?limit=4').catch(() => null),
        fetch('data/tips.json').then(r => r.json()).catch(() => null)
      ]);

      // 3. Render Quick Snapshot Cards
      if (statsRes && statsRes.data && statsRes.data.metrics) {
        const m = statsRes.data.metrics;
        const netBalance = (m.monthlyIncome || 0) - (m.monthlyExpense || 0);

        const netEl = document.getElementById('home-net-balance');
        const savingsEl = document.getElementById('home-savings-amount');
        const txnsCountEl = document.getElementById('home-txns-count');

        if (netEl) {
          netEl.textContent = formatCurrency(netBalance);
          netEl.style.color = netBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
        }

        if (savingsEl) {
          savingsEl.textContent = formatCurrency(m.netSavings || 0);
        }

        if (txnsCountEl) {
          const totalCount = m.totalTransactionsCount !== undefined 
            ? m.totalTransactionsCount 
            : (txnsRes && txnsRes.pagination ? txnsRes.pagination.totalItems : 0);
          txnsCountEl.textContent = `${totalCount || 0}`;
        }
      }

      // 4. Render Recent Activity Feed (or Empty State)
      const recentContainer = document.getElementById('home-recent-activity');
      if (recentContainer) {
        if (txnsRes && txnsRes.data && txnsRes.data.length > 0) {
          recentContainer.innerHTML = txnsRes.data.map(txn => {
            const isExpense = txn.type === 'expense';
            const amtColor = isExpense ? 'var(--accent-danger)' : 'var(--accent-success)';
            const sign = isExpense ? '-' : '+';
            const dateStr = txn.date 
              ? new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'Recent';

            const rawDesc = txn.description || txn.category || '';
            const safeDesc = window.UI ? window.UI.escapeHtml(rawDesc) : rawDesc;
            const safeCat = window.UI ? window.UI.escapeHtml(txn.category || '') : (txn.category || '');

            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background-color: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                    ${isExpense ? '💸' : '💰'}
                  </div>
                  <div>
                    <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">${safeDesc}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${safeCat} • ${dateStr}</div>
                  </div>
                </div>
                <div style="font-weight: 700; font-size: 0.9rem; color: ${amtColor};">
                  ${sign}${symbol}${parseFloat(txn.amount || 0).toFixed(2)}
                </div>
              </div>
            `;
          }).join('');
        } else {
          recentContainer.innerHTML = `
            <div style="text-align: center; padding: 1.75rem 1rem; color: var(--text-secondary);">
              <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🌱</div>
              <h4 style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; color: var(--text-primary);">Your financial journey starts here</h4>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.2rem; max-width: 280px; margin-left: auto; margin-right: auto;">No transactions recorded yet. Add your first income or expense to get started.</p>
              <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                <button onclick="window.Home.openIncomeModal()" class="btn btn-primary" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;">Add First Income</button>
                <button onclick="window.Home.openExpenseModal()" class="btn btn-secondary" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;">Add First Expense</button>
              </div>
            </div>
          `;
        }
      }

      // 5. Featured Financial Tip
      const tipTextEl = document.getElementById('home-featured-tip-text');
      const tipCatEl = document.getElementById('home-featured-tip-cat');
      if (tipsRes && tipsRes.tips && tipsRes.tips.length > 0) {
        const featuredTip = tipsRes.daily_tip || tipsRes.tips[0];
        if (tipTextEl) tipTextEl.textContent = featuredTip.advice || featuredTip.description || featuredTip.title;
        if (tipCatEl) tipCatEl.textContent = `💡 ${featuredTip.category || 'Financial Wisdom'}`;
      }

    } catch (err) {
      console.error('Error loading Home Overview:', err);
    }
  }

  // Quick Action Modal Triggers
  function openIncomeModal() {
    if (window.UI) {
      const modalTitle = document.getElementById('modal-title');
      const form = document.getElementById('transaction-form');
      const txnId = document.getElementById('txn-id');
      const txnType = document.getElementById('txn-type');

      if (modalTitle) modalTitle.textContent = 'Add Income';
      if (form) form.reset();
      if (txnId) txnId.value = '';
      if (txnType) txnType.value = 'income';

      window.UI.openModal('transaction-modal');
    }
  }

  function openExpenseModal() {
    if (window.UI) {
      const modalTitle = document.getElementById('modal-title');
      const form = document.getElementById('transaction-form');
      const txnId = document.getElementById('txn-id');
      const txnType = document.getElementById('txn-type');

      if (modalTitle) modalTitle.textContent = 'Add Expense';
      if (form) form.reset();
      if (txnId) txnId.value = '';
      if (txnType) txnType.value = 'expense';

      window.UI.openModal('transaction-modal');
    }
  }

  return {
    loadHomeOverview,
    openIncomeModal,
    openExpenseModal
  };
})();
