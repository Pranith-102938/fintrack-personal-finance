const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');

// Helper: Escape special characters for safe regular expression search
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/v1/transactions
// Fetch paginated transactions with search, filter, sort
const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

    // Build query filter — always scoped to authenticated user
    const filter = { userId: req.user._id };

    if (type && type !== 'all' && typeof type === 'string') {
      filter.type = type;
    }

    if (category && category !== 'all' && typeof category === 'string') {
      filter.category = category;
    }

    // Date range filter — preserves consistent YYYY-MM-DD calendar dates and start/end-of-day boundaries
    if (startDate || endDate) {
      filter.date = {};

      if (startDate && typeof startDate === 'string' && startDate.trim()) {
        const startStr = startDate.trim();
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(startStr);
        const start = isDateOnly ? new Date(`${startStr}T00:00:00.000Z`) : new Date(startStr);
        if (!isNaN(start.getTime())) {
          filter.date.$gte = start;
        }
      }

      if (endDate && typeof endDate === 'string' && endDate.trim()) {
        const endStr = endDate.trim();
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(endStr);
        const end = isDateOnly ? new Date(`${endStr}T23:59:59.999Z`) : new Date(endStr);
        if (!isNaN(end.getTime())) {
          filter.date.$lte = end;
        }
      }
    }

    // Text search on description and category (safely escaped)
    if (search && typeof search === 'string' && search.trim()) {
      const sanitizedSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(sanitizedSearch, 'i');
      filter.$or = [
        { description: searchRegex },
        { category: searchRegex }
      ];
    }

    // Build sort object
    const sortOptions = {};
    const validSortFields = ['date', 'amount', 'category', 'type', 'createdAt'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'date';
    sortOptions[field] = sortOrder === 'asc' ? 1 : -1;

    // Execute paginated query and count in parallel
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sortOptions)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      status: 'success',
      data: transactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('GetTransactions Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve transactions.'
    });
  }
};

// GET /api/v1/transactions/:id
const getTransactionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid transaction ID format.' });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: transaction
    });
  } catch (error) {
    console.error('GetTransactionById Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve transaction.'
    });
  }
};

// POST /api/v1/transactions
const createTransaction = async (req, res) => {
  try {
    const { type, amount, category, date, description, paymentMethod } = req.body;

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount: parseFloat(amount),
      category,
      date: date || Date.now(),
      description: description || '',
      paymentMethod: paymentMethod || 'card'
    });

    res.status(201).json({
      status: 'success',
      message: 'Transaction created successfully.',
      data: transaction
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: messages[0]
      });
    }

    console.error('CreateTransaction Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create transaction.'
    });
  }
};

// PUT /api/v1/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid transaction ID format.' });
    }

    const { type, amount, category, date, description, paymentMethod } = req.body;

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found.'
      });
    }

    // Update only provided fields
    if (type !== undefined) transaction.type = type;
    if (amount !== undefined) transaction.amount = parseFloat(amount);
    if (category !== undefined) transaction.category = category;
    if (date !== undefined) transaction.date = date;
    if (description !== undefined) transaction.description = description;
    if (paymentMethod !== undefined) transaction.paymentMethod = paymentMethod;

    await transaction.save();

    res.status(200).json({
      status: 'success',
      message: 'Transaction updated successfully.',
      data: transaction
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: messages[0]
      });
    }

    console.error('UpdateTransaction Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update transaction.'
    });
  }
};

// DELETE /api/v1/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid transaction ID format.' });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully.',
      data: { _id: transaction._id }
    });
  } catch (error) {
    console.error('DeleteTransaction Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete transaction.'
    });
  }
};

// GET /api/v1/transactions/summary/totals
// Returns income, expense, savings totals for the current month
const getTransactionSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const summary = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    summary.forEach(item => {
      if (item._id === 'income') {
        totalIncome = item.total;
        incomeCount = item.count;
      } else if (item._id === 'expense') {
        totalExpense = item.total;
        expenseCount = item.count;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

    res.status(200).json({
      status: 'success',
      data: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate: parseFloat(savingsRate),
        incomeCount,
        expenseCount,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      }
    });
  } catch (error) {
    console.error('GetTransactionSummary Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve transaction summary.'
    });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary
};
