const express = require('express');
const { Chess } = require('chess.js');
const Game = require('../models/Game');
const User = require('../models/User');

const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// Create a new game
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { opponentId, isAIOpponent, aiDifficulty } = req.body;
    
    // Validate opponent
    let opponent;
    if (!isAIOpponent) {
      if (!opponentId) {
        return res.status(400).json({ message: 'Opponent ID is required for human games' });
      }
      
      opponent = await User.findById(opponentId);
      if (!opponent) {
        return res.status(404).json({ message: 'Opponent not found' });
      }
    }
    
    // Randomly assign colors
    const isWhite = Math.random() >= 0.5;
    
    // Create new game
    const newGame = new Game({
      whitePlayer: isWhite ? req.user._id : (isAIOpponent ? null : opponent._id),
      blackPlayer: isWhite ? (isAIOpponent ? null : opponent._id) : req.user._id,
      isAIOpponent,
      aiDifficulty: isAIOpponent ? (aiDifficulty || 10) : undefined,
      status: 'pending'
    });
    
    await newGame.save();
    
    res.status(201).json({
      message: 'Game created successfully',
      game: {
        id: newGame._id,
        whitePlayer: newGame.whitePlayer,
        blackPlayer: newGame.blackPlayer,
        isAIOpponent: newGame.isAIOpponent,
        aiDifficulty: newGame.aiDifficulty,
        status: newGame.status
      }
    });
  } catch (error) {
    console.error('Game creation error:', error);
    res.status(500).json({ message: 'Server error during game creation' });
  }
});

// Get game by ID
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('whitePlayer', 'username')
      .populate('blackPlayer', 'username');
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    res.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start a game
router.post('/:id/start', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if user is a player in this game
    const isPlayer = 
      game.whitePlayer.equals(req.user._id) || 
      game.blackPlayer.equals(req.user._id);
    
    if (!isPlayer && !game.isAIOpponent) {
      return res.status(403).json({ message: 'You are not a player in this game' });
    }
    
    // Update game status
    game.status = 'active';
    game.startTime = new Date();
    
    await game.save();
    
    res.json({
      message: 'Game started',
      game: {
        id: game._id,
        status: game.status,
        startTime: game.startTime
      }
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's games
router.get('/user/games', isAuthenticated, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [
        { whitePlayer: req.user._id },
        { blackPlayer: req.user._id }
      ]
    })
      .populate('whitePlayer', 'username')
      .populate('blackPlayer', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ games });
  } catch (error) {
    console.error('Error fetching user games:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate a move
router.post('/:id/validate-move', isAuthenticated, async (req, res) => {
  try {
    const { from, to, promotion } = req.body;
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if user is a player whose turn it is
    const chess = new Chess(game.fen);
    const isWhiteTurn = chess.turn() === 'w';
    const isUsersTurn = 
      (isWhiteTurn && game.whitePlayer.equals(req.user._id)) ||
      (!isWhiteTurn && game.blackPlayer.equals(req.user._id));
    
    if (!isUsersTurn) {
      return res.status(403).json({ message: 'Not your turn' });
    }
    
    // Validate the move
    try {
      const move = chess.move({ from, to, promotion });
      
      if (move) {
        return res.json({
          valid: true,
          move,
          fen: chess.fen()
        });
      } else {
        return res.json({ valid: false });
      }
    } catch (error) {
      return res.json({ valid: false, error: error.message });
    }
  } catch (error) {
    console.error('Error validating move:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resign from a game
router.post('/:id/resign', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if user is a player in this game
    const isWhitePlayer = game.whitePlayer.equals(req.user._id);
    const isBlackPlayer = game.blackPlayer.equals(req.user._id);
    
    if (!isWhitePlayer && !isBlackPlayer) {
      return res.status(403).json({ message: 'You are not a player in this game' });
    }
    
    // Update game status
    game.status = 'completed';
    game.result = isWhitePlayer ? 'black' : 'white';
    game.endTime = new Date();
    
    await game.save();
    
    res.json({
      message: 'Game resigned',
      game: {
        id: game._id,
        status: game.status,
        result: game.result
      }
    });
  } catch (error) {
    console.error('Error resigning game:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 