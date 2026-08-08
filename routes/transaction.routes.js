const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary
} = require('../controllers/transaction.controller');

// All routes require authentication
router.use(protect);

// Validation rules for creating/updating a transaction
const validateTransaction = [
  body('type')
    .notEmpty().withMessage('Transaction type is required')
    .isIn(['income', 'expense']).withMessage('Type must be "income" or "expense"'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .trim()
    .isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters'),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid date format'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 250 }).withMessage('Description cannot exceed 250 characters'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'upi', 'other']).withMessage('Invalid payment method'),

  handleValidationErrors
];

// Validation for update — all fields optional
const validateTransactionUpdate = [
  body('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('Type must be "income" or "expense"'),

  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters'),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid date format'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 250 }).withMessage('Description cannot exceed 250 characters'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'upi', 'other']).withMessage('Invalid payment method'),

  handleValidationErrors
];

// Summary endpoint (must be defined BEFORE /:id to avoid route collision)
router.get('/summary/totals', getTransactionSummary);

// CRUD routes
router.get('/', getTransactions);
router.post('/', validateTransaction, createTransaction);
router.get('/:id', getTransactionById);
router.put('/:id', validateTransactionUpdate, updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
