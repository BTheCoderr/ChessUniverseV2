const socketIO = require('socket.io');
const { Game, User } = require('../models');
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');

let io;
const userSockets = new Map(); // Map user IDs to socket IDs
const gameRooms = new Map(); // Map game IDs to game state

// Initialize socket server
const initializeSocket = (server, sessionMiddleware, sessionStore) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
  // Setup authentication for sockets
  io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'connect.sid', // the name of the cookie where express/connect stores its session id
    secret: process.env.SESSION_SECRET || 'chess-app-secret',
    store: sessionStore,
    success: (data, accept) => {
      console.log('Socket.io auth success');
      accept(null, true);
    },
    fail: (data, message, error, accept) => {
      console.log('Socket.io auth fail:', message);
      // Accept the connection but mark as unauthenticated
      accept(null, true);
    }
  }));
  
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    const userId = socket.request.user?._id?.toString();
    
    if (userId) {
      // Store the mapping of user to socket
      userSockets.set(userId, socket.id);
      
      // Update user's online status
      User.findByIdAndUpdate(userId, { isOnline: true }).catch(err => 
        console.error('Error updating online status:', err)
      );
      
      // Join user's personal room for direct messages
      socket.join(`user:${userId}`);
      
      // Notify friends that user is online
      notifyFriendsOfStatus(userId, true);
    }
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      if (userId) {
        // Remove from mapping
        userSockets.delete(userId);
        
        // Update user's online status after a short delay
        // (to handle reconnects)
        setTimeout(async () => {
          const userSocketId = userSockets.get(userId);
          if (!userSocketId) {
            await User.findByIdAndUpdate(userId, { 
              isOnline: false,
              lastLogin: new Date()
            });
            
            // Notify friends that user is offline
            notifyFriendsOfStatus(userId, false);
          }
        }, 5000);
      }
    });
    
    // Handle joining a game room
    socket.on('join-game', async ({ gameId }) => {
      try {
        // Fetch the game from DB
        const game = await Game.findById(gameId)
          .populate('white.player', 'username rating profile')
          .populate('black.player', 'username rating profile');
        
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }
        
        // Join the game room
        socket.join(`game:${gameId}`);
        
        // Add game to active games if not already there
        if (!gameRooms.has(gameId)) {
          gameRooms.set(gameId, {
            gameId,
            lastActivity: new Date(),
            spectatorCount: 0
          });
        }
        
        // Check if user is a player or spectator
        const isWhitePlayer = userId && game.white.player._id.toString() === userId;
        const isBlackPlayer = userId && game.black.player._id.toString() === userId;
        
        if (isWhitePlayer || isBlackPlayer) {
          socket.emit('game-joined', { 
            game,
            role: isWhitePlayer ? 'white' : 'black' 
          });
          
          // If game is pending, update to active when both players join
          if (game.status === 'pending') {
            const whiteSocketId = userSockets.get(game.white.player._id.toString());
            const blackSocketId = userSockets.get(game.black.player._id.toString());
            
            if (whiteSocketId && blackSocketId) {
              await Game.findByIdAndUpdate(gameId, { 
                status: 'active',
                startTime: new Date()
              });
              
              // Notify both players
              io.to(`game:${gameId}`).emit('game-started', {
                message: 'Both players have joined. Game is now active!',
                startTime: new Date()
              });
            }
          }
        } else {
          // User is a spectator
          socket.emit('game-joined', { game, role: 'spectator' });
          
          // Update spectator count
          const gameRoom = gameRooms.get(gameId);
          if (gameRoom) {
            gameRoom.spectatorCount++;
            io.to(`game:${gameId}`).emit('spectator-count', { 
              count: gameRoom.spectatorCount 
            });
          }
        }
      } catch (err) {
        console.error('Error joining game:', err);
        socket.emit('game-error', { message: 'Failed to join game' });
      }
    });
    
    // Handle leaving a game room
    socket.on('leave-game', ({ gameId }) => {
      socket.leave(`game:${gameId}`);
      
      // Update spectator count if not a player
      const gameRoom = gameRooms.get(gameId);
      if (gameRoom && !isPlayerInGame(userId, gameId)) {
        gameRoom.spectatorCount = Math.max(0, gameRoom.spectatorCount - 1);
        io.to(`game:${gameId}`).emit('spectator-count', { 
          count: gameRoom.spectatorCount 
        });
      }
    });
    
    // Handle chess moves
    socket.on('make-move', async ({ gameId, move }) => {
      try {
        const game = await Game.findById(gameId);
        
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }
        
        // Verify user is allowed to make the move
        const isWhitePlayer = userId && game.white.player.toString() === userId;
        const isBlackPlayer = userId && game.black.player.toString() === userId;
        
        if (!isWhitePlayer && !isBlackPlayer) {
          socket.emit('game-error', { message: 'You are not a player in this game' });
          return;
        }
        
        // Determine if it's the player's turn
        const isWhiteTurn = game.moves.length % 2 === 0; // Even moves = white's turn
        
        if ((isWhiteTurn && !isWhitePlayer) || (!isWhiteTurn && !isBlackPlayer)) {
          socket.emit('game-error', { message: 'Not your turn' });
          return;
        }
        
        // Add the move
        const moveTime = new Date();
        const timeSpent = calculateTimeSpent(game, isWhiteTurn, moveTime);
        
        // Update remaining time
        if (isWhiteTurn) {
          game.white.timeRemaining -= timeSpent;
          // Add increment if not the first move
          if (game.moves.length > 0) {
            game.white.timeRemaining += game.increment;
          }
        } else {
          game.black.timeRemaining -= timeSpent;
          // Add increment if not the first move
          if (game.moves.length > 0) {
            game.black.timeRemaining += game.increment;
          }
        }
        
        // Add move to the game
        game.moves.push({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          fen: move.fen,
          timestamp: moveTime,
          timeSpent
        });
        
        // Update the current position
        game.fen = move.fen;
        
        // Check for game end conditions
        if (move.isCheckmate) {
          game.status = 'completed';
          game.winner = isWhiteTurn ? 'white' : 'black';
          game.endTime = new Date();
        } else if (move.isDraw) {
          game.status = 'draw';
          game.winner = 'draw';
          game.endTime = new Date();
        }
        
        // Save the game
        await game.save();
        
        // Broadcast the move to all clients in the game room
        io.to(`game:${gameId}`).emit('move-made', {
          move,
          moveNumber: game.moves.length,
          whiteClock: game.white.timeRemaining,
          blackClock: game.black.timeRemaining,
          gameStatus: game.status,
          winner: game.winner
        });
        
        // If game ended, handle end of game logic
        if (game.status === 'completed' || game.status === 'draw') {
          handleGameEnd(game);
        }
      } catch (err) {
        console.error('Error making move:', err);
        socket.emit('game-error', { message: 'Failed to make move' });
      }
    });
    
    // Handle resignation
    socket.on('resign', async ({ gameId }) => {
      try {
        const game = await Game.findById(gameId);
        
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }
        
        // Verify user is a player
        const isWhitePlayer = userId && game.white.player.toString() === userId;
        const isBlackPlayer = userId && game.black.player.toString() === userId;
        
        if (!isWhitePlayer && !isBlackPlayer) {
          socket.emit('game-error', { message: 'You are not a player in this game' });
          return;
        }
        
        // Update game status
        game.status = 'completed';
        game.winner = isWhitePlayer ? 'black' : 'white'; // The other player wins
        game.endTime = new Date();
        game.resignation = {
          player: isWhitePlayer ? 'white' : 'black',
          timestamp: new Date()
        };
        
        await game.save();
        
        // Broadcast the resignation
        io.to(`game:${gameId}`).emit('player-resigned', {
          player: isWhitePlayer ? 'white' : 'black',
          gameStatus: 'completed',
          winner: isWhitePlayer ? 'black' : 'white'
        });
        
        // Handle end of game
        handleGameEnd(game);
      } catch (err) {
        console.error('Error handling resignation:', err);
        socket.emit('game-error', { message: 'Failed to resign' });
      }
    });
    
    // Handle draw offer
    socket.on('offer-draw', async ({ gameId }) => {
      try {
        const game = await Game.findById(gameId);
        
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }
        
        // Verify user is a player
        const isWhitePlayer = userId && game.white.player.toString() === userId;
        const isBlackPlayer = userId && game.black.player.toString() === userId;
        
        if (!isWhitePlayer && !isBlackPlayer) {
          socket.emit('game-error', { message: 'You are not a player in this game' });
          return;
        }
        
        // Set draw offer
        game.drawOfferedBy = isWhitePlayer ? 'white' : 'black';
        await game.save();
        
        // Notify opponent
        const opponentId = isWhitePlayer ? 
          game.black.player.toString() : 
          game.white.player.toString();
        
        io.to(`game:${gameId}`).emit('draw-offered', {
          offeredBy: isWhitePlayer ? 'white' : 'black'
        });
      } catch (err) {
        console.error('Error offering draw:', err);
        socket.emit('game-error', { message: 'Failed to offer draw' });
      }
    });
    
    // Handle draw response
    socket.on('respond-to-draw', async ({ gameId, accept }) => {
      try {
        const game = await Game.findById(gameId);
        
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }
        
        // Verify user is a player
        const isWhitePlayer = userId && game.white.player.toString() === userId;
        const isBlackPlayer = userId && game.black.player.toString() === userId;
        
        if (!isWhitePlayer && !isBlackPlayer) {
          socket.emit('game-error', { message: 'You are not a player in this game' });
          return;
        }
        
        // Verify there is a draw offer and it's not from the current user
        const playerColor = isWhitePlayer ? 'white' : 'black';
        if (game.drawOfferedBy === null || game.drawOfferedBy === playerColor) {
          socket.emit('game-error', { message: 'No valid draw offer' });
          return;
        }
        
        if (accept) {
          // Accept draw
          game.status = 'draw';
          game.winner = 'draw';
          game.endTime = new Date();
          
          await game.save();
          
          // Broadcast the draw
          io.to(`game:${gameId}`).emit('draw-accepted', {
            gameStatus: 'draw'
          });
          
          // Handle end of game
          handleGameEnd(game);
        } else {
          // Decline draw
          game.drawOfferedBy = null;
          await game.save();
          
          // Broadcast the declined draw
          io.to(`game:${gameId}`).emit('draw-declined', {
            declinedBy: playerColor
          });
        }
      } catch (err) {
        console.error('Error handling draw response:', err);
        socket.emit('game-error', { message: 'Failed to respond to draw' });
      }
    });
    
    // Handle game chat
    socket.on('send-chat', async ({ gameId, message }) => {
      if (!userId) {
        socket.emit('game-error', { message: 'You must be logged in to chat' });
        return;
      }
      
      try {
        const user = await User.findById(userId);
        
        if (!user) {
          socket.emit('game-error', { message: 'User not found' });
          return;
        }
        
        const game = await Game.findById(gameId);
        
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }
        
        // Add chat message to game
        game.chat.push({
          user: userId,
          message,
          timestamp: new Date()
        });
        
        await game.save();
        
        // Broadcast the message
        io.to(`game:${gameId}`).emit('chat-message', {
          userId,
          username: user.username,
          message,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Error sending chat message:', err);
        socket.emit('game-error', { message: 'Failed to send message' });
      }
    });
    
    // Handle spectator bet
    socket.on('place-spectator-bet', async ({ gameId, amount, onPlayer }) => {
      if (!userId) {
        socket.emit('game-error', { message: 'You must be logged in to place a bet' });
        return;
      }
      
      try {
        const user = await User.findById(userId);
        const game = await Game.findById(gameId);
        
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }
        
        // Check if game is in a valid state for betting
        if (game.status !== 'pending' && game.status !== 'active') {
          socket.emit('game-error', { message: 'Betting is only allowed before or during a game' });
          return;
        }
        
        // Verify user is not a player
        const isWhitePlayer = game.white.player.toString() === userId;
        const isBlackPlayer = game.black.player.toString() === userId;
        
        if (isWhitePlayer || isBlackPlayer) {
          socket.emit('game-error', { message: 'Players cannot place spectator bets' });
          return;
        }
        
        // Check if user has enough balance
        if (user.balance < amount) {
          socket.emit('game-error', { message: 'Insufficient balance' });
          return;
        }
        
        // Check if user has already bet on this game
        const existingBetIndex = game.spectators.findIndex(s => 
          s.user.toString() === userId
        );
        
        if (existingBetIndex >= 0) {
          socket.emit('game-error', { message: 'You have already placed a bet on this game' });
          return;
        }
        
        // Add spectator bet
        game.spectators.push({
          user: userId,
          bet: {
            amount,
            onPlayer,
            timestamp: new Date()
          }
        });
        
        // Deduct from user balance
        user.balance -= amount;
        
        // Save both documents
        await Promise.all([game.save(), user.save()]);
        
        // Notify the spectator
        socket.emit('bet-placed', {
          success: true,
          amount,
          onPlayer,
          remainingBalance: user.balance
        });
        
        // Broadcast the updated spectator bet totals
        const whiteBets = game.spectators
          .filter(s => s.bet.onPlayer === 'white')
          .reduce((sum, s) => sum + s.bet.amount, 0);
        
        const blackBets = game.spectators
          .filter(s => s.bet.onPlayer === 'black')
          .reduce((sum, s) => sum + s.bet.amount, 0);
        
        io.to(`game:${gameId}`).emit('spectator-bets-updated', {
          whiteBets,
          blackBets,
          totalSpectators: game.spectators.length
        });
      } catch (err) {
        console.error('Error placing spectator bet:', err);
        socket.emit('game-error', { message: 'Failed to place bet' });
      }
    });
  });
  
  // Periodically clean up inactive game rooms
  setInterval(() => {
    const now = new Date();
    
    for (const [gameId, roomData] of gameRooms) {
      // If no activity for 1 hour, remove from active games
      if (now - roomData.lastActivity > 60 * 60 * 1000) {
        gameRooms.delete(gameId);
      }
    }
  }, 15 * 60 * 1000); // Run every 15 minutes
  
  return io;
};

