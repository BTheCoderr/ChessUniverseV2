const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  whitePlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blackPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAIOpponent: {
    type: Boolean,
    default: false
  },
  aiDifficulty: {
    type: Number,
    min: 1,
    max: 20,
    default: 10
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'aborted'],
    default: 'pending'
  },
  result: {
    type: String,
    enum: ['white', 'black', 'draw', 'pending'],
    default: 'pending'
  },
  pgn: {
    type: String,
    default: ''
  },
  fen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Starting position
  },
  moves: [{
    from: String,
    to: String,
    promotion: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  betAmount: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Game', GameSchema); 