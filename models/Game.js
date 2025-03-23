const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameSchema = new Schema({
  white: {
    player: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true
    },
    bet: {
      type: Number,
      default: 0
    },
    timeRemaining: {
      type: Number,
      default: function() {
        return this.timeControl * 60; // Convert minutes to seconds
      }
    }
  },
  black: {
    player: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number, 
      required: true
    },
    bet: {
      type: Number,
      default: 0
    },
    timeRemaining: {
      type: Number,
      default: function() {
        return this.timeControl * 60; // Convert minutes to seconds
      }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'draw'],
    default: 'pending'
  },
  winner: {
    type: String,
    enum: ['white', 'black', 'draw', null],
    default: null
  },
  pgn: {
    type: String,
    default: ''
  },
  fen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  moves: [{
    from: String,
    to: String,
    promotion: String,
    fen: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    timeSpent: Number // Time spent on the move in seconds
  }],
  chat: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  spectators: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    bet: {
      amount: Number,
      onPlayer: {
        type: String,
        enum: ['white', 'black']
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  }],
  variant: {
    type: String,
    enum: ['traditional', 'level2', 'level3', 'level4', 'battleChess', 'customSetup'],
    default: 'traditional'
  },
  timeControl: {
    type: Number, // Time in minutes (e.g., 5, 10, 15, 30)
    required: true,
    default: 10
  },
  increment: {
    type: Number, // Time increment in seconds
    default: 0
  },
  drawOfferedBy: {
    type: String,
    enum: ['white', 'black', null],
    default: null
  },
  isRated: {
    type: Boolean,
    default: true
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    default: null
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  resignation: {
    player: {
      type: String,
      enum: ['white', 'black', null],
      default: null
    },
    timestamp: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper method to calculate total bet amount
GameSchema.methods.calculateTotalBet = function() {
  return this.white.bet + this.black.bet;
};

// Helper method to get spectator bets total
GameSchema.methods.getSpectatorBetsTotal = function() {
  return this.spectators.reduce((total, spectator) => {
    return total + (spectator.bet?.amount || 0);
  }, 0);
};

// Helper method to distribute winnings for the game
GameSchema.methods.distributeWinnings = async function() {
  const User = mongoose.model('User');
  
  if (this.status !== 'completed' || !this.winner || this.winner === 'draw') {
    return false;
  }
  
  const winnerPlayerId = this.winner === 'white'
    ? this.white.player
    : this.black.player;
  
  const loserBet = this.winner === 'white'
    ? this.black.bet
    : this.white.bet;
    
  const winnerBet = this.winner === 'white'
    ? this.white.bet
    : this.black.bet;
  
  // Winners get their bet back plus the loser's bet
  const winnings = winnerBet + loserBet;
  
  // Update winner's balance
  await User.findByIdAndUpdate(
    winnerPlayerId,
    { $inc: { balance: winnings } }
  );
  
  // Process spectator bets
  const winningSpectators = this.spectators.filter(s => s.bet?.onPlayer === this.winner);
  const losingSpectators = this.spectators.filter(s => s.bet?.onPlayer !== this.winner);
  
  const totalWinningBets = winningSpectators.reduce((sum, s) => sum + (s.bet?.amount || 0), 0);
  const totalLosingBets = losingSpectators.reduce((sum, s) => sum + (s.bet?.amount || 0), 0);
  
  // Distribute spectator winnings based on bet proportions
  if (totalWinningBets > 0 && totalLosingBets > 0) {
    for (const spectator of winningSpectators) {
      if (!spectator.bet || !spectator.bet.amount) continue;
      
      // Calculate proportion of winning pool
      const proportion = spectator.bet.amount / totalWinningBets;
      const spectatorWinnings = Math.floor(totalLosingBets * proportion) + spectator.bet.amount;
      
      // Update spectator's balance
      await User.findByIdAndUpdate(
        spectator.user,
        { $inc: { balance: spectatorWinnings } }
      );
    }
  } else if (totalWinningBets > 0) {
    // Return bets to winning spectators if no losing bets
    for (const spectator of winningSpectators) {
      if (!spectator.bet || !spectator.bet.amount) continue;
      
      await User.findByIdAndUpdate(
        spectator.user,
        { $inc: { balance: spectator.bet.amount } }
      );
    }
  }
  
  return true;
};

// Handle draw situation
GameSchema.methods.handleDraw = async function() {
  const User = mongoose.model('User');
  
  if (this.status !== 'draw') {
    return false;
  }
  
  // Return bets to players
  await User.findByIdAndUpdate(
    this.white.player,
    { $inc: { balance: this.white.bet } }
  );
  
  await User.findByIdAndUpdate(
    this.black.player,
    { $inc: { balance: this.black.bet } }
  );
  
  // Return bets to all spectators
  for (const spectator of this.spectators) {
    if (!spectator.bet || !spectator.bet.amount) continue;
    
    await User.findByIdAndUpdate(
      spectator.user,
      { $inc: { balance: spectator.bet.amount } }
    );
  }
  
  return true;
};

module.exports = mongoose.model('Game', GameSchema); 