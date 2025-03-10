const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  balance: {
    type: Number,
    default: 1000 // Starting balance of 1000 virtual coins
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  gamesLost: {
    type: Number,
    default: 0
  },
  gamesTied: {
    type: Number,
    default: 0
  },
  battleChessWins: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 4
  },
  bettingStats: {
    totalBets: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    },
    largestWin: {
      type: Number,
      default: 0
    },
    largestLoss: {
      type: Number,
      default: 0
    },
    spectatorBets: {
      total: {
        type: Number,
        default: 0
      },
      wins: {
        type: Number,
        default: 0
      },
      losses: {
        type: Number,
        default: 0
      },
      profit: {
        type: Number,
        default: 0
      }
    }
  },
  unlocks: {
    magicHorse: {
      type: Boolean,
      default: false
    },
    level2: {
      type: Boolean,
      default: false
    },
    level3: {
      type: Boolean,
      default: false
    },
    level4: {
      type: Boolean,
      default: false
    },
    battleChess: {
      type: Boolean,
      default: false
    },
    customSetup: {
      type: Boolean,
      default: false
    }
  },
  unlockedLevels: {
    type: [String],
    default: ['level1']
  },
  magicHorseProgress: {
    bestQueensRemaining: {
      type: Number,
      default: 24 // Start with all queens
    },
    completedChallenges: {
      type: Number,
      default: 0
    }
  },
  tournamentsPlayed: {
    type: Number,
    default: 0
  },
  tournamentsWon: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 