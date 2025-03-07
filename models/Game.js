const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  whitePlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isAIOpponent || this.whiteIsAI === false;
    }
  },
  blackPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isAIOpponent || this.blackIsAI === false;
    }
  },
  isAIOpponent: {
    type: Boolean,
    default: false
  },
  whiteIsAI: {
    type: Boolean,
    default: false
  },
  blackIsAI: {
    type: Boolean,
    default: false
  },
  aiDifficulty: {
    type: Number,
    min: 1,
    max: 20,
    default: 10
  },
  // Chess Universe game variant
  gameVariant: {
    type: String,
    enum: ['traditional', 'level2', 'level3', 'level4', 'battleChess', 'customSetup'],
    default: 'traditional'
  },
  // Custom piece setup (for customSetup variant)
  customSetup: {
    white: {
      type: Map,
      of: {
        type: String,
        piece: String,
        level: Number
      }
    },
    black: {
      type: Map,
      of: {
        type: String,
        piece: String,
        level: Number
      }
    }
  },
  // For Battle Chess mode
  isBattleChess: {
    type: Boolean,
    default: false
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
  currentFen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1' // Starting position with Black to move first
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
  // House fee (10% of bet)
  houseFee: {
    type: Number,
    default: 0
  },
  // Flag to indicate if bets have been settled
  betsSettled: {
    type: Boolean,
    default: false
  },
  // Spectator bets
  spectatorBets: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    predictedWinner: {
      type: String,
      enum: ['white', 'black']
    },
    settled: {
      type: Boolean,
      default: false
    }
  }],
  // Tournament info (if part of a tournament)
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  tournamentRound: {
    type: Number
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