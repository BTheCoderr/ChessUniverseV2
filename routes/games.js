const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Game, User } = require('../models');
const { isAuthenticated, hasEnoughBalance } = require('../middleware/auth');

// Apply authentication middleware to all games routes
router.use(isAuthenticated);

// @route   GET /api/games
// @desc    Get all games for the current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get query parameters for pagination and filtering
    const { status, limit = 10, skip = 0 } = req.query;
    
    // Build query
    const query = {
      $or: [
        { 'white.player': userId },
        { 'black.player': userId }
      ]
    };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Find games and sort by creation date (newest first)
    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('white.player', 'username rating profile')
      .populate('black.player', 'username rating profile');
    
    // Get total count for pagination
    const total = await Game.countDocuments(query);
    
    res.json({
      success: true,
      games,
      pagination: {
        total,
        limit: Number(limit),
        skip: Number(skip),
        hasMore: total > Number(skip) + Number(limit)
      }
    });
  } catch (err) {
    console.error('Error fetching games:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching games',
      error: err.message
    });
  }
});

// @route   GET /api/games/:id
// @desc    Get a specific game by ID
router.get('/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game ID format'
      });
    }
    
    // Find the game
    const game = await Game.findById(gameId)
      .populate('white.player', 'username rating profile')
      .populate('black.player', 'username rating profile')
      .populate({
        path: 'spectators.user',
        select: 'username profile'
      });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    res.json({
      success: true,
      game
    });
  } catch (err) {
    console.error('Error fetching game:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching game',
      error: err.message
    });
  }
});

