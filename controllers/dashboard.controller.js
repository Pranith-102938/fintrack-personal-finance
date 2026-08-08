const Transaction = require('../models/Transaction.model');

// GET /api/v1/dashboard/stats
// Comprehensive dashboard data — all metrics, charts data, and insights in one call
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user._id;

    // ─── Date boundaries ─────────────────────────
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday of this week

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // ─── Run all aggregations in parallel ────────
    const [
      totalAllTime,
      monthlyAgg,
      weeklyAgg,
      todayAgg,
      prevMonthAgg,
      categoryBreakdown,
      highestExpense,
      dailyTrend,
      monthlyTrend
    ] = await Promise.all([
      // 1. Total all-time expenses
      Transaction.aggregate([
        { $match: { userId, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),

      // 2. This month income + expense
      Transaction.aggregate([
        { $match: { userId, date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),

      // 3. This week expenses
      Transaction.aggregate([
        { $match: { userId, type: 'expense', date: { $gte: weekStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),

      // 4. Today's expenses
      Transaction.aggregate([
        { $match: { userId, type: 'expense', date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),

      // 5. Previous month income + expense (for comparison)
      Transaction.aggregate([
        { $match: { userId, date: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),

      // 6. Category breakdown for current month (expenses only)
      Transaction.aggregate([
        { $match: { userId, type: 'expense', date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),

      // 7. Highest single expense this month
      Transaction.findOne({
        userId,
        type: 'expense',
        date: { $gte: monthStart, $lte: monthEnd }
      }).sort({ amount: -1 }).lean(),

      // 8. Daily spending trend (last 30 days for line chart)
      Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              type: '$type'
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),

      // 9. Monthly trend (last 6 months for bar chart)
      Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$date' },
              year: { $year: '$date' },
              type: '$type'
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // ─── Process monthly aggregation ─────────────
    let monthIncome = 0, monthExpense = 0, monthIncomeCount = 0, monthExpenseCount = 0;
    monthlyAgg.forEach(item => {
      if (item._id === 'income') { monthIncome = item.total; monthIncomeCount = item.count; }
      if (item._id === 'expense') { monthExpense = item.total; monthExpenseCount = item.count; }
    });

    let prevIncome = 0, prevExpense = 0;
    prevMonthAgg.forEach(item => {
      if (item._id === 'income') prevIncome = item.total;
      if (item._id === 'expense') prevExpense = item.total;
    });

    const netSavings = monthIncome - monthExpense;
    const savingsRate = monthIncome > 0 ? parseFloat(((netSavings / monthIncome) * 100).toFixed(1)) : 0;
    const avgDailySpending = monthExpense > 0 ? parseFloat((monthExpense / now.getDate()).toFixed(2)) : 0;

    // Trend percentages vs last month
    const incomeTrend = prevIncome > 0 ? parseFloat((((monthIncome - prevIncome) / prevIncome) * 100).toFixed(1)) : 0;
    const expenseTrend = prevExpense > 0 ? parseFloat((((monthExpense - prevExpense) / prevExpense) * 100).toFixed(1)) : 0;

    // ─── Process category breakdown (pie chart) ──
    const totalCatSpend = categoryBreakdown.reduce((s, c) => s + c.total, 0);
    const categories = categoryBreakdown.map(c => ({
      category: c._id,
      amount: c.total,
      count: c.count,
      percentage: totalCatSpend > 0 ? parseFloat(((c.total / totalCatSpend) * 100).toFixed(1)) : 0
    }));

    // ─── Process daily trend (line chart) ────────
    const dailyMap = {};
    dailyTrend.forEach(item => {
      if (!dailyMap[item._id.date]) dailyMap[item._id.date] = { income: 0, expense: 0 };
      dailyMap[item._id.date][item._id.type] = item.total;
    });

    // Fill in missing days with zeros using local calendar YYYY-MM-DD keys
    const dailyLabels = [];
    const dailyIncomeData = [];
    const dailyExpenseData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const key = `${yr}-${mo}-${dy}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyLabels.push(label);
      dailyIncomeData.push(dailyMap[key]?.income || 0);
      dailyExpenseData.push(dailyMap[key]?.expense || 0);
    }

    // ─── Process monthly trend (bar chart) ───────
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};
    monthlyTrend.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expense: 0, label: '' };
      monthlyMap[key][item._id.type] = item.total;
      monthlyMap[key].label = `${monthNames[item._id.month - 1]} ${item._id.year}`;
    });

    // Ensure all 6 months present
    const barLabels = [];
    const barIncomeData = [];
    const barExpenseData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      barLabels.push(label);
      barIncomeData.push(monthlyMap[key]?.income || 0);
      barExpenseData.push(monthlyMap[key]?.expense || 0);
    }

    // ─── Build response ──────────────────────────
    res.status(200).json({
      status: 'success',
      data: {
        metrics: {
          totalExpensesAllTime: totalAllTime[0]?.total || 0,
          totalExpensesAllTimeCount: totalAllTime[0]?.count || 0,
          monthlyIncome: monthIncome,
          monthlyExpense: monthExpense,
          weeklyExpense: weeklyAgg[0]?.total || 0,
          weeklyExpenseCount: weeklyAgg[0]?.count || 0,
          todayExpense: todayAgg[0]?.total || 0,
          todayExpenseCount: todayAgg[0]?.count || 0,
          netSavings,
          savingsRate,
          avgDailySpending,
          highestExpense: highestExpense ? {
            amount: highestExpense.amount,
            category: highestExpense.category,
            description: highestExpense.description,
            date: highestExpense.date
          } : null,
          incomeTrend,
          expenseTrend,
          month: now.getMonth() + 1,
          year: now.getFullYear()
        },
        charts: {
          categoryBreakdown: categories,
          dailyTrend: {
            labels: dailyLabels,
            income: dailyIncomeData,
            expense: dailyExpenseData
          },
          monthlyTrend: {
            labels: barLabels,
            income: barIncomeData,
            expense: barExpenseData
          }
        }
      }
    });
  } catch (error) {
    console.error('GetDashboardStats Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve dashboard statistics.'
    });
  }
};

module.exports = { getDashboardStats };
