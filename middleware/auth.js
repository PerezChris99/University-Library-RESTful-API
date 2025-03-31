const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).send({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    
    if (!user) {
      return res.status(401).send({ error: 'Authentication failed' });
    }
    
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate' });
  }
};

// Middleware to check if user is admin or librarian
const authAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'librarian') {
    return res.status(403).send({ error: 'Access denied. Insufficient privileges.' });
  }
  next();
};

module.exports = { auth, authAdmin };
