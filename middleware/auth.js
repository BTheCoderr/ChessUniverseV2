const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware
 */

// Middleware to check if a user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    success: false,
    message: 'You need to be logged in to access this resource'
  });
};

// Middleware to check if a user is an admin
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({
    success: false,
    message: 'You need admin permissions to access this resource'
  });
};

// Middleware to check if a user is a moderator or admin
const isModeratorOrAdmin = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === 'moderator' || req.user.role === 'admin')) {
    return next();
  }
  
  res.status(403).json({
    success: false,
    message: 'You need moderator or admin permissions to access this resource'
  });
};

// Middleware to check if a user has enough balance for an action
const hasEnoughBalance = (amount) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'You need to be logged in to access this resource'
      });
    }
    
    if (req.user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `You need at least ${amount} coins to perform this action. Your current balance is ${req.user.balance} coins.`
      });
    }
    
    next();
  };
};

// Middleware to check if a user owns a resource
const isResourceOwner = (model, paramField, userField = '_id') => {
  return async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'You need to be logged in to access this resource'
      });
    }
    
    try {
      const resourceId = req.params[paramField];
      const resource = await model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }
      
      // Handle both simple ID fields and nested fields (e.g. 'creator._id')
      let ownerId;
      if (userField.includes('.')) {
        const parts = userField.split('.');
        let value = resource;
        for (const part of parts) {
          value = value[part];
        }
        ownerId = value;
      } else {
        ownerId = resource[userField];
      }
      
      if (ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource'
        });
      }
      
      req.resource = resource;
      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Server error while checking resource ownership',
        error: err.message
      });
    }
  };
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isModeratorOrAdmin,
  hasEnoughBalance,
  isResourceOwner
}; 