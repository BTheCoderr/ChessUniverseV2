const mongoose = require('mongoose');

const TournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  // Tournament type
  gameVariant: {
    type: String,
    enum: ['traditional', 'level2', 'level3', 'level4', 'battleChess', 'customSetup'],
    default: 'traditional'
  },
  // Entry fee
  entryFee: {
    type: Number,
    required: true,
    min: 0
  },
  // Prize pool
  prizePool: {
    type: Number,
    default: 0
  },
  // Prize distribution (percentages)
  prizeDistribution: {
    first: {
      type: Number,
      default: 50 // 50% of prize pool
    },
    second: {
      type: Number,
      default: 30 // 30% of prize pool
    },
    third: {
      type: Number,
      default: 20 // 20% of prize pool
    }
  },
  // Maximum number of participants
  maxParticipants: {
    type: Number,
    required: true
  },
  // Current participants
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'eliminated'],
      default: 'active'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Tournament rounds
  rounds: [{
    roundNumber: Number,
    matches: [{
      game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
      },
      whitePlayer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      blackPlayer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['pending', 'active', 'completed'],
        default: 'pending'
      }
    }],
    startTime: Date,
    endTime: Date
  }],
  // Tournament status
  status: {
    type: String,
    enum: ['registration', 'active', 'completed'],
    default: 'registration'
  },
  // Tournament winners
  winners: {
    first: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      prize: Number
    },
    second: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      prize: Number
    },
    third: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      prize: Number
    }
  },
  // Tournament dates
  registrationStart: {
    type: Date,
    required: true
  },
  registrationEnd: {
    type: Date,
    required: true
  },
  tournamentStart: {
    type: Date,
    required: true
  },
  tournamentEnd: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Calculate prize pool based on entry fee and participants
TournamentSchema.methods.calculatePrizePool = function() {
  const totalEntryFees = this.participants.length * this.entryFee;
  // 90% goes to prize pool, 10% to house
  this.prizePool = totalEntryFees * 0.9;
  return this.prizePool;
};

// Calculate prizes for winners
TournamentSchema.methods.calculatePrizes = function() {
  if (!this.winners) {
    this.winners = {};
  }
  
  if (this.winners.first && this.winners.first.user) {
    this.winners.first.prize = this.prizePool * (this.prizeDistribution.first / 100);
  }
  
  if (this.winners.second && this.winners.second.user) {
    this.winners.second.prize = this.prizePool * (this.prizeDistribution.second / 100);
  }
  
  if (this.winners.third && this.winners.third.user) {
    this.winners.third.prize = this.prizePool * (this.prizeDistribution.third / 100);
  }
  
  return this.winners;
};

module.exports = mongoose.model('Tournament', TournamentSchema); 