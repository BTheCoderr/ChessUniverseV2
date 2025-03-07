const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
const isAuthenticated = async (req, res, next) => {
  try {
    // Check if user is authenticated via session
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }

    // If not authenticated via session, check for token
    const token = req.header('x-auth-token');

    // Check if no token
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    // Add user from payload
    req.user = await User.findById(decoded.user.id);
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = { isAuthenticated }; 