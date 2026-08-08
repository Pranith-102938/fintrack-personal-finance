// Professional Chart.js Engine — Manages Line, Pie, and Bar charts dynamically
window.ChartEngine = (function () {
  // Store active Chart.js instances to allow clean destroying before re-renders
  const chartInstances = {};

  // Palette colors for charts
  const COLORS = {
    income: '#10b981',
    incomeBg: 'rgba(16, 185, 129, 0.15)',
    expense: '#ef4444',
    expenseBg: 'rgba(239, 68, 68, 0.15)',
    categories: [
      '#6366f1', // Indigo (Groceries)
      '#10b981', // Emerald (Salary)
      '#0ea5e9', // Sky (Utilities)
      '#f59e0b', // Amber (Entertainment)
      '#ef4444', // Red (Dining Out)
      '#8b5cf6', // Purple (Shopping)
      '#ec4899', // Pink (Investment)
      '#14b8a6'  // Teal (Other)
    ]
  };

  // Helper to safely destroy existing chart instance on a canvas
  function destroyChart(canvasId) {
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    }
  }

  // Common styling options for Chart.js theme awareness
  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#94a3b8' : '#64748b',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
    };
  }

  // ─── 1. LINE CHART: Daily Spending Trend (30 Days) ────────────────
  function renderLineChart(canvasId, labels, incomeData, expenseData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    destroyChart(canvasId);

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library not loaded.');
      return;
    }

    const theme = getThemeColors();
    const symbol = window.UI ? window.UI.getCurrencySymbol() : '$';
    const ctx = canvas.getContext('2d');

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels || [],
        datasets: [
          {
            label: `Daily Expenses (${symbol})`,
            data: expenseData || [],
            borderColor: COLORS.expense,
            backgroundColor: COLORS.expenseBg,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: `Daily Income (${symbol})`,
            data: incomeData || [],
            borderColor: COLORS.income,
            backgroundColor: COLORS.incomeBg,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: theme.textColor,
              font: { family: 'Inter, sans-serif', size: 12, weight: 500 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label ? ctx.dataset.label.split(' (')[0] : '';
                const val = parseFloat(ctx.raw || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `${label}: ${symbol}${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: theme.gridColor },
            ticks: { color: theme.textColor, font: { size: 11 }, maxTicksLimit: 10 }
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              font: { size: 11 },
              callback: (val) => `${symbol}${val}`
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  // ─── 2. PIE / DOUGHNUT CHART: Category Breakdown ─────────────────
  function renderPieChart(canvasId, categoryData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    destroyChart(canvasId);

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library not loaded.');
      return;
    }

    const theme = getThemeColors();
    const symbol = window.UI ? window.UI.getCurrencySymbol() : '$';
    const ctx = canvas.getContext('2d');

    // Default or empty fallback
    const items = (categoryData && categoryData.length > 0)
      ? categoryData
      : [{ category: 'No Expenses', amount: 1, percentage: 100 }];

    const labels = items.map(c => c.category);
    const dataValues = items.map(c => c.amount);
    const backgroundColors = items.map((c, i) => COLORS.categories[i % COLORS.categories.length]);

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: theme.gridColor,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: theme.textColor,
              font: { family: 'Inter, sans-serif', size: 11, weight: 500 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const val = ctx.raw;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                const formattedVal = val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `${ctx.label}: ${symbol}${formattedVal} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ─── 3. BAR CHART: Monthly Income vs Expenses (Last 6 Months) ─────
  function renderBarChart(canvasId, labels, incomeData, expenseData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    destroyChart(canvasId);

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library not loaded.');
      return;
    }

    const theme = getThemeColors();
    const symbol = window.UI ? window.UI.getCurrencySymbol() : '$';
    const ctx = canvas.getContext('2d');

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels || [],
        datasets: [
          {
            label: `Income (${symbol})`,
            data: incomeData || [],
            backgroundColor: COLORS.income,
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.6
          },
          {
            label: `Expenses (${symbol})`,
            data: expenseData || [],
            backgroundColor: COLORS.expense,
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: theme.textColor,
              font: { family: 'Inter, sans-serif', size: 12, weight: 500 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label ? ctx.dataset.label.split(' (')[0] : '';
                const val = parseFloat(ctx.raw || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `${label}: ${symbol}${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textColor, font: { size: 11 } }
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              font: { size: 11 },
              callback: (val) => `${symbol}${val}`
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  // Re-render charts when theme changes (light/dark mode toggle)
  function refreshTheme() {
    Object.keys(chartInstances).forEach(canvasId => {
      const chart = chartInstances[canvasId];
      if (chart) {
        const theme = getThemeColors();
        if (chart.options.scales?.x) chart.options.scales.x.ticks.color = theme.textColor;
        if (chart.options.scales?.y) chart.options.scales.y.ticks.color = theme.textColor;
        if (chart.options.plugins?.legend) chart.options.plugins.legend.labels.color = theme.textColor;
        chart.update();
      }
    });
  }

  return {
    renderLineChart,
    renderPieChart,
    renderBarChart,
    destroyChart,
    refreshTheme
  };
})();
