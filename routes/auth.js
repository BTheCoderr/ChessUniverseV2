const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

const router = express.Router();

// Configure Passport.js
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      
      if (!user) {
        return done(null, false, { message: 'Incorrect username' });
      }
      
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

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

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'All fields are required',
        fields: {
          username: !username ? 'Username is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }
    
    // Check username format
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ 
        message: 'Username must be between 3 and 20 characters',
        field: 'username'
      });
    }
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format',
        field: 'email'
      });
    }
    
    // Check password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters',
        field: 'password'
      });
    }
    
    // Check if username exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ 
        message: 'Username already in use',
        field: 'username'
      });
    }
    
    // Check if email exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'Email already in use',
        field: 'email'
      });
    }
    
    // Create new user
    const newUser = new User({
      username,
      email,
      password
    });
    
    await newUser.save();
    
    // Log in the user after registration
    req.login(newUser, (err) => {
      if (err) {
        console.error('Login error after registration:', err);
        return res.status(500).json({ message: 'Error logging in after registration' });
      }
      
      return res.status(201).json({
        message: 'Registration successful',
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          balance: newUser.balance,
          stats: newUser.stats,
          unlockedLevels: newUser.unlockedLevels
        }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// Login
router.post('/login', (req, res, next) => {
  console.log('Login attempt for user:', req.body.username);
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Internal server error during login' });
    }
    
    if (!user) {
      console.log('Login failed:', info.message);
      return res.status(401).json({ message: info.message || 'Invalid credentials' });
    }
    
    req.login(user, (err) => {
      if (err) {
        console.error('Session error during login:', err);
        return res.status(500).json({ message: 'Error establishing session' });
      }
      
      console.log('Login successful for user:', user.username);
      console.log('Session after login:', req.session);
      
      return res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          balance: user.balance
        }
      });
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error during logout' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
router.get('/current-user', (req, res) => {
  console.log('Current user request received');
  console.log('Is authenticated:', req.isAuthenticated());
  console.log('Session:', req.session);
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      balance: req.user.balance,
      gamesPlayed: req.user.gamesPlayed,
      gamesWon: req.user.gamesWon,
      gamesLost: req.user.gamesLost,
      gamesTied: req.user.gamesTied
    }
  });
});

module.exports = router; 