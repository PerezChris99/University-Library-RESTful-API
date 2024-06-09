const express = require('express');
const mongoose = require('mongoose');
const bookRoutes = require('./routes/bookRoutes');

const app = express();

mongoose.connect('mongodb://localhost:27017/bookapi', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json());
app.use('/api', bookRoutes);

module.exports = app;
