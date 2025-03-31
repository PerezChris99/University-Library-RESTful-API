const mongoose = require('mongoose');

const borrowingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Book'
  },
  borrowDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'returned', 'lost', 'damaged'],
    default: 'active'
  },
  renewals: {
    type: Number,
    default: 0
  },
  fine: {
    amount: {
      type: Number,
      default: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidDate: {
      type: Date
    }
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Method to check if the borrowing is overdue
borrowingSchema.methods.isOverdue = function() {
  return this.status === 'active' && new Date() > this.dueDate;
};

// Method to calculate fine
borrowingSchema.methods.calculateFine = function() {
  if (!this.isOverdue() || this.status !== 'returned') {
    return 0;
  }
  
  const returnDate = this.returnDate || new Date();
  const daysLate = Math.ceil((returnDate - this.dueDate) / (1000 * 60 * 60 * 24));
  
  // Fine rate per day (default to $1 if not set in environment)
  const ratePerDay = process.env.FINE_RATE_PER_DAY || 1;
  
  return Math.max(0, daysLate * ratePerDay);
};

const Borrowing = mongoose.model('Borrowing', borrowingSchema);
module.exports = Borrowing;
