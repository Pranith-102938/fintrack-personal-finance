// Professional Dashboard Module — orchestrates metrics, Chart.js charts, and live updates
window.Dashboard = (function () {

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

  function formatTrend(trend, suffix = 'vs last month') {
    if (trend > 0) {
      return `<span style="color: var(--accent-danger);">↑ ${trend}%</span> ${suffix}`;
    } else if (trend < 0) {
      return `<span style="color: var(--accent-success);">↓ ${Math.abs(trend)}%</span> ${suffix}`;
    }
    return `<span style="color: var(--text-muted);">0%</span> ${suffix}`;
  }

  function formatIncomeTrend(trend) {
    if (trend > 0) {
      return `<span style="color: var(--accent-success);">↑ ${trend}%</span> vs last month`;
    } else if (trend < 0) {
      return `<span style="color: var(--accent-danger);">↓ ${Math.abs(trend)}%</span> vs last month`;
    }
    return `<span style="color: var(--text-muted);">0%</span> vs last month`;
  }

  // Main loader for all dashboard data
  async function loadDashboard() {
    try {
      const result = await window.API.get('/dashboard/stats');
      if (!result || !result.data) return;

      const { metrics, charts } = result.data;

      // ─── 1. Populate Metric Cards ─────────────────
      // Card 1: Monthly Income
      const incomeEl = document.getElementById('metric-income');
      const incomeTrendEl = document.getElementById('metric-income-trend');
      if (incomeEl) incomeEl.textContent = formatCurrency(metrics.monthlyIncome);
      if (incomeTrendEl) incomeTrendEl.innerHTML = formatIncomeTrend(metrics.incomeTrend);

      // Card 2: Monthly Expenses
      const expenseEl = document.getElementById('metric-expense');
      const expenseTrendEl = document.getElementById('metric-expense-trend');
      if (expenseEl) expenseEl.textContent = formatCurrency(metrics.monthlyExpense);
      if (expenseTrendEl) expenseTrendEl.innerHTML = formatTrend(metrics.expenseTrend);

      // Card 3: Weekly Expenses
      const weeklyEl = document.getElementById('metric-weekly');
      const weeklyCountEl = document.getElementById('metric-weekly-count');
      if (weeklyEl) weeklyEl.textContent = formatCurrency(metrics.weeklyExpense);
      if (weeklyCountEl) weeklyCountEl.textContent = `${metrics.weeklyExpenseCount || 0} transaction(s) this week`;

      // Card 4: Today's Expenses
      const todayEl = document.getElementById('metric-today');
      const todayCountEl = document.getElementById('metric-today-count');
      if (todayEl) todayEl.textContent = formatCurrency(metrics.todayExpense);
      if (todayCountEl) todayCountEl.textContent = `${metrics.todayExpenseCount || 0} transaction(s) today`;

      // Card 5: Net Savings
      const savingsEl = document.getElementById('metric-savings');
      if (savingsEl) {
        const symbol = getSymbol();
        const sign = metrics.netSavings >= 0 ? symbol : `-${symbol}`;
        const formattedNum = parseFloat(Math.abs(metrics.netSavings)).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        savingsEl.textContent = `${sign}${formattedNum}`;
        savingsEl.style.color = metrics.netSavings >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
      }

      // Card 6: Savings Rate
      const rateEl = document.getElementById('metric-savings-rate');
      const rateLabelEl = document.getElementById('metric-rate-label');
      if (rateEl) rateEl.textContent = `${metrics.savingsRate}%`;
      if (rateLabelEl) {
        if (metrics.savingsRate >= 20) {
          rateLabelEl.innerHTML = `<span style="color: var(--accent-success);">Optimal</span> (Target ≥ 20%)`;
        } else {
          rateLabelEl.innerHTML = `<span style="color: var(--accent-warning);">Below Target</span> (Target ≥ 20%)`;
        }
      }

      // Card 7: Average Daily Spending
      const avgEl = document.getElementById('metric-avg-daily');
      if (avgEl) avgEl.textContent = formatCurrency(metrics.avgDailySpending);

      // Card 8: Highest Expense
      const highestEl = document.getElementById('metric-highest');
      const highestLabelEl = document.getElementById('metric-highest-label');
      if (highestEl) {
        if (metrics.highestExpense) {
          highestEl.textContent = formatCurrency(metrics.highestExpense.amount);
          if (highestLabelEl) {
            highestLabelEl.textContent = `${metrics.highestExpense.category} — ${metrics.highestExpense.description || 'No notes'}`;
          }
        } else {
          highestEl.textContent = formatCurrency(0);
          if (highestLabelEl) highestLabelEl.textContent = 'No expenses this month';
        }
      }

      // ─── 2. Render Chart.js Charts ────────────────
      if (window.ChartEngine) {
        // Line Chart: Daily Spending Trend
        window.ChartEngine.renderLineChart(
          'daily-trend-chart',
          charts.dailyTrend.labels,
          charts.dailyTrend.income,
          charts.dailyTrend.expense
        );

        // Pie/Doughnut Chart: Category Breakdown
        window.ChartEngine.renderPieChart(
          'category-pie-chart',
          charts.categoryBreakdown
        );

        // Bar Chart: Monthly Trend (Last 6 Months)
        window.ChartEngine.renderBarChart(
          'monthly-bar-chart',
          charts.monthlyTrend.labels,
          charts.monthlyTrend.income,
          charts.monthlyTrend.expense
        );
      }

      // ─── 3. Load Recent Transactions Table & Budget Health Widget ─
      if (window.Expenses) window.Expenses.loadRecentTransactions();
      if (window.Budgets) window.Budgets.loadDashboardBudgetHealth();

    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  }

  return {
    loadDashboard
  };
})();
