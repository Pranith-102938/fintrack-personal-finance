// Financial Reports Module — Handles Date Range Filtering, Cash Flow Timeline, Category Breakdown, CSV Download, and PDF Printing
window.Reports = (function () {
  let currentTransactions = [];
  let isInitialized = false;

  function formatCurrency(amount) {
    const symbol = window.UI ? window.UI.getCurrencySymbol() : '$';
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function formatDateStr(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Calculate preset start and end dates
  function getPresetDates(preset) {
    const now = new Date();
    let start, end;

    if (preset === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'last-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === 'last-3-months') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'year-to-date') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      // Custom range: read input fields
      const startVal = document.getElementById('report-start-date')?.value;
      const endVal = document.getElementById('report-end-date')?.value;
      start = startVal ? new Date(startVal) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = endVal ? new Date(endVal) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
      startDateStr: formatDateStr(start),
      endDateStr: formatDateStr(end)
    };
  }

  // Primary loader for Report view
  async function loadReports() {
    initEvents();

    const rangeSelect = document.getElementById('report-range-select');
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');

    const preset = rangeSelect ? rangeSelect.value : 'this-month';

    let startDateStr = startDateInput?.value;
    let endDateStr = endDateInput?.value;

    // If preset is selected (not custom) or inputs are empty, calculate preset dates
    if (preset !== 'custom' || !startDateStr || !endDateStr) {
      const dates = getPresetDates(preset);
      startDateStr = dates.startDateStr;
      endDateStr = dates.endDateStr;

      if (startDateInput) startDateInput.value = startDateStr;
      if (endDateInput) endDateInput.value = endDateStr;
    }

    // Validate date range
    if (new Date(startDateStr) > new Date(endDateStr)) {
      if (window.UI) window.UI.showToast('Start date cannot be after end date.', 'warning');
      return;
    }

    try {
      if (window.UI) window.UI.showLoader();

      // Fetch transactions for the target date range
      const result = await window.API.get(`/transactions?limit=1000&startDate=${startDateStr}&endDate=${endDateStr}&sortBy=date&sortOrder=asc`);
      currentTransactions = result.data || [];

      // Calculate summary metrics
      let totalIncome = 0;
      let totalExpense = 0;
      const categoryMap = {};
      const dailyMap = {};

      currentTransactions.forEach(t => {
        const amt = parseFloat(t.amount || 0);
        const dateKey = new Date(t.date).toISOString().split('T')[0];

        if (t.type === 'income') {
          totalIncome += amt;
          if (!dailyMap[dateKey]) dailyMap[dateKey] = { income: 0, expense: 0 };
          dailyMap[dateKey].income += amt;
        } else if (t.type === 'expense') {
          totalExpense += amt;
          if (!dailyMap[dateKey]) dailyMap[dateKey] = { income: 0, expense: 0 };
          dailyMap[dateKey].expense += amt;

          const cat = t.category || 'Other';
          categoryMap[cat] = (categoryMap[cat] || 0) + amt;
        }
      });

      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? parseFloat(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

      // Update Summary Cards
      const incomeEl = document.getElementById('report-total-income');
      const expenseEl = document.getElementById('report-total-expense');
      const savingsEl = document.getElementById('report-net-savings');
      const rateEl = document.getElementById('report-savings-rate');
      const labelEl = document.getElementById('report-active-range-label');

      if (incomeEl) incomeEl.textContent = formatCurrency(totalIncome);
      if (expenseEl) expenseEl.textContent = formatCurrency(totalExpense);
      if (savingsEl) {
        const symbol = window.UI ? window.UI.getCurrencySymbol() : '$';
        const sign = netSavings >= 0 ? symbol : `-${symbol}`;
        const numStr = parseFloat(Math.abs(netSavings)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        savingsEl.textContent = `${sign}${numStr}`;
        savingsEl.style.color = netSavings >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
      }
      if (rateEl) rateEl.textContent = `${savingsRate}%`;
      if (labelEl) labelEl.textContent = `${startDateStr} to ${endDateStr} (${currentTransactions.length} entries)`;

      // Process Cash Flow Timeline Chart Data
      const sortedDateKeys = Object.keys(dailyMap).sort();
      const dailyLabels = sortedDateKeys.map(k => {
        const d = new Date(k + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const dailyIncomeData = sortedDateKeys.map(k => dailyMap[k].income);
      const dailyExpenseData = sortedDateKeys.map(k => dailyMap[k].expense);

      if (window.ChartEngine) {
        window.ChartEngine.renderLineChart(
          'report-cash-flow-chart',
          dailyLabels.length > 0 ? dailyLabels : ['No Data'],
          dailyIncomeData.length > 0 ? dailyIncomeData : [0],
          dailyExpenseData.length > 0 ? dailyExpenseData : [0]
        );
      }

      // Process Category Distribution Pie Chart Data
      const totalCatSpend = Object.values(categoryMap).reduce((a, b) => a + b, 0);
      const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
        category: cat,
        amount: categoryMap[cat],
        percentage: totalCatSpend > 0 ? parseFloat(((categoryMap[cat] / totalCatSpend) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.amount - a.amount);

      if (window.ChartEngine) {
        window.ChartEngine.renderPieChart(
          'report-category-chart',
          categoryBreakdown
        );
      }

      if (window.UI) window.UI.hideLoader();
    } catch (error) {
      if (window.UI) {
        window.UI.hideLoader();
        window.UI.showToast(error.message || 'Failed to load report analytics.', 'danger');
      }
      console.error('Load Reports Error:', error);
    }
  }

  // Export currently loaded report data to CSV
  function exportCSV() {
    if (!currentTransactions || currentTransactions.length === 0) {
      if (window.UI) window.UI.showToast('No transaction data available to export in selected date range.', 'warning');
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Method', 'Description'];
    const escapeCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = currentTransactions.map(t => [
      escapeCell(new Date(t.date).toISOString().split('T')[0]),
      escapeCell(t.type),
      escapeCell(t.category),
      escapeCell(parseFloat(t.amount || 0).toFixed(2)),
      escapeCell(t.paymentMethod || 'card'),
      escapeCell(t.description || '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const todayStr = formatDateStr(new Date());
    const filename = `fintrack-transactions-${todayStr}.csv`;

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (window.UI) window.UI.showToast(`Exported ${currentTransactions.length} transactions to ${filename}`, 'success');
  }

  // Print/PDF export using browser-native window.print()
  function exportPDF() {
    if (window.UI) window.UI.showToast('Preparing printable financial report...', 'info');
    setTimeout(() => {
      window.print();
    }, 350);
  }

  // Initialize event bindings once
  function initEvents() {
    if (isInitialized) return;
    isInitialized = true;

    const rangeSelect = document.getElementById('report-range-select');
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');

    if (rangeSelect) {
      rangeSelect.addEventListener('change', () => {
        if (rangeSelect.value !== 'custom') {
          const dates = getPresetDates(rangeSelect.value);
          if (startDateInput) startDateInput.value = dates.startDateStr;
          if (endDateInput) endDateInput.value = dates.endDateStr;
        }
        loadReports();
      });
    }

    if (startDateInput) {
      startDateInput.addEventListener('change', () => {
        if (rangeSelect) rangeSelect.value = 'custom';
      });
    }

    if (endDateInput) {
      endDateInput.addEventListener('change', () => {
        if (rangeSelect) rangeSelect.value = 'custom';
      });
    }
  }

  return {
    loadReports,
    exportCSV,
    exportPDF
  };
})();
