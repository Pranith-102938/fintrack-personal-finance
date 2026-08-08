const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: {
      values: ['income', 'expense'],
      message: 'Type must be either "income" or "expense"'
    },
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be at least 0.01']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  description: {
    type: String,
    trim: true,
    maxlength: [250, 'Description cannot exceed 250 characters'],
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: {
      values: ['cash', 'card', 'bank_transfer', 'upi', 'other'],
      message: 'Invalid payment method'
    },
    default: 'card'
  }
}, {
  timestamps: true
});

// Compound index for efficient user queries sorted by date
transactionSchema.index({ userId: 1, date: -1 });
// Index for category filtering
transactionSchema.index({ userId: 1, category: 1 });
// Index for type filtering
transactionSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
