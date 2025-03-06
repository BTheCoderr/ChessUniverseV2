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

// Import routes
const authRoutes = require('../routes/auth');
const gameRoutes = require('../routes/game');
const bettingRoutes = require('../routes/betting');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'chess-app-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-app',
    collectionName: 'sessions'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
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
    
    // Notify all clients in the room about the current state
    io.to(gameId).emit('gameState', {
      fen: game.chess.fen(),
      turn: game.chess.turn(),
      isCheck: game.chess.isCheck(),
      isCheckmate: game.chess.isCheckmate(),
      isDraw: game.chess.isDraw(),
      isGameOver: game.chess.isGameOver()
    });
  });
  
  // Make a move
  socket.on('makeMove', ({ gameId, from, to, promotion }) => {
    if (!activeGames.has(gameId)) return;
    
    const game = activeGames.get(gameId);
    
    try {
      // Attempt to make the move
      const move = game.chess.move({ from, to, promotion });
      
      if (move) {
        // Broadcast the updated game state to all players
        io.to(gameId).emit('gameState', {
          fen: game.chess.fen(),
          lastMove: move,
          turn: game.chess.turn(),
          isCheck: game.chess.isCheck(),
          isCheckmate: game.chess.isCheckmate(),
          isDraw: game.chess.isDraw(),
          isGameOver: game.chess.isGameOver()
        });
        
        // If game is over, handle the result
        if (game.chess.isGameOver()) {
          let result;
          if (game.chess.isCheckmate()) {
            result = game.chess.turn() === 'w' ? 'black' : 'white';
          } else {
            result = 'draw';
          }
          
          io.to(gameId).emit('gameOver', { result });
          
          // Clean up the game
          setTimeout(() => {
            activeGames.delete(gameId);
          }, 3600000); // Keep game data for 1 hour
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
      socket.emit('error', { message: 'Invalid move' });
    }
  });
  
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