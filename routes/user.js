const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

// Get user profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's Magic Horse progress
router.get('/magic-horse-progress', isAuthenticated, async (req, res) => {
  try {
    console.log('Fetching Magic Horse progress for user:', req.user._id);
    const user = await User.findById(req.user._id).select('magicHorseProgress');
    
    // If user has no progress yet, initialize with default values
    const progress = user.magicHorseProgress || {
      level1: 'not_started',
      level2: 'locked',
      level3: 'locked',
      level4: 'locked'
    };
    
    res.json({ progress });
  } catch (error) {
    console.error('Error fetching Magic Horse progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user's Magic Horse progress
router.post('/magic-horse-progress', isAuthenticated, async (req, res) => {
  try {
    const { level, status } = req.body;
    
    if (!level || !status) {
      return res.status(400).json({ message: 'Level and status are required' });
    }
    
    // Validate level
    if (!['level1', 'level2', 'level3', 'level4'].includes(level)) {
      return res.status(400).json({ message: 'Invalid level' });
    }
    
    // Validate status
    if (!['not_started', 'in_progress', 'completed', 'locked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Get current progress
    const user = await User.findById(req.user._id);
    const progress = user.magicHorseProgress || {};
    
    // Update progress
    progress[level] = status;
    
    // If a level is completed, unlock the next level
    if (status === 'completed') {
      if (level === 'level1') {
        progress.level2 = progress.level2 === 'locked' ? 'not_started' : progress.level2;
      } else if (level === 'level2') {
        progress.level3 = progress.level3 === 'locked' ? 'not_started' : progress.level3;
      } else if (level === 'level3') {
        progress.level4 = progress.level4 === 'locked' ? 'not_started' : progress.level4;
      }
    }
    
    // Update user
    user.magicHorseProgress = progress;
    await user.save();
    
    res.json({ message: 'Progress updated successfully', progress });
  } catch (error) {
    console.error('Error updating Magic Horse progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 