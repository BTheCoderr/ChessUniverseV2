const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Configure passport to use local strategy
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findOne({ username });
            if (!user) {
                return done(null, false, { message: 'Incorrect username or password' });
            }
            
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect username or password' });
            }
            
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Create new user
    const newUser = new User({
      username,
      email,
      password, // Will be hashed by pre-save hook
      balance: 1000, // Starting balance
      rating: 1200, // Default rating
    });
    
    await newUser.save();
    
    // Login the user after registration
    req.login(newUser, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging in after registration',
          error: err.message
        });
      }
      
      // Return user info without password
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          balance: newUser.balance,
          rating: newUser.rating,
          magicHorse: newUser.magicHorse
        }
      });
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: err.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user and return user data
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: err.message
      });
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: info.message || 'Invalid credentials'
      });
    }
    
    req.login(user, async (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging in',
          error: err.message
        });
      }
      
      // Update last login time
      user.lastLogin = new Date();
      await user.save();
      
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          balance: user.balance,
          rating: user.rating,
          role: user.role,
          magicHorse: user.magicHorse
        }
      });
    });
  })(req, res, next);
});

// @route   GET /api/auth/logout
// @desc    Logout user
router.get('/logout', (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging out',
          error: err.message
        });
      }
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } catch (err) {
    console.error('Error logging out:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: err.message
    });
  }
});

// @route   GET /api/auth/user
// @desc    Get current user
router.get('/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.json({
      success: false,
      message: 'Not authenticated',
      user: null
    });
  }
  
  const user = {
    id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    balance: req.user.balance,
    rating: req.user.rating,
    role: req.user.role,
    profile: req.user.profile,
    stats: req.user.stats,
    magicHorse: req.user.magicHorse,
    lastLogin: req.user.lastLogin
  };
  
  res.json({
    success: true,
    message: 'User authenticated',
    user
  });
});

// @route   POST /api/auth/create-test-account
// @desc    Create and login as a test user (for demo purposes)
router.post('/create-test-account', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if test user already exists
    let testUser = await User.findOne({ username });
    
    // If user doesn't exist, create one
    if (!testUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      testUser = new User({
        username,
        email: `${username}@example.com`,
        password: hashedPassword,
        balance: 5000,
        rating: 1250,
        verified: true
      });
      
      await testUser.save();
    }
    
    // Login as test user
    req.login(testUser, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging in as test user',
          error: err.message
        });
      }
      
      return res.json({
        success: true,
        message: 'Logged in as test user',
        user: {
          id: testUser._id,
          username: testUser.username,
          email: testUser.email,
          balance: testUser.balance,
          rating: testUser.rating,
          magicHorse: testUser.magicHorse
        }
      });
    });
  } catch (err) {
    console.error('Error creating test account:', err);
    res.status(500).json({
      success: false,
      message: 'Server error creating test account',
      error: err.message
    });
  }
});

module.exports = router; 