const Budget = require('../models/Budget.model');
const Transaction = require('../models/Transaction.model');

// ─── Helper: Calculate spending per category for a given month ───
async function getSpendingByCategory(userId, month, year) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const spending = await Transaction.aggregate([
    {
      $match: {
        userId: userId,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Convert array to map: { "Groceries": 320, "Utilities": 145, ... }
  const map = {};
  spending.forEach(item => {
    map[item._id] = { totalSpent: item.totalSpent, count: item.count };
  });
  return map;
}

// ─── Helper: Enrich budget with spending data and status ───
function enrichBudget(budget, spendingMap) {
  const spent = spendingMap[budget.category]?.totalSpent || 0;
  const txnCount = spendingMap[budget.category]?.count || 0;
  const remaining = Math.max(0, budget.limit - spent);
  const percentage = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;

  let status = 'normal';
  if (percentage >= 100) {
    status = 'exceeded';
  } else if (percentage >= budget.alertThreshold) {
    status = 'warning';
  }

  return {
    _id: budget._id,
    category: budget.category,
    limit: budget.limit,
    month: budget.month,
    year: budget.year,
    alertThreshold: budget.alertThreshold,
    notes: budget.notes,
    spent,
    remaining,
    percentage,
    status,
    txnCount,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt
  };
}

// GET /api/v1/budgets?month=8&year=2026
// Fetch all budgets for a month, enriched with real spending data
const getBudgets = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const budgets = await Budget.find({
      userId: req.user._id,
      month,
      year
    }).sort({ category: 1 }).lean();

    const spendingMap = await getSpendingByCategory(req.user._id, month, year);

    const enriched = budgets.map(b => enrichBudget(b, spendingMap));

    // Compute totals
    const totalLimit = enriched.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = enriched.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = Math.max(0, totalLimit - totalSpent);
    const exceededCount = enriched.filter(b => b.status === 'exceeded').length;
    const warningCount = enriched.filter(b => b.status === 'warning').length;

    res.status(200).json({
      status: 'success',
      data: enriched,
      summary: {
        totalLimit,
        totalSpent,
        totalRemaining,
        budgetCount: enriched.length,
        exceededCount,
        warningCount,
        month,
        year
      }
    });
  } catch (error) {
    console.error('GetBudgets Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve budgets.' });
  }
};

// GET /api/v1/budgets/:id
const getBudgetById = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid budget ID format.' });
    }

    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).lean();

    if (!budget) {
      return res.status(404).json({ status: 'error', message: 'Budget not found.' });
    }

    const spendingMap = await getSpendingByCategory(req.user._id, budget.month, budget.year);
    const enriched = enrichBudget(budget, spendingMap);

    res.status(200).json({ status: 'success', data: enriched });
  } catch (error) {
    console.error('GetBudgetById Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve budget.' });
  }
};

// POST /api/v1/budgets
const createBudget = async (req, res) => {
  try {
    const now = new Date();
    const { category, limit, month, year, alertThreshold, notes } = req.body;

    const budgetMonth = parseInt(month) || (now.getMonth() + 1);
    const budgetYear = parseInt(year) || now.getFullYear();

    // Check for duplicate
    const existing = await Budget.findOne({
      userId: req.user._id,
      category,
      month: budgetMonth,
      year: budgetYear
    });

    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: `A budget for "${category}" already exists for ${budgetMonth}/${budgetYear}. Edit the existing one instead.`
      });
    }

    const budget = await Budget.create({
      userId: req.user._id,
      category,
      limit: parseFloat(limit),
      month: budgetMonth,
      year: budgetYear,
      alertThreshold: alertThreshold || 80,
      notes: notes || ''
    });

    // Return enriched budget with spending data
    const spendingMap = await getSpendingByCategory(req.user._id, budgetMonth, budgetYear);
    const enriched = enrichBudget(budget.toObject(), spendingMap);

    res.status(201).json({
      status: 'success',
      message: `Budget of $${limit} set for ${category}.`,
      data: enriched
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'A budget for this category already exists for this month.'
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ status: 'error', message: messages[0] });
    }
    console.error('CreateBudget Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to create budget.' });
  }
};