// Helper function to calculate time spent on a move
function calculateTimeSpent(game, isWhiteTurn, currentTime) {
  if (game.moves.length === 0) {
    return 0; // First move
  }
  
  const lastMoveTime = game.moves[game.moves.length - 1].timestamp;
  return Math.floor((currentTime - lastMoveTime) / 1000); // Time in seconds
}

// Helper function to check if a user is a player in a game
async function isPlayerInGame(userId, gameId) {
  if (!userId) return false;
  
  try {
    const game = await Game.findById(gameId);
    
    if (!game) return false;
    
    return (
      game.white.player.toString() === userId ||
      game.black.player.toString() === userId
    );
  } catch (err) {
    console.error('Error checking if player is in game:', err);
    return false;
  }
}

// Helper function to notify friends of a user's status change
async function notifyFriendsOfStatus(userId, isOnline) {
  try {
    const user = await User.findById(userId);
    
    if (!user) return;
    
    // Get all accepted friends
    const friendsIds = user.friends
      .filter(f => f.status === 'accepted')
      .map(f => f.userId.toString());
    
    // Notify each online friend
    for (const friendId of friendsIds) {
      const friendSocketId = userSockets.get(friendId);
      
      if (friendSocketId) {
        io.to(friendSocketId).emit('friend-status-changed', {
          friendId: userId,
          friendUsername: user.username,
          isOnline
        });
      }
    }
  } catch (err) {
    console.error('Error notifying friends of status change:', err);
  }
}

