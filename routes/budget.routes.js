const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetHistory,
  checkBudgetAlerts
} = require('../controllers/budget.controller');

// All budget routes require authentication
router.use(protect);

// Validation: create budget
const validateCreateBudget = [
  body('category')
    .notEmpty().withMessage('Category is required')
    .trim()
    .isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters'),

  body('limit')
    .notEmpty().withMessage('Budget limit is required')
    .isFloat({ min: 1 }).withMessage('Budget limit must be at least $1'),

  body('month')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),

  body('year')
    .optional()
    .isInt({ min: 2020 }).withMessage('Year must be 2020 or later'),

  body('alertThreshold')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Alert threshold must be between 1% and 100%'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 250 }).withMessage('Notes cannot exceed 250 characters'),

  handleValidationErrors
];

// Validation: update budget (all optional)
const validateUpdateBudget = [
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters'),

  body('limit')
    .optional()
    .isFloat({ min: 1 }).withMessage('Budget limit must be at least $1'),

  body('alertThreshold')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Alert threshold must be between 1% and 100%'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 250 }).withMessage('Notes cannot exceed 250 characters'),

  handleValidationErrors
];

// Special routes MUST be defined BEFORE /:id to avoid route collision
router.get('/history/all', getBudgetHistory);
router.get('/alerts/check', checkBudgetAlerts);

// Standard CRUD
router.get('/', getBudgets);
router.post('/', validateCreateBudget, createBudget);
router.get('/:id', getBudgetById);
router.put('/:id', validateUpdateBudget, updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
