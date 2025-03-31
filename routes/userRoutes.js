const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { auth, authAdmin } = require('../middleware/auth');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../emails/account');
const router = express.Router();

// Register a new user
router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    // Send welcome email
    try {
      sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
    
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Login user
router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password);
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (error) {
    res.status(401).send({ error: 'Authentication failed' });
  }
});

// Logout current session
router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(token => token.token !== req.token);
    await req.user.save();
    res.send({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Logout from all sessions
router.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.send({ message: 'Logged out from all devices' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get current user profile
router.get('/users/me', auth, async (req, res) => {
  res.send(req.user);
});

// Update user profile
router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'name', 'email', 'password', 'department', 
    'contactNumber', 'address'
  ];
  
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }
  
  try {
    updates.forEach(update => {
      if (update === 'address' && typeof req.body.address === 'object') {
        Object.keys(req.body.address).forEach(key => {
          req.user.address[key] = req.body.address[key];
        });
      } else {
        req.user[update] = req.body[update];
      }
    });
    
    await req.user.save();
    res.send(req.user);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Request password reset
router.post('/users/password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    
    // Generate reset token (just using JWT here for simplicity)
    const resetToken = jwt.sign({ _id: user._id.toString() }, 
      process.env.JWT_SECRET + user.password, // Adding password hash makes token invalid after password change
      { expiresIn: '1h' }
    );
    
    // Send password reset email
    try {
      sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (error) {
      return res.status(500).send({ error: 'Could not send reset email' });
    }
    
    res.send({ message: 'Reset email sent successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Pay fines
router.post('/users/pay-fines', auth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).send({ error: 'Valid amount required' });
    }
    
    if (amount > req.user.fines) {
      return res.status(400).send({ error: 'Amount exceeds outstanding fines' });
    }
    
    req.user.fines -= amount;
    await req.user.save();
    
    res.send({ 
      paid: amount,
      remainingFines: req.user.fines,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Get all users
router.get('/users', auth, authAdmin, async (req, res) => {
  try {
    const match = {};
    const sort = {};
    
    if (req.query.role) {
      match.role = req.query.role;
    }
    
    if (req.query.isActive) {
      match.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }
    
    const users = await User.find(match)
      .sort(sort)
      .limit(parseInt(req.query.limit) || 10)
      .skip(parseInt(req.query.skip) || 0);
    
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Get user by ID
router.get('/users/:id', auth, authAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).send();
    }
    
    res.send(user);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Admin routes - Update user
router.patch('/users/:id', auth, authAdmin, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'name', 'email', 'password', 'role', 'studentId', 
    'department', 'contactNumber', 'address', 'fines', 'isActive'
  ];
  
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }
  
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).send();
    }
    
    updates.forEach(update => {
      if (update === 'address' && typeof req.body.address === 'object') {
        Object.keys(req.body.address).forEach(key => {
          user.address[key] = req.body.address[key];
        });
      } else {
        user[update] = req.body[update];
      }
    });
    
    await user.save();
    res.send(user);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

module.exports = router;
