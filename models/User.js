const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
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
    minlength: 8
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  balance: {
    type: Number,
    default: 1000,
    min: 0
  },
  rating: {
    type: Number,
    default: 1200
  },
  profile: {
    avatar: {
      type: String,
      default: '/img/avatars/default.png'
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500
    },
    country: String,
    socialLinks: {
      twitter: String,
      facebook: String,
      discord: String
    },
    displayNameColor: {
      type: String,
      default: '#000000'
    }
  },
  stats: {
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
    tournamentWins: {
      type: Number,
      default: 0
    },
    totalGamesPlayed: {
      type: Number,
      default: 0
    },
    winRatio: {
      type: Number,
      default: 0
    },
    highestRating: {
      type: Number,
      default: 1200
    },
    eloHistory: [{
      rating: Number,
      date: {
        type: Date,
        default: Date.now
      },
      gameId: {
        type: Schema.Types.ObjectId,
        ref: 'Game'
      }
    }]
  },
  magicHorse: {
    unlockedLevels: {
      type: [Number],
      default: [1]
    },
    challengesCompleted: [{
      level: Number,
      completedAt: {
        type: Date,
        default: Date.now
      },
      score: Number
    }],
    highScores: [{
      level: Number,
      score: Number,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  friends: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'blocked'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['friend_request', 'game_invite', 'tournament_invite', 'system', 'achievement'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    relatedId: Schema.Types.ObjectId,
    relatedType: {
      type: String,
      enum: ['user', 'game', 'tournament', 'achievement']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  achievements: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    icon: String,
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    boardTheme: {
      type: String,
      default: 'classic'
    },
    pieceSet: {
      type: String,
      default: 'standard'
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    autoPromoteToQueen: {
      type: Boolean,
      default: false
    }
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  verificationToken: String,
  verified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// Pre-save hook to hash password
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

// Update winRatio whenever stats change
UserSchema.pre('save', function(next) {
  if (this.isModified('stats.wins') || this.isModified('stats.losses')) {
    const totalGames = this.stats.wins + this.stats.losses;
    this.stats.totalGamesPlayed = totalGames + this.stats.draws;
    
    this.stats.winRatio = totalGames > 0 
      ? parseFloat((this.stats.wins / totalGames).toFixed(2)) 
      : 0;
  }
  
  if (this.isModified('rating')) {
    if (this.rating > this.stats.highestRating) {
      this.stats.highestRating = this.rating;
    }
  }
  
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update user rating based on game result
UserSchema.methods.updateRating = function(opponent, result, k = 32) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponent.rating - this.rating) / 400));
  
  let actualScore;
  if (result === 'win') actualScore = 1;
  else if (result === 'loss') actualScore = 0;
  else actualScore = 0.5; // draw
  
  const ratingChange = Math.round(k * (actualScore - expectedScore));
  
  const previousRating = this.rating;
  this.rating += ratingChange;
  
  // Add to rating history
  if (!this.stats.eloHistory) this.stats.eloHistory = [];
  
  this.stats.eloHistory.push({
    rating: this.rating,
    date: new Date()
  });
  
  // Update highest rating if needed
  if (this.rating > this.stats.highestRating) {
    this.stats.highestRating = this.rating;
  }
  
  return {
    previousRating,
    newRating: this.rating,
    ratingChange
  };
};

// Method to get user's public profile
UserSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    rating: this.rating,
    profile: this.profile,
    stats: this.stats,
    isOnline: this.isOnline,
    lastLogin: this.lastLogin,
    achievements: this.achievements
  };
};

// Static method to find online users
UserSchema.statics.findOnlineUsers = function() {
  return this.find({ isOnline: true });
};

module.exports = mongoose.model('User', UserSchema); 