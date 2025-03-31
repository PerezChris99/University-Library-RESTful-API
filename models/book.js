const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Art', 'Literature', 'Reference', 'Other']
  },
  subcategory: {
    type: String
  },
  description: {
    type: String
  },
  publisher: {
    type: String
  },
  pages: {
    type: Number
  },
  publishedDate: {
    type: Date
  },
  language: {
    type: String,
    default: 'English'
  },
  copies: {
    total: {
      type: Number,
      default: 1
    },
    available: {
      type: Number,
      default: 1
    }
  },
  location: {
    shelf: String,
    row: String,
    section: String
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Available', 'Borrowed', 'Reserved', 'Not Available'],
    default: 'Available'
  },
  coverImage: {
    type: String
  }
});

// Add text index for search functionality
bookSchema.index({ title: 'text', author: 'text', description: 'text' });

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;
