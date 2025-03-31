const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
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
  reservationDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'fulfilled', 'expired', 'cancelled'],
    default: 'pending'
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  fulfillmentDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Method to check if a reservation is expired
reservationSchema.methods.isExpired = function() {
  return new Date() > this.expiryDate;
};

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = Reservation;
