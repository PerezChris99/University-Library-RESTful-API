const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Import routes
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
const borrowingRoutes = require('./routes/borrowingRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const analyticRoutes = require('./routes/analyticRoutes');

const app = express();

// Database connection
mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/library', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route for testing
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to University Library API' });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api', bookRoutes);
app.use('/api', userRoutes);
app.use('/api', borrowingRoutes);
app.use('/api', reservationRoutes);
app.use('/api', analyticRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

module.exports = app;
