require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Game, Tournament } = require('../models');
const connectDB = require('../config/db');

// Test users data
const testUsers = [
  {
    username: 'testuser1',
    email: 'testuser1@example.com',
    password: 'testpassword123',
    balance: 5000,
    rating: 1250,
    role: 'user'
  },
  {
    username: 'testuser2',
    email: 'testuser2@example.com',
    password: 'testpassword123',
    balance: 3000,
    rating: 1150,
    role: 'user'
  },
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'adminpassword123',
    balance: 10000,
    rating: 1800,
    role: 'admin'
  }
];

// Connect to the database
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    console.log('Database connected for seeding...');
    
    // Clear existing data
    await clearDatabase();
    
    // Create test users
    const users = await createUsers();
    
    // Create test games
    await createGames(users);
    
    // Create test tournaments
    await createTournaments(users);
    
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Clear all collections
async function clearDatabase() {
  console.log('Clearing existing data...');
  
  await User.deleteMany({});
  await Game.deleteMany({});
  await Tournament.deleteMany({});
  
  console.log('All collections cleared.');
}

// Create test users
async function createUsers() {
  console.log('Creating test users...');
  
  const users = [];
  
  for (const userData of testUsers) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const user = new User({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      balance: userData.balance,
      rating: userData.rating,
      role: userData.role,
      verified: true,
      stats: {
        wins: Math.floor(Math.random() * 20),
        losses: Math.floor(Math.random() * 15),
        draws: Math.floor(Math.random() * 10),
        tournamentWins: userData.role === 'admin' ? 3 : Math.floor(Math.random() * 2),
        highestRating: userData.rating + Math.floor(Math.random() * 100)
      },
      magicHorse: {
        unlockedLevels: userData.role === 'admin' ? [1, 2, 3, 4, 5] : [1, 2]
      },
      createdAt: new Date(),
      lastLogin: new Date()
    });
    
    await user.save();
    users.push(user);
    
    console.log(`Created user: ${userData.username}`);
  }
  
  return users;
}

// Create test games
async function createGames(users) {
  console.log('Creating test games...');
  
  // Create a completed game between user1 and user2
  const completedGame = new Game({
    white: {
      player: users[0]._id,
      rating: users[0].rating,
      bet: 100,
      timeRemaining: 600
    },
    black: {
      player: users[1]._id,
      rating: users[1].rating,
      bet: 100,
      timeRemaining: 542
    },
    status: 'completed',
    winner: 'white',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    moves: [
      {
        from: 'e2',
        to: 'e4',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        timestamp: new Date(Date.now() - 300000),
        timeSpent: 2
      },
      {
        from: 'e7',
        to: 'e5',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        timestamp: new Date(Date.now() - 240000),
        timeSpent: 5
      },
      {
        from: 'g1',
        to: 'f3',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        timestamp: new Date(Date.now() - 180000),
        timeSpent: 4
      },
      {
        from: 'b8',
        to: 'c6',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        timestamp: new Date(Date.now() - 120000),
        timeSpent: 3
      }
    ],
    startTime: new Date(Date.now() - 360000),
    endTime: new Date(Date.now() - 60000),
    variant: 'traditional',
    timeControl: 10,
    increment: 2,
    isRated: true,
    createdAt: new Date(Date.now() - 400000)
  });
  
  await completedGame.save();
  console.log('Created completed game between testuser1 and testuser2');
  
  // Create an active game between user2 and admin
  const activeGame = new Game({
    white: {
      player: users[1]._id,
      rating: users[1].rating,
      bet: 250,
      timeRemaining: 540
    },
    black: {
      player: users[2]._id,
      rating: users[2].rating,
      bet: 250,
      timeRemaining: 580
    },
    status: 'active',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    moves: [
      {
        from: 'e2',
        to: 'e4',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        timestamp: new Date(Date.now() - 60000),
        timeSpent: 2
      }
    ],
    startTime: new Date(Date.now() - 70000),
    variant: 'traditional',
    timeControl: 10,
    increment: 0,
    isRated: true,
    createdAt: new Date(Date.now() - 80000)
  });
  
  await activeGame.save();
  console.log('Created active game between testuser2 and admin');
}

// Create test tournaments
async function createTournaments(users) {
  console.log('Creating test tournaments...');
  
  // Create a registration phase tournament
  const registrationTournament = new Tournament({
    name: 'Weekend Chess Championship',
    description: 'Join our weekend tournament for a chance to win big prizes!',
    creator: users[2]._id, // admin
    startDate: new Date(Date.now() + 86400000), // tomorrow
    maxParticipants: 8,
    entryFee: 200,
    status: 'registration',
    gameVariant: 'traditional',
    timeControl: 'rapid',
    participants: [
      {
        user: users[0]._id,
        status: 'registered',
        registeredAt: new Date(Date.now() - 7200000)
      },
      {
        user: users[2]._id,
        status: 'registered',
        registeredAt: new Date(Date.now() - 86400000)
      }
    ],
    createdAt: new Date(Date.now() - 172800000) // 2 days ago
  });
  
  await registrationTournament.save();
  console.log('Created registration phase tournament');
  
  // Create a completed tournament
  const completedTournament = new Tournament({
    name: 'Spring Championship 2023',
    description: 'Our seasonal championship with the best players!',
    creator: users[2]._id, // admin
    startDate: new Date(Date.now() - 604800000), // 1 week ago
    endDate: new Date(Date.now() - 518400000), // 6 days ago
    maxParticipants: 4,
    entryFee: 500,
    prizePool: 2000,
    status: 'completed',
    gameVariant: 'traditional',
    timeControl: 'classical',
    currentRound: 2,
    winner: users[0]._id, // testuser1
    participants: [
      {
        user: users[0]._id,
        status: 'winner',
        registeredAt: new Date(Date.now() - 864000000)
      },
      {
        user: users[1]._id,
        status: 'eliminated',
        registeredAt: new Date(Date.now() - 950400000)
      },
      {
        user: users[2]._id,
        status: 'eliminated',
        registeredAt: new Date(Date.now() - 1036800000)
      }
    ],
    matches: [
      {
        round: 1,
        player1: users[0]._id,
        player2: users[1]._id,
        winner: users[0]._id,
        status: 'completed',
        startTime: new Date(Date.now() - 604800000),
        endTime: new Date(Date.now() - 603000000)
      },
      {
        round: 1,
        player1: users[2]._id,
        player2: null, // Bye
        winner: users[2]._id,
        status: 'completed'
      },
      {
        round: 2,
        player1: users[0]._id,
        player2: users[2]._id,
        winner: users[0]._id,
        status: 'completed',
        startTime: new Date(Date.now() - 518400000),
        endTime: new Date(Date.now() - 518000000)
      }
    ],
    createdAt: new Date(Date.now() - 1209600000) // 2 weeks ago
  });
  
  await completedTournament.save();
  console.log('Created completed tournament');
}

// Run the seed function
seedDatabase(); 