// @route   POST /api/games
// @desc    Create a new game
router.post('/', async (req, res) => {
  try {
    const { variant, timeControl, increment, isRated, opponentId, bet = 0 } = req.body;
    
    // Validate input
    if (!timeControl) {
      return res.status(400).json({
        success: false,
        message: 'Time control is required'
      });
    }
    
    // Check if user has enough balance for bet
    if (bet > 0 && req.user.balance < bet) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance for bet. You have ${req.user.balance} coins, bet requires ${bet} coins.`
      });
    }
    
    // Check if opponent exists if specified
    let opponent;
    if (opponentId) {
      if (!mongoose.Types.ObjectId.isValid(opponentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid opponent ID format'
        });
      }
      
      opponent = await User.findById(opponentId);
      if (!opponent) {
        return res.status(404).json({
          success: false,
          message: 'Opponent not found'
        });
      }
    }
    
    // Randomly determine if the current user is white or black
    const userIsWhite = Math.random() > 0.5;
    
    // Create the game
    const newGame = new Game({
      white: {
        player: userIsWhite ? req.user._id : opponentId,
        rating: userIsWhite ? req.user.rating : (opponent ? opponent.rating : 1200),
        bet: userIsWhite ? bet : 0
      },
      black: {
        player: userIsWhite ? opponentId : req.user._id,
        rating: userIsWhite ? (opponent ? opponent.rating : 1200) : req.user.rating,
        bet: userIsWhite ? 0 : bet
      },
      variant: variant || 'traditional',
      timeControl: Number(timeControl),
      increment: increment ? Number(increment) : 0,
      isRated: Boolean(isRated)
    });
    
    // Deduct bet amount from user's balance
    if (bet > 0) {
      req.user.balance -= bet;
      await req.user.save();
    }
    
    await newGame.save();
    
    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      game: newGame
    });
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({
      success: false,
      message: 'Server error creating game',
      error: err.message
    });
  }
});

// @route   POST /api/games/:id/move
// @desc    Make a move in a game
router.post('/:id/move', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { move } = req.body;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game ID format'
      });
    }
    
    // Validate move data
    if (!move || !move.from || !move.to) {
      return res.status(400).json({
        success: false,
        message: 'Invalid move data'
      });
    }
    
    // Find the game
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if user is a player in the game
    const isWhitePlayer = game.white.player.toString() === req.user._id.toString();
    const isBlackPlayer = game.black.player.toString() === req.user._id.toString();
    
    if (!isWhitePlayer && !isBlackPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You are not a player in this game'
      });
    }
    
    // Check if it's the user's turn
    const isWhiteTurn = game.moves.length % 2 === 0;
    if ((isWhiteTurn && !isWhitePlayer) || (!isWhiteTurn && !isBlackPlayer)) {
      return res.status(400).json({
        success: false,
        message: 'Not your turn'
      });
    }
    
    // Check if game is active
    if (game.status !== 'active' && game.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }
    
    // If this is the first move and game is pending, set it to active
    if (game.status === 'pending') {
      game.status = 'active';
      game.startTime = new Date();
    }
    
    // Record the move
    const moveTime = new Date();
    
    // Note: In a real implementation, we'd validate the move using a chess engine
    // Here we just trust the client's move data
    game.moves.push({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      fen: move.fen,
      timestamp: moveTime
    });
    
    // Update the current position
    game.fen = move.fen;
    
    // Check for game end conditions
    if (move.isCheckmate) {
      game.status = 'completed';
      game.winner = isWhitePlayer ? 'white' : 'black';
      game.endTime = new Date();
      
      // Update player statistics
      await updatePlayerStats(
        game.white.player,
        game.black.player,
        game.winner,
        game.isRated
      );
      
      // Handle betting payouts
      if (game.white.bet > 0 || game.black.bet > 0) {
        await game.distributeWinnings();
      }
    } else if (move.isDraw) {
      game.status = 'draw';
      game.winner = 'draw';
      game.endTime = new Date();
      
      // Handle draw betting refunds
      if (game.white.bet > 0 || game.black.bet > 0) {
        await game.handleDraw();
      }
    }
    
    await game.save();
    
    res.json({
      success: true,
      message: 'Move recorded successfully',
      game
    });
  } catch (err) {
    console.error('Error making move:', err);
    res.status(500).json({
      success: false,
      message: 'Server error making move',
      error: err.message
    });
  }
});

// @route   POST /api/games/:id/resign
// @desc    Resign from a game
router.post('/:id/resign', async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game ID format'
      });
    }
    
    // Find the game
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if user is a player in the game
    const isWhitePlayer = game.white.player.toString() === req.user._id.toString();
    const isBlackPlayer = game.black.player.toString() === req.user._id.toString();
    
    if (!isWhitePlayer && !isBlackPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You are not a player in this game'
      });
    }
    
    // Check if game is active
    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }
    
    // Set resignation info
    game.status = 'completed';
    game.winner = isWhitePlayer ? 'black' : 'white';
    game.endTime = new Date();
    game.resignation = {
      player: isWhitePlayer ? 'white' : 'black',
      timestamp: new Date()
    };
    
    // Update player statistics
    await updatePlayerStats(
      game.white.player,
      game.black.player,
      game.winner,
      game.isRated
    );
    
    // Handle betting payouts
    if (game.white.bet > 0 || game.black.bet > 0) {
      await game.distributeWinnings();
    }
    
    await game.save();
    
    res.json({
      success: true,
      message: 'Game resigned successfully',
      game
    });
  } catch (err) {
    console.error('Error resigning game:', err);
    res.status(500).json({
      success: false,
      message: 'Server error resigning game',
      error: err.message
    });
  }
});

// @route   POST /api/games/:id/offer-draw
// @desc    Offer or accept a draw
router.post('/:id/offer-draw', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { accept } = req.body;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game ID format'
      });
    }
    
    // Find the game
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if user is a player in the game
    const isWhitePlayer = game.white.player.toString() === req.user._id.toString();
    const isBlackPlayer = game.black.player.toString() === req.user._id.toString();
    
    if (!isWhitePlayer && !isBlackPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You are not a player in this game'
      });
    }
    
    // Check if game is active
    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }
    
    // For simplicity in this demo, we'll just accept all draw offers automatically
    // In a real app, you would track the offer and wait for the opponent to accept
    game.status = 'draw';
    game.winner = 'draw';
    game.endTime = new Date();
    
    // Handle draw betting refunds
    if (game.white.bet > 0 || game.black.bet > 0) {
      await game.handleDraw();
    }
    
    // Update player statistics
    if (game.isRated) {
      const whitePlayer = await User.findById(game.white.player);
      const blackPlayer = await User.findById(game.black.player);
      
      if (whitePlayer && blackPlayer) {
        whitePlayer.stats.draws++;
        blackPlayer.stats.draws++;
        
        // Update ELO ratings for draw
        whitePlayer.updateRating(blackPlayer, 'draw');
        blackPlayer.updateRating(whitePlayer, 'draw');
        
        await Promise.all([whitePlayer.save(), blackPlayer.save()]);
      }
    }
    
    await game.save();
    
    res.json({
      success: true,
      message: 'Draw agreed',
      game
    });
  } catch (err) {
    console.error('Error handling draw offer:', err);
    res.status(500).json({
      success: false,
      message: 'Server error handling draw offer',
      error: err.message
    });
  }
});

// @route   POST /api/games/:id/spectator-bet
// @desc    Place a spectator bet on a game
router.post('/:id/spectator-bet', hasEnoughBalance(0), async (req, res) => {
  try {
    const gameId = req.params.id;
    const { amount, onPlayer } = req.body;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game ID format'
      });
    }
    
    // Validate bet data
    if (!amount || !onPlayer || !['white', 'black'].includes(onPlayer)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bet data. Provide amount and onPlayer (white/black).'
      });
    }
    
    const betAmount = Number(amount);
    
    // Validate bet amount
    if (isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bet amount must be a positive number'
      });
    }
    
    // Check if user has enough balance
    if (req.user.balance < betAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance for bet. You have ${req.user.balance} coins, bet requires ${betAmount} coins.`
      });
    }
    
    // Find the game
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if game is in a valid state for betting
    if (game.status !== 'pending' && game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Betting is only allowed before or during a game'
      });
    }
    
    // Ensure user is not a player in the game
    const isWhitePlayer = game.white.player.toString() === req.user._id.toString();
    const isBlackPlayer = game.black.player.toString() === req.user._id.toString();
    
    if (isWhitePlayer || isBlackPlayer) {
      return res.status(400).json({
        success: false,
        message: 'Players cannot place spectator bets on their own games'
      });
    }
    
    // Check if user has already bet on this game
    const existingBet = game.spectators.find(
      s => s.user.toString() === req.user._id.toString()
    );
    
    if (existingBet) {
      return res.status(400).json({
        success: false,
        message: 'You have already placed a bet on this game'
      });
    }
    
    // Add spectator bet
    game.spectators.push({
      user: req.user._id,
      bet: {
        amount: betAmount,
        onPlayer,
        timestamp: new Date()
      }
    });
    
    // Deduct bet from user's balance
    req.user.balance -= betAmount;
    
    // Save both documents
    await Promise.all([game.save(), req.user.save()]);
    
    res.json({
      success: true,
      message: 'Bet placed successfully',
      betAmount,
      onPlayer,
      remainingBalance: req.user.balance
    });
  } catch (err) {
    console.error('Error placing spectator bet:', err);
    res.status(500).json({
      success: false,
      message: 'Server error placing spectator bet',
      error: err.message
    });
  }
});

