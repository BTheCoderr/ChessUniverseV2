const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TournamentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 2,
    max: 128
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  prizePool: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['registration', 'active', 'completed', 'cancelled'],
    default: 'registration'
  },
  currentRound: {
    type: Number,
    default: 0
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  gameVariant: {
    type: String,
    enum: ['traditional', 'level2', 'level3', 'level4', 'battleChess', 'customSetup'],
    default: 'traditional'
  },
  timeControl: {
    type: String,
    enum: ['bullet', 'blitz', 'rapid', 'classical'],
    default: 'rapid'
  },
  participants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['registered', 'active', 'eliminated', 'winner'],
      default: 'registered'
    },
    seedNumber: {
      type: Number
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  matches: [{
    round: {
      type: Number,
      required: true
    },
    player1: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    player2: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    winner: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game'
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    isThirdPlace: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to auto-populate some fields
TournamentSchema.pre('save', function(next) {
  // If prize pool is 0 and entry fee is set, calculate initial prize pool
  if (this.prizePool === 0 && this.entryFee > 0 && this.isModified('participants')) {
    this.prizePool = this.participants.length * this.entryFee;
  }
  
  next();
});

module.exports = mongoose.model('Tournament', TournamentSchema); 