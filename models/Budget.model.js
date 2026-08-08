const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  limit: {
    type: Number,
    required: [true, 'Budget limit is required'],
    min: [1, 'Budget limit must be at least $1']
  },
  month: {
    type: Number,
    required: [true, 'Month is required'],
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: 2020
  },
  alertThreshold: {
    type: Number,
    default: 80,
    min: [1, 'Alert threshold must be at least 1%'],
    max: [100, 'Alert threshold cannot exceed 100%']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [250, 'Notes cannot exceed 250 characters'],
    default: ''
  }
}, {
  timestamps: true
});

// Enforce one budget per user + category + month + year
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });
// Efficient lookup for all budgets in a specific month
budgetSchema.index({ userId: 1, month: 1, year: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