// Helper function to update player statistics
async function updatePlayerStats(whitePlayerId, blackPlayerId, winner, isRated) {
  if (!isRated) return;
  
  try {
    const whitePlayer = await User.findById(whitePlayerId);
    const blackPlayer = await User.findById(blackPlayerId);
    
    if (!whitePlayer || !blackPlayer) return;
    
    if (winner === 'white') {
      // White wins
      whitePlayer.stats.wins++;
      blackPlayer.stats.losses++;
      
      // Update ELO ratings
      whitePlayer.updateRating(blackPlayer, 'win');
      blackPlayer.updateRating(whitePlayer, 'loss');
    } else if (winner === 'black') {
      // Black wins
      blackPlayer.stats.wins++;
      whitePlayer.stats.losses++;
      
      // Update ELO ratings
      blackPlayer.updateRating(whitePlayer, 'win');
      whitePlayer.updateRating(blackPlayer, 'loss');
    } else {
      // Draw
      whitePlayer.stats.draws++;
      blackPlayer.stats.draws++;
      
      // Update ELO ratings for draw
      whitePlayer.updateRating(blackPlayer, 'draw');
      blackPlayer.updateRating(whitePlayer, 'draw');
    }
    
    await Promise.all([whitePlayer.save(), blackPlayer.save()]);
  } catch (err) {
    console.error('Error updating player stats:', err);
  }
}

module.exports = router; 