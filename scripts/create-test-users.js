require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Test users configuration
const testUsers = [
  {
    username: 'testuser1',
    email: 'test1@chessapp.com',
    password: 'testpassword123',
    balance: 5000,
    rating: 1250
  },
  {
    username: 'testuser2',
    email: 'test2@chessapp.com',
    password: 'testpassword123',
    balance: 3000,
    rating: 1150
  },
  {
    username: 'admin',
    email: 'admin@chessapp.com',
    password: 'adminpassword123',
    balance: 10000,
    rating: 1800,
    role: 'admin'
  }
];

// Function to create a user
async function createUser(userData) {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: userData.username },
        { email: userData.email }
      ]
    });

    if (existingUser) {
      console.log(`User ${userData.username} already exists.`);
      return existingUser;
    }

    // Create new user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const newUser = new User({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      balance: userData.balance || 1000,
      rating: userData.rating || 1200,
      role: userData.role || 'user'
    });

    await newUser.save();
    console.log(`User ${userData.username} created successfully.`);
    return newUser;
  } catch (error) {
    console.error(`Error creating user ${userData.username}:`, error);
    return null;
  }
}

// Create all test users
async function createTestUsers() {
  console.log('Creating test users...');
  
  for (const userData of testUsers) {
    await createUser(userData);
  }
  
  console.log('All test users created successfully.');
  mongoose.disconnect();
}

// Run the script
createTestUsers(); 