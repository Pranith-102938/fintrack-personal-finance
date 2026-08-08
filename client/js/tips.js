// Financial Tips & Advisory Module — Handles search, category filtering, daily tip highlight, and AI-ready JSON integration
window.Tips = (function () {
  let tipsData = null;
  let activeCategory = 'all';
  let searchQuery = '';
  let debounceTimer = null;

  // Fallback inline data if JSON fetch fails
  const FALLBACK_DATA = {
    daily_tip: {
      id: "tip-daily-01",
      title: "The 24-Hour Impulse Control Rule",
      category: "saving",
      categoryLabel: "Daily Tip of the Day",
      icon: "⏳",
      badgeColor: "var(--accent-primary)",
      summary: "Wait 24 hours before making any non-essential purchase over $50.",
      content: "Before making an unplanned purchase over $50, force a mandatory 24-hour cooling period. Studies show that over 65% of impulse purchase urges fade within 24 hours. If you still feel it adds genuine long-term value tomorrow, go ahead — otherwise, transfer that amount directly into your high-yield savings account.",
      readTime: "2 min read",
      actionText: "Set Up Auto Savings",
      actionType: "navigate_budgets"
    },
    categories: [
      { id: "all", label: "All Advice" },
      { id: "budgeting", label: "Budget Tips" },
      { id: "saving", label: "Saving Tips" },
      { id: "investing", label: "Investment Basics" },
      { id: "emergency", label: "Emergency Fund Advice" }
    ],
    tips: [
      {
        id: "tip-b1",
        title: "Master the 50/30/20 Budgeting Framework",
        category: "budgeting",
        categoryLabel: "Budget Tips",
        icon: "📊",
        badgeColor: "var(--accent-primary)",
        summary: "Allocate 50% of income to Needs, 30% to Wants, and 20% to Savings.",
        content: "Divide your net post-tax income into three simple buckets: 50% for mandatory living costs (rent, groceries, utilities), 30% for discretionary personal wants (dining out, entertainment), and 20% dedicated to building wealth and paying down debt.",
        readTime: "3 min read",
        actionText: "Configure Budget Caps",
        actionType: "open_budget_modal"
      },
      {
        id: "tip-b2",
        title: "Zero-Based Budgeting Technique",
        category: "budgeting",
        categoryLabel: "Budget Tips",
        icon: "🎯",
        badgeColor: "var(--accent-primary)",
        summary: "Give every single dollar a job before the month starts.",
        content: "Zero-Based Budgeting means Income minus Expenses equals Zero. Every dollar is assigned to savings, debt payoff, bills, or investments before it arrives in your account, preventing mindless leaking of funds.",
        readTime: "4 min read",
        actionText: "Add Monthly Income",
        actionType: "open_txn_modal"
      },
      {
        id: "tip-s1",
        title: "Automate Your Savings on Payday",
        category: "saving",
        categoryLabel: "Saving Tips",
        icon: "🤖",
        badgeColor: "var(--accent-success)",
        summary: "Pay yourself first by scheduling automatic transfers the day you get paid.",
        content: "Don't save what is left after spending; spend what is left after saving. Set up recurring automated bank transfers from your checking account to your savings or investment account every payday.",
        readTime: "2 min read",
        actionText: "Track New Income",
        actionType: "open_txn_modal"
      },
      {
        id: "tip-s2",
        title: "Audit Recurring Subscriptions",
        category: "saving",
        categoryLabel: "Saving Tips",
        icon: "🔍",
        badgeColor: "var(--accent-success)",
        summary: "Cancel unused streaming services and recurring digital memberships.",
        content: "The average adult spends over $219/month on active subscriptions, and over 40% forget about at least one recurring membership. Perform a monthly audit of your bank statement and eliminate forgotten channels.",
        readTime: "3 min read",
        actionText: "Review Expense History",
        actionType: "navigate_expenses"
      },
      {
        id: "tip-i1",
        title: "The Power of Dollar-Cost Averaging (DCA)",
        category: "investing",
        categoryLabel: "Investment Basics",
        icon: "📈",
        badgeColor: "var(--accent-info)",
        summary: "Invest a fixed amount at regular intervals regardless of market highs or lows.",
        content: "Dollar-cost averaging removes emotional guesswork from investing. By consistently putting $100 or $500 into low-cost index funds every month, you automatically buy more shares when prices drop and fewer when prices rise.",
        readTime: "5 min read",
        actionText: "Explore Portfolio Tools",
        actionType: "info_toast"
      },
      {
        id: "tip-i2",
        title: "Low-Cost Index Funds vs Individual Stocks",
        category: "investing",
        categoryLabel: "Investment Basics",
        icon: "🏛️",
        badgeColor: "var(--accent-info)",
        summary: "Diversify instantly across hundreds of top companies with broad market index funds.",
        content: "Over 90% of active fund managers fail to beat the S&P 500 benchmark over a 15-year horizon. Low expense ratio index funds (like S&P 500 or Total Stock Market funds) provide automatic diversification with low fees.",
        readTime: "4 min read",
        actionText: "Read Guide",
        actionType: "info_toast"
      },
      {
        id: "tip-e1",
        title: "Build a 3-6 Month Emergency Runway",
        category: "emergency",
        categoryLabel: "Emergency Fund Advice",
        icon: "🛡️",
        badgeColor: "var(--accent-warning)",
        summary: "Keep essential living expenses liquid in a high-yield savings account.",
        content: "An emergency fund is your financial shield against job loss, medical expenses, or unexpected car repairs. Calculate your minimum monthly survival budget and build a liquid safety cushion in a High-Yield Savings Account (HYSA).",
        readTime: "4 min read",
        actionText: "Calculate Emergency Goal",
        actionType: "info_toast"
      },
      {
        id: "tip-e2",
        title: "High-Yield Savings Accounts (HYSA) Explained",
        category: "emergency",
        categoryLabel: "Emergency Fund Advice",
        icon: "🏦",
        badgeColor: "var(--accent-warning)",
        summary: "Earn 4-5% APY on your cash reserves instead of 0.01% at traditional banks.",
        content: "Traditional brick-and-mortar savings accounts pay a meager ~0.01% APY, allowing inflation to erode your cash. FDIC-insured HYSAs offer interest rates up to 500x higher while keeping funds 100% liquid.",
        readTime: "3 min read",
        actionText: "View Rates",
        actionType: "info_toast"
      }
    ]
  };

  // ─── Data Loader ─────────────────────────────
  async function loadData() {
    if (tipsData) return tipsData;
    try {
      const res = await fetch('data/tips.json');
      if (res.ok) {
        tipsData = await res.json();
      } else {
        tipsData = FALLBACK_DATA;
      }
    } catch {
      tipsData = FALLBACK_DATA;
    }
    return tipsData;
  }

  // ─── Render Category Pills Bar ───────────────
  function renderCategories(categories) {
    const container = document.getElementById('tips-category-pills');
    if (!container) return;

    container.innerHTML = categories.map(cat => `
      <button class="btn ${cat.id === activeCategory ? 'btn-primary' : 'btn-secondary'} category-pill-btn" 
              data-category="${cat.id}" 
              style="padding: 0.4rem 0.85rem; font-size: 0.82rem; border-radius: 20px;">
        ${cat.label}
      </button>
    `).join('');
  }

  // ─── Render Daily Tip Hero Card ──────────────
  function renderDailyTip(daily) {
    const container = document.getElementById('daily-tip-banner');
    if (!container || !daily) return;

    container.innerHTML = `
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12)); border: 1.5px solid var(--accent-primary); padding: 1.5rem;">
        <div style="display: flex; align-items: flex-start; gap: 1.25rem;">
          <div style="width: 52px; height: 52px; border-radius: 14px; background-color: var(--accent-primary-bg); color: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; flex-shrink: 0;">
            ${daily.icon || '💡'}
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="badge badge-income" style="background: var(--accent-primary); color: #fff; font-size: 0.75rem;">${daily.categoryLabel || 'Daily Tip'}</span>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${daily.readTime}</span>
            </div>
            <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.4rem;">${daily.title}</h2>
            <p style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.5; margin-bottom: 1rem;">${daily.content}</p>
            <button class="btn btn-primary tip-action-trigger" data-action="${daily.actionType}" style="padding: 0.4rem 0.9rem; font-size: 0.82rem;">
              ${daily.actionText} →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Render Tips Grid Cards ──────────────────
  function renderTipsGrid(tips) {
    const container = document.getElementById('tips-cards-grid');
    if (!container) return;

    if (!tips || tips.length === 0) {
      container.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
          🔍 No financial tips found matching "${searchQuery}". Try selecting another category or refining your search.
        </div>
      `;
      return;
    }

    container.innerHTML = tips.map(tip => `
      <div class="card tip-card" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background-color: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
              ${tip.icon}
            </div>
            <span class="badge" style="background: ${tip.badgeColor}; color: #fff; font-size: 0.72rem;">${tip.categoryLabel}</span>
          </div>

          <h3 style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; line-height: 1.35;">${tip.title}</h3>
          <p style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; margin-bottom: 0.75rem;">${tip.summary}</p>
          
          <details style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
            <summary style="cursor: pointer; color: var(--accent-primary); font-weight: 500; margin-bottom: 0.35rem;">Read Detailed Guidance</summary>
            <p style="padding-top: 0.5rem; border-top: 1px dashed var(--border-color); line-height: 1.5;">${tip.content}</p>
          </details>
        </div>

        <div style="margin-top: 1.25rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">${tip.readTime}</span>
          <button class="btn btn-secondary tip-action-trigger" data-action="${tip.actionType}" style="padding: 0.3rem 0.65rem; font-size: 0.78rem;">
            ${tip.actionText}
          </button>
        </div>
      </div>
    `).join('');
  }

  // ─── Filter & Search Executor ────────────────
  function filterAndRender() {
    if (!tipsData) return;

    let filtered = tipsData.tips;

    // Filter by Category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(t => t.category === activeCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q)
      );
    }

    renderCategories(tipsData.categories);
    renderTipsGrid(filtered);
  }

  // ─── Main Module Initializer ─────────────────
  async function loadTips() {
    const data = await loadData();
    renderDailyTip(data.daily_tip);
    filterAndRender();
  }

  // ─── Event Listener Bindings ─────────────────
  function bindEvents() {
    // Search input field
    const searchInput = document.getElementById('tips-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = e.target.value;
          filterAndRender();
        }, 250);
      });
    }

    // Delegated click for category pills
    document.addEventListener('click', (e) => {
      const pillBtn = e.target.closest('.category-pill-btn');
      if (pillBtn) {
        activeCategory = pillBtn.dataset.category;
        filterAndRender();
      }

      // Delegated click for action buttons on tip cards
      const actionBtn = e.target.closest('.tip-action-trigger');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        handleTipAction(action);
      }
    });
  }

  // Action button router
  function handleTipAction(action) {
    if (action === 'navigate_budgets') {
      if (window.Router) window.Router.navigateTo('budgets');
    } else if (action === 'navigate_expenses') {
      if (window.Router) window.Router.navigateTo('expenses');
    } else if (action === 'open_budget_modal') {
      if (window.UI) window.UI.openModal('budget-modal');
    } else if (action === 'open_txn_modal') {
      if (window.UI) window.UI.openModal('transaction-modal');
    } else {
      if (window.UI) window.UI.showToast('Action logged. Feature integrated in complete suite.', 'info');
    }
  }

  return {
    loadTips,
    bindEvents
  };
})();
