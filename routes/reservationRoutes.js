const express = require('express');
const router = express.Router();
const Reservation = require('../models/reservation');
const Book = require('../models/book');
const { auth, authAdmin } = require('../middleware/auth');

// Create a new reservation
router.post('/reservations', auth, async (req, res) => {
  try {
    // Check if user has unpaid fines
    if (req.user.fines > 0) {
      return res.status(400).send({ 
        error: 'Cannot reserve books. Please pay your outstanding fines.' 
      });
    }

    // Check if the book exists
    const book = await Book.findById(req.body.book);
    if (!book) {
      return res.status(404).send({ error: 'Book not found' });
    }
    
    // Check if user already has a reservation for this book
    const existingReservation = await Reservation.findOne({
      user: req.user._id,
      book: book._id,
      status: 'pending'
    });
    
    if (existingReservation) {
      return res.status(400).send({ 
        error: 'You already have a pending reservation for this book' 
      });
    }
    
    // Set expiry date (default: 7 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    // Create the reservation
    const reservation = new Reservation({
      user: req.user._id,
      book: book._id,
      expiryDate: req.body.expiryDate || expiryDate
    });
    
    await reservation.save();
    await reservation.populate('book');
    
    res.status(201).send(reservation);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get all reservations for current user
router.get('/reservations/me', auth, async (req, res) => {
  try {
    const match = {};
    
    if (req.query.status) {
      match.status = req.query.status;
    }
    
    const reservations = await Reservation.find({
      user: req.user._id,
      ...match
    })
    .populate('book')
    .sort({ reservationDate: -1 });
    
    res.send(reservations);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get reservation by ID
router.get('/reservations/:id', auth, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('book');
    
    if (!reservation) {
      return res.status(404).send();
    }
    
    res.send(reservation);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Cancel reservation
router.patch('/reservations/:id/cancel', auth, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ 
      _id: req.params.id, 
      user: req.user._id,
      status: 'active'
    });
    
    if (!reservation) {
      return res.status(404).send({ error: 'Reservation not found or cannot be cancelled' });
    }
    
    reservation.status = 'cancelled';
    await reservation.save();
    await reservation.populate('book');
    
    res.send(reservation);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Get all reservations
router.get('/reservations', auth, authAdmin, async (req, res) => {
  try {
    const match = {};
    const sort = {};
    
    if (req.query.status) {
      match.status = req.query.status;
    }
    
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }
    
    const reservations = await Reservation.find(match)
      .populate('book')
      .populate('user')
      .sort(sort)
      .limit(parseInt(req.query.limit) || 10)
      .skip(parseInt(req.query.skip) || 0);
    
    res.send(reservations);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Update reservation status
router.patch('/reservations/:id', auth, authAdmin, async (req, res) => {
  const allowedUpdates = ['status', 'expiryDate', 'notificationSent'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }
  
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).send();
    }
    
    updates.forEach(update => reservation[update] = req.body[update]);
    await reservation.save();
    await reservation.populate('book');
    await reservation.populate('user');
    
    res.send(reservation);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Admin routes - Fulfill reservation
router.patch('/reservations/:id/fulfill', auth, authAdmin, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).send({ error: 'Reservation not found' });
    }
    
    if (reservation.status !== 'active') {
      return res.status(400).send({ error: `Reservation is already ${reservation.status}` });
    }
    
    reservation.status = 'fulfilled';
    await reservation.save();
    
    res.send(reservation);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;

