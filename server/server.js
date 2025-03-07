require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const socketio = require('socket.io');
const { Chess } = require('chess.js');
const Game = require('../models/Game');

// Import routes
const authRoutes = require('../routes/auth');
const gameRoutes = require('../routes/game');
const bettingRoutes = require('../routes/betting');
const tournamentRoutes = require('../routes/tournament');
const magicHorseRoutes = require('../routes/magicHorse');
const userRoutes = require('../routes/user');

// Import socket.io setup
const socketSetup = require('./socket');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize socket.io
const io = socketSetup(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'chess-universe-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-universe'
  })
});

app.use(sessionMiddleware);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/betting', bettingRoutes);
app.use('/api/tournament', tournamentRoutes);
app.use('/api/magicHorse', magicHorseRoutes);
app.use('/api/user', userRoutes);

// Socket.io middleware to access session data
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Active games storage
const activeGames = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Get user from session
  const user = socket.request.session.passport?.user;
  
  // Join a game
  socket.on('joinGame', ({ gameId }) => {
    socket.join(gameId);
    
    // Initialize game if it doesn't exist
    if (!activeGames.has(gameId)) {
      activeGames.set(gameId, {
        chess: new Chess(),
        players: new Set()
      });
    }
    
    const game = activeGames.get(gameId);
    if (user) {
      game.players.add(user);
    }
    
    // Get game data from database if it's an online game
    if (!gameId.startsWith('local-')) {
      Game.findById(gameId)
        .populate('spectatorBets.userId')
        .then(gameData => {
          // Notify all clients in the room about the current state
          io.to(gameId).emit('gameState', {
            fen: game.chess.fen(),
            turn: game.chess.turn(),
            isCheck: game.chess.isCheck(),
            isCheckmate: game.chess.isCheckmate(),
            isDraw: game.chess.isDraw(),
            isGameOver: game.chess.isGameOver(),
            game: gameData // Include the game data with spectator bets
          });
        })
        .catch(err => {
          console.error('Error fetching game data:', err);
          // Fallback to sending just the chess state
          io.to(gameId).emit('gameState', {
            fen: game.chess.fen(),
            turn: game.chess.turn(),
            isCheck: game.chess.isCheck(),
            isCheckmate: game.chess.isCheckmate(),
            isDraw: game.chess.isDraw(),
            isGameOver: game.chess.isGameOver()
          });
        });
    } else {
      // For local games, just send the chess state
      io.to(gameId).emit('gameState', {
        fen: game.chess.fen(),
        turn: game.chess.turn(),
        isCheck: game.chess.isCheck(),
        isCheckmate: game.chess.isCheckmate(),
        isDraw: game.chess.isDraw(),
        isGameOver: game.chess.isGameOver()
      });
    }
  });
  
  // Make a move
  socket.on('makeMove', ({ gameId, from, to, promotion }) => {
    if (!activeGames.has(gameId)) return;
    
    const game = activeGames.get(gameId);
    
    try {
      // Attempt to make the move
      const move = game.chess.move({ from, to, promotion });
      
      if (move) {
        // For online games, include game data with spectator bets
        if (!gameId.startsWith('local-')) {
          Game.findById(gameId)
            .populate('spectatorBets.userId')
            .then(gameData => {
              // Broadcast the updated game state to all players
              io.to(gameId).emit('gameState', {
                fen: game.chess.fen(),
                lastMove: move,
                turn: game.chess.turn(),
                isCheck: game.chess.isCheck(),
                isCheckmate: game.chess.isCheckmate(),
                isDraw: game.chess.isDraw(),
                isGameOver: game.chess.isGameOver(),
                game: gameData // Include the game data with spectator bets
              });
              
              // Handle game over
              handleGameOver(game, gameId, gameData);
            })
            .catch(err => {
              console.error('Error fetching game data:', err);
              // Fallback to sending just the chess state
              sendGameStateWithoutGameData(game, gameId, move);
            });
        } else {
          // For local games, just send the chess state
          sendGameStateWithoutGameData(game, gameId, move);
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
      socket.emit('error', { message: 'Invalid move' });
    }
  });
  
  // Helper function to send game state without game data
  function sendGameStateWithoutGameData(game, gameId, move) {
    io.to(gameId).emit('gameState', {
      fen: game.chess.fen(),
      lastMove: move,
      turn: game.chess.turn(),
      isCheck: game.chess.isCheck(),
      isCheckmate: game.chess.isCheckmate(),
      isDraw: game.chess.isDraw(),
      isGameOver: game.chess.isGameOver()
    });
    
    // Handle game over
    handleGameOver(game, gameId);
  }
  
  // Helper function to handle game over
  function handleGameOver(game, gameId, gameData) {
    if (game.chess.isGameOver()) {
      let result;
      if (game.chess.isCheckmate()) {
        result = game.chess.turn() === 'w' ? 'black' : 'white';
      } else {
        result = 'draw';
      }
      
      io.to(gameId).emit('gameOver', { 
        result,
        game: gameData // Include game data if available
      });
      
      // Clean up the game
      setTimeout(() => {
        activeGames.delete(gameId);
      }, 3600000); // Keep game data for 1 hour
    }
  }
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve the main app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize socket.io
socketSetup(server); 