// PUT /api/v1/budgets/:id
const updateBudget = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid budget ID format.' });
    }

    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ status: 'error', message: 'Budget not found.' });
    }

    const { category, limit, alertThreshold, notes } = req.body;

    // If category changes, check for duplicates in the same month
    if (category && category !== budget.category) {
      const duplicate = await Budget.findOne({
        userId: req.user._id,
        category,
        month: budget.month,
        year: budget.year,
        _id: { $ne: budget._id }
      });
      if (duplicate) {
        return res.status(400).json({
          status: 'error',
          message: `A budget for "${category}" already exists for ${budget.month}/${budget.year}.`
        });
      }
      budget.category = category;
    }

    if (limit !== undefined) budget.limit = parseFloat(limit);
    if (alertThreshold !== undefined) budget.alertThreshold = parseInt(alertThreshold);
    if (notes !== undefined) budget.notes = notes;

    await budget.save();

    const spendingMap = await getSpendingByCategory(req.user._id, budget.month, budget.year);
    const enriched = enrichBudget(budget.toObject(), spendingMap);

    res.status(200).json({
      status: 'success',
      message: 'Budget updated successfully.',
      data: enriched
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ status: 'error', message: messages[0] });
    }
    console.error('UpdateBudget Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to update budget.' });
  }
};

// DELETE /api/v1/budgets/:id
const deleteBudget = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid budget ID format.' });
    }

    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!budget) {
      return res.status(404).json({ status: 'error', message: 'Budget not found.' });
    }

    res.status(200).json({
      status: 'success',
      message: `Budget for "${budget.category}" deleted.`,
      data: { _id: budget._id }
    });
  } catch (error) {
    console.error('DeleteBudget Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete budget.' });
  }
};

// GET /api/v1/budgets/history/all?months=6
// Returns budget + spending data for the last N months for history/trends
const getBudgetHistory = async (req, res) => {
  try {
    const months = Math.min(12, Math.max(1, parseInt(req.query.months) || 6));
    const now = new Date();
    const history = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const budgets = await Budget.find({
        userId: req.user._id,
        month: m,
        year: y
      }).lean();

      const spendingMap = await getSpendingByCategory(req.user._id, m, y);
      const enriched = budgets.map(b => enrichBudget(b, spendingMap));

      const totalLimit = enriched.reduce((s, b) => s + b.limit, 0);
      const totalSpent = enriched.reduce((s, b) => s + b.spent, 0);

      history.push({
        month: m,
        year: y,
        label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        budgets: enriched,
        totalLimit,
        totalSpent,
        exceededCount: enriched.filter(b => b.status === 'exceeded').length
      });
    }

    res.status(200).json({ status: 'success', data: history });
  } catch (error) {
    console.error('GetBudgetHistory Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve budget history.' });
  }
};

// GET /api/v1/budgets/alerts/check
// Returns budgets that are at warning or exceeded status for the current month
const checkBudgetAlerts = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const budgets = await Budget.find({
      userId: req.user._id,
      month,
      year
    }).lean();

    const spendingMap = await getSpendingByCategory(req.user._id, month, year);
    const enriched = budgets.map(b => enrichBudget(b, spendingMap));

    const alerts = enriched
      .filter(b => b.status === 'warning' || b.status === 'exceeded')
      .map(b => ({
        _id: b._id,
        category: b.category,
        limit: b.limit,
        spent: b.spent,
        percentage: b.percentage,
        status: b.status,
        message: b.status === 'exceeded'
          ? `⚠️ "${b.category}" budget exceeded by $${(b.spent - b.limit).toFixed(2)}!`
          : `⚡ "${b.category}" is at ${b.percentage}% of the $${b.limit} limit.`
      }));

    res.status(200).json({
      status: 'success',
      data: alerts,
      hasAlerts: alerts.length > 0
    });
  } catch (error) {
    console.error('CheckBudgetAlerts Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to check budget alerts.' });
  }
};

module.exports = {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetHistory,
  checkBudgetAlerts
};
