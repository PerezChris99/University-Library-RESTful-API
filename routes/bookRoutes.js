const express = require('express');
const router = express.Router();
const Book = require('../models/book');
const { auth, authAdmin } = require('../middleware/auth');

// Get all books
router.get('/books', async (req, res) => {
  try {
    const match = {};
    const sort = {};
    
    // Filtering
    if (req.query.category) {
      match.category = req.query.category;
    }
    
    if (req.query.status) {
      match.status = req.query.status;
    }
    
    // Sorting
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }
    
    // Search functionality
    if (req.query.search) {
      match.$text = { $search: req.query.search };
    }
    
    const books = await Book.find(match)
      .sort(sort)
      .limit(parseInt(req.query.limit) || 10)
      .skip(parseInt(req.query.skip) || 0);
    
    res.send(books);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get book by ID
router.get('/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).send();
    }
    res.send(book);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Create a new book
router.post('/books', auth, authAdmin, async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.status(201).send(book);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Admin routes - Update book
router.patch('/books/:id', auth, authAdmin, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'title', 'author', 'isbn', 'category', 'subcategory', 
    'description', 'publisher', 'pages', 'publishedDate', 
    'language', 'copies', 'location', 'status', 'coverImage'
  ];
  
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }
  
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).send();
    }
    
    updates.forEach(update => {
      if (update === 'copies') {
        // Handle nested object updates
        Object.keys(req.body.copies).forEach(copyProperty => {
          book.copies[copyProperty] = req.body.copies[copyProperty];
        });
      } else if (update === 'location') {
        // Handle nested object updates
        Object.keys(req.body.location).forEach(locationProperty => {
          book.location[locationProperty] = req.body.location[locationProperty];
        });
      } else {
        book[update] = req.body[update];
      }
    });
    
    await book.save();
    res.send(book);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Admin routes - Delete book
router.delete('/books/:id', auth, authAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).send();
    }
    res.send(book);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Update book inventory
router.patch('/books/:id/inventory', auth, authAdmin, async (req, res) => {
  try {
    if (!req.body.copies || !req.body.copies.total || req.body.copies.total < 0) {
      return res.status(400).send({ error: 'Valid inventory information required' });
    }
    
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).send();
    }
    
    const totalCopies = req.body.copies.total;
    
    // Calculate how many new copies are being added
    const newCopiesAdded = totalCopies - book.copies.total;
    
    // Update book
    book.copies.total = totalCopies;
    book.copies.available += newCopiesAdded;
    
    // Ensure available copies is not negative
    if (book.copies.available < 0) {
      book.copies.available = 0;
    }
    
    // Update status if needed
    if (book.copies.available > 0 && book.status !== 'Available') {
      book.status = 'Available';
    } else if (book.copies.available === 0 && book.status === 'Available') {
      book.status = 'Not Available';
    }
    
    await book.save();
    res.send(book);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

module.exports = router;
