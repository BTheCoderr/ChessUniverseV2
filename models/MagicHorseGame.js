const mongoose = require('mongoose');

const MagicHorseGameSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },
  moves: [{
    fromRow: Number,
    fromCol: Number,
    toRow: Number,
    toCol: Number,
    queensRemaining: Number,
    moveCount: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  queensRemaining: {
    type: Number,
    default: 24
  },
  moveCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Pre-save middleware to set completedAt when game is completed
MagicHorseGameSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('MagicHorseGame', MagicHorseGameSchema); 