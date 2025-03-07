const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');

// Store active games and waiting players
const activeGames = new Map();
const waitingPlayers = new Map();
const userSockets = new Map();

module.exports = function(server) {
  const io = socketIO(server);
  
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Authentication error: ' + error.message));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.user._id})`);
    
    // Store user's socket for reconnection
    userSockets.set(socket.user._id.toString(), socket);
    
    // Handle player seeking a game
    socket.on('seek_game', async (data) => {
      try {
        const { level } = data;
        const userId = socket.user._id.toString();
        
        // Remove from waiting list if already waiting
        if (waitingPlayers.has(userId)) {
          waitingPlayers.delete(userId);
        }
        
        // Check for suitable opponent
        let matched = false;
        for (const [waitingId, waitingData] of waitingPlayers.entries()) {
          if (waitingData.level === level && waitingId !== userId) {
            // Match found, create a new game
            const whitePlayer = Math.random() < 0.5 ? userId : waitingId;
            const blackPlayer = whitePlayer === userId ? waitingId : userId;
            
            const game = new Game({
              white: whitePlayer,
              black: blackPlayer,
              level: level,
              status: 'active',
              moves: []
            });
            
            await game.save();
            
            // Store game in active games
            activeGames.set(game._id.toString(), {
              gameId: game._id.toString(),
              white: whitePlayer,
              black: blackPlayer,
              level: level,
              moves: [],
              lastMoveTime: Date.now()
            });
            
            // Notify both players
            const waitingSocket = userSockets.get(waitingId);
            if (waitingSocket) {
              waitingSocket.emit('game_start', {
                gameId: game._id.toString(),
                opponent: {
                  id: socket.user._id,
                  username: socket.user.username,
                  rating: socket.user.rating
                },
                color: whitePlayer === waitingId ? 'white' : 'black'
              });
            }
            
            socket.emit('game_start', {
              gameId: game._id.toString(),
              opponent: {
                id: waitingData.user._id,
                username: waitingData.user.username,
                rating: waitingData.user.rating
              },
              color: whitePlayer === userId ? 'white' : 'black'
            });
            
            // Remove waiting player
            waitingPlayers.delete(waitingId);
            matched = true;
            break;
          }
        }
        
        // If no match, add to waiting list
        if (!matched) {
          waitingPlayers.set(userId, {
            user: socket.user,
            level: level,
            seekTime: Date.now()
          });
          socket.emit('waiting_for_opponent');
        }
      } catch (error) {
        console.error('Error in seek_game:', error);
        socket.emit('error', { message: 'Failed to seek game' });
      }
    });
    
    // Handle player canceling seek
    socket.on('cancel_seek', () => {
      const userId = socket.user._id.toString();
      if (waitingPlayers.has(userId)) {
        waitingPlayers.delete(userId);
        socket.emit('seek_canceled');
      }
    });
    
    // Handle game moves
    socket.on('make_move', async (data) => {
      try {
        const { gameId, move } = data;
        const userId = socket.user._id.toString();
        
        // Validate game exists and user is a participant
        const gameData = activeGames.get(gameId);
        if (!gameData) {
          // Try to load from database if not in memory
          const game = await Game.findById(gameId);
          if (!game) {
            return socket.emit('error', { message: 'Game not found' });
          }
          
          // Add to active games
          activeGames.set(gameId, {
            gameId: game._id.toString(),
            white: game.white.toString(),
            black: game.black.toString(),
            level: game.level,
            moves: game.moves,
            lastMoveTime: Date.now()
          });
        }
        
        const updatedGameData = activeGames.get(gameId);
        
        // Check if user is a participant
        if (updatedGameData.white !== userId && updatedGameData.black !== userId) {
          return socket.emit('error', { message: 'You are not a participant in this game' });
        }
        
        // Check if it's user's turn
        const isWhiteTurn = updatedGameData.moves.length % 2 === 0;
        const isUserWhite = updatedGameData.white === userId;
        
        if ((isWhiteTurn && !isUserWhite) || (!isWhiteTurn && isUserWhite)) {
          return socket.emit('error', { message: 'Not your turn' });
        }
        
        // Add move to game
        updatedGameData.moves.push(move);
        updatedGameData.lastMoveTime = Date.now();
        
        // Update game in database
        await Game.findByIdAndUpdate(gameId, {
          $push: { moves: move }
        });
        
        // Notify opponent
        const opponentId = isUserWhite ? updatedGameData.black : updatedGameData.white;
        const opponentSocket = userSockets.get(opponentId);
        
        if (opponentSocket) {
          opponentSocket.emit('opponent_move', { gameId, move });
        }
        
        // Acknowledge move
        socket.emit('move_confirmed', { gameId, move });
      } catch (error) {
        console.error('Error in make_move:', error);
        socket.emit('error', { message: 'Failed to make move' });
      }
    });
    
    // Handle game resignation
    socket.on('resign_game', async (data) => {
      try {
        const { gameId } = data;
        const userId = socket.user._id.toString();
        
        const gameData = activeGames.get(gameId);
        if (!gameData) {
          return socket.emit('error', { message: 'Game not found' });
        }
        
        // Check if user is a participant
        if (gameData.white !== userId && gameData.black !== userId) {
          return socket.emit('error', { message: 'You are not a participant in this game' });
        }
        
        // Determine winner
        const winner = gameData.white === userId ? gameData.black : gameData.white;
        
        // Update game in database
        await Game.findByIdAndUpdate(gameId, {
          status: 'completed',
          result: gameData.white === userId ? 'black' : 'white',
          winner: winner
        });
        
        // Remove from active games
        activeGames.delete(gameId);
        
        // Notify opponent
        const opponentId = gameData.white === userId ? gameData.black : gameData.white;
        const opponentSocket = userSockets.get(opponentId);
        
        if (opponentSocket) {
          opponentSocket.emit('opponent_resigned', { gameId });
        }
        
        // Acknowledge resignation
        socket.emit('resignation_confirmed', { gameId });
        
        // Update ratings
        await updateRatings(winner, userId);
      } catch (error) {
        console.error('Error in resign_game:', error);
        socket.emit('error', { message: 'Failed to resign game' });
      }
    });
    
    // Handle game completion
    socket.on('game_over', async (data) => {
      try {
        const { gameId, result } = data;
        const userId = socket.user._id.toString();
        
        const gameData = activeGames.get(gameId);
        if (!gameData) {
          return socket.emit('error', { message: 'Game not found' });
        }
        
        // Check if user is a participant
        if (gameData.white !== userId && gameData.black !== userId) {
          return socket.emit('error', { message: 'You are not a participant in this game' });
        }
        
        // Determine winner based on result
        let winner;
        if (result === 'white') {
          winner = gameData.white;
        } else if (result === 'black') {
          winner = gameData.black;
        } else {
          winner = null; // Draw
        }
        
        // Update game in database
        await Game.findByIdAndUpdate(gameId, {
          status: 'completed',
          result: result,
          winner: winner
        });
        
        // Remove from active games
        activeGames.delete(gameId);
        
        // Notify opponent
        const opponentId = gameData.white === userId ? gameData.black : gameData.white;
        const opponentSocket = userSockets.get(opponentId);
        
        if (opponentSocket) {
          opponentSocket.emit('game_ended', { gameId, result });
        }
        
        // Acknowledge game over
        socket.emit('game_end_confirmed', { gameId, result });
        
        // Update ratings if not a draw
        if (winner) {
          const loser = winner === gameData.white ? gameData.black : gameData.white;
          await updateRatings(winner, loser);
        }
      } catch (error) {
        console.error('Error in game_over:', error);
        socket.emit('error', { message: 'Failed to end game' });
      }
    });
    
    // Handle reconnection to game
    socket.on('reconnect_game', async (data) => {
      try {
        const { gameId } = data;
        const userId = socket.user._id.toString();
        
        // Check if game is in active games
        let gameData = activeGames.get(gameId);
        
        if (!gameData) {
          // Try to load from database
          const game = await Game.findById(gameId);
          
          if (!game) {
            return socket.emit('error', { message: 'Game not found' });
          }
          
          // Check if user is a participant
          if (game.white.toString() !== userId && game.black.toString() !== userId) {
            return socket.emit('error', { message: 'You are not a participant in this game' });
          }
          
          // Check if game is still active
          if (game.status !== 'active') {
            return socket.emit('error', { message: 'Game is already completed' });
          }
          
          // Add to active games
          gameData = {
            gameId: game._id.toString(),
            white: game.white.toString(),
            black: game.black.toString(),
            level: game.level,
            moves: game.moves,
            lastMoveTime: Date.now()
          };
          
          activeGames.set(gameId, gameData);
        } else {
          // Check if user is a participant
          if (gameData.white !== userId && gameData.black !== userId) {
            return socket.emit('error', { message: 'You are not a participant in this game' });
          }
        }
        
        // Get opponent
        const opponentId = gameData.white === userId ? gameData.black : gameData.white;
        const opponent = await User.findById(opponentId).select('username rating');
        
        // Send game state to user
        socket.emit('game_reconnected', {
          gameId,
          color: gameData.white === userId ? 'white' : 'black',
          opponent: {
            id: opponent._id,
            username: opponent.username,
            rating: opponent.rating
          },
          moves: gameData.moves
        });
        
        // Notify opponent
        const opponentSocket = userSockets.get(opponentId);
        if (opponentSocket) {
          opponentSocket.emit('opponent_reconnected', { gameId });
        }
      } catch (error) {
        console.error('Error in reconnect_game:', error);
        socket.emit('error', { message: 'Failed to reconnect to game' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.user._id})`);
      
      const userId = socket.user._id.toString();
      
      // Remove from waiting players
      if (waitingPlayers.has(userId)) {
        waitingPlayers.delete(userId);
      }
      
      // Remove from user sockets after a delay to allow for reconnection
      setTimeout(() => {
        // Only remove if this was the last socket for this user
        if (userSockets.get(userId) === socket) {
          userSockets.delete(userId);
        }
      }, 30000); // 30 second grace period for reconnection
    });
  });
  
  // Cleanup inactive games periodically
  setInterval(() => {
    const now = Date.now();
    for (const [gameId, gameData] of activeGames.entries()) {
      // If no move for 30 minutes, consider game abandoned
      if (now - gameData.lastMoveTime > 30 * 60 * 1000) {
        Game.findByIdAndUpdate(gameId, {
          status: 'abandoned'
        }).catch(err => console.error('Error updating abandoned game:', err));
        
        activeGames.delete(gameId);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
  
  return io;
};

// Helper function to update ratings
async function updateRatings(winnerId, loserId) {
  try {
    const winner = await User.findById(winnerId);
    const loser = await User.findById(loserId);
    
    if (!winner || !loser) return;
    
    // Simple ELO-like rating adjustment
    const kFactor = 32;
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));
    
    const newWinnerRating = Math.round(winner.rating + kFactor * (1 - expectedWinner));
    const newLoserRating = Math.round(loser.rating + kFactor * (0 - expectedLoser));
    
    // Update ratings
    await User.findByIdAndUpdate(winnerId, { rating: newWinnerRating });
    await User.findByIdAndUpdate(loserId, { rating: newLoserRating });
  } catch (error) {
    console.error('Error updating ratings:', error);
  }
} 