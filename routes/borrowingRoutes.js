const express = require('express');
const router = express.Router();
const Borrowing = require('../models/borrowing');
const Book = require('../models/book');
const User = require('../models/user');
const { auth, authAdmin } = require('../middleware/auth');

// Borrow a book
router.post('/borrowings', auth, async (req, res) => {
  try {
    // Check if user has unpaid fines
    if (req.user.fines > 0) {
      return res.status(400).send({ error: 'Cannot borrow books. Please pay your outstanding fines.' });
    }

    // Check if the book exists and is available
    const book = await Book.findById(req.body.book);
    if (!book) {
      return res.status(404).send({ error: 'Book not found' });
    }
    
    if (book.copies.available <= 0) {
      return res.status(400).send({ error: 'Book is not available for borrowing' });
    }
    
    // Calculate due date (default: 14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    
    // Create new borrowing record
    const borrowing = new Borrowing({
      user: req.user._id,
      book: book._id,
      dueDate: req.body.dueDate || dueDate
    });
    
    // Update book availability
    book.copies.available -= 1;
    if (book.copies.available === 0) {
      book.status = 'Borrowed';
    }
    
    await Promise.all([borrowing.save(), book.save()]);
    
    await borrowing.populate('book');
    res.status(201).send(borrowing);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get all borrowings for current user
router.get('/borrowings/me', auth, async (req, res) => {
  try {
    const borrowings = await Borrowing.find({ user: req.user._id })
      .populate('book')
      .sort({ borrowDate: -1 });
    res.send(borrowings);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get borrowing details by ID
router.get('/borrowings/:id', auth, async (req, res) => {
  try {
    const borrowing = await Borrowing.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('book');
    
    if (!borrowing) {
      return res.status(404).send();
    }
    
    res.send(borrowing);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Return a book
router.patch('/borrowings/:id/return', auth, async (req, res) => {
  try {
    const borrowing = await Borrowing.findOne({ 
      _id: req.params.id,
      status: 'active' 
    });
    
    if (!borrowing) {
      return res.status(404).send({ error: 'Borrowing record not found or book already returned' });
    }
    
    // Check if the user is admin/librarian or the borrower
    if (!['admin', 'librarian'].includes(req.user.role) && 
        !borrowing.user.equals(req.user._id)) {
      return res.status(403).send({ error: 'Not authorized to return this book' });
    }
    
    // Update borrowing record
    borrowing.returnDate = new Date();
    borrowing.status = 'returned';
    
    // Calculate fine if overdue
    if (borrowing.isOverdue()) {
      const fineAmount = borrowing.calculateFine();
      borrowing.fine.amount = fineAmount;
      
      // Update user's total fines
      const user = await User.findById(borrowing.user);
      user.fines += fineAmount;
      await user.save();
    }
    
    // Update book availability
    const book = await Book.findById(borrowing.book);
    book.copies.available += 1;
    if (book.status === 'Borrowed') {
      book.status = 'Available';
    }
    
    await Promise.all([borrowing.save(), book.save()]);
    
    await borrowing.populate('book');
    res.send(borrowing);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Renew a book
router.patch('/borrowings/:id/renew', auth, async (req, res) => {
  try {
    const borrowing = await Borrowing.findOne({ 
      _id: req.params.id, 
      user: req.user._id,
      status: 'active'
    });
    
    if (!borrowing) {
      return res.status(404).send({ error: 'Borrowing record not found or cannot be renewed' });
    }
    
    // Check if already renewed maximum times (max 2 renewals)
    if (borrowing.renewals >= 2) {
      return res.status(400).send({ error: 'Maximum renewals reached' });
    }
    
    // Extend due date by 7 days
    const newDueDate = new Date(borrowing.dueDate);
    newDueDate.setDate(newDueDate.getDate() + 7);
    borrowing.dueDate = newDueDate;
    borrowing.renewals += 1;
    
    await borrowing.save();
    await borrowing.populate('book');
    
    res.send(borrowing);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Get all borrowings
router.get('/borrowings', auth, authAdmin, async (req, res) => {
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
    
    const borrowings = await Borrowing.find(match)
      .populate('book')
      .populate('user')
      .sort(sort)
      .limit(parseInt(req.query.limit) || 10)
      .skip(parseInt(req.query.skip) || 0);
    
    res.send(borrowings);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Process fines payment
router.patch('/borrowings/:id/pay-fine', auth, authAdmin, async (req, res) => {
  try {
    const borrowing = await Borrowing.findById(req.params.id);
    if (!borrowing) {
      return res.status(404).send();
    }
    
    if (borrowing.fine.amount === 0 || borrowing.fine.paid) {
      return res.status(400).send({ error: 'No unpaid fines for this borrowing' });
    }
    
    borrowing.fine.paid = true;
    borrowing.fine.paidDate = new Date();
    
    // Update user's total fines
    const user = await User.findById(borrowing.user);
    user.fines -= borrowing.fine.amount;
    
    await Promise.all([borrowing.save(), user.save()]);
    res.send(borrowing);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