// Handle end of game logic
async function handleGameEnd(game) {
  try {
    // Update player ratings and stats if rated game
    if (game.isRated) {
      const whitePlayer = await User.findById(game.white.player);
      const blackPlayer = await User.findById(game.black.player);
      
      if (whitePlayer && blackPlayer) {
        let whiteResult, blackResult;
        
        if (game.winner === 'white') {
          whiteResult = 'win';
          blackResult = 'loss';
          whitePlayer.stats.wins++;
          blackPlayer.stats.losses++;
        } else if (game.winner === 'black') {
          whiteResult = 'loss';
          blackResult = 'win';
          whitePlayer.stats.losses++;
          blackPlayer.stats.wins++;
        } else {
          whiteResult = blackResult = 'draw';
          whitePlayer.stats.draws++;
          blackPlayer.stats.draws++;
        }
        
        // Update ratings
        const whiteRatingChange = whitePlayer.updateRating(blackPlayer, whiteResult);
        const blackRatingChange = blackPlayer.updateRating(whitePlayer, blackResult);
        
        // Save updated players
        await Promise.all([whitePlayer.save(), blackPlayer.save()]);
        
        // Notify players of rating changes
        const whiteSocketId = userSockets.get(game.white.player.toString());
        const blackSocketId = userSockets.get(game.black.player.toString());
        
        if (whiteSocketId) {
          io.to(whiteSocketId).emit('rating-updated', whiteRatingChange);
        }
        
        if (blackSocketId) {
          io.to(blackSocketId).emit('rating-updated', blackRatingChange);
        }
      }
    }
    
    // Handle bet distribution
    if (game.status === 'completed') {
      await game.distributeWinnings();
    } else if (game.status === 'draw') {
      await game.handleDraw();
    }
    
    // If part of a tournament, update tournament
    if (game.tournamentId) {
      // Tournament logic would be added here
    }
    
    // Notify game room of game end details
    io.to(`game:${game.id}`).emit('game-ended', {
      gameId: game.id,
      status: game.status,
      winner: game.winner,
      endTime: game.endTime
    });
  } catch (err) {
    console.error('Error handling game end:', err);
  }
}

// Export socket functions
module.exports = {
  initializeSocket,
  getIO: () => io,
  getUserSocket: (userId) => userSockets.get(userId),
  isUserOnline: (userId) => userSockets.has(userId)
}; 