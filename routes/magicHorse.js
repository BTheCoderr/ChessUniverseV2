const express = require('express');
const MagicHorseGame = require('../models/MagicHorseGame');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Create a new Magic Horse game
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { level } = req.body;
    
    // Validate level
    if (!level || level < 1 || level > 4) {
      return res.status(400).json({ message: 'Invalid level' });
    }
    
    // Create a new game
    const game = new MagicHorseGame({
      user: req.user._id,
      level,
      status: 'active',
      moves: [],
      queensRemaining: 24,
      moveCount: 0
    });
    
    await game.save();
    
    res.json({
      message: 'Game created successfully',
      gameId: game._id
    });
  } catch (error) {
    console.error('Error creating Magic Horse game:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a Magic Horse game
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const game = await MagicHorseGame.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if the user is the owner of the game
    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json({ game });
  } catch (error) {
    console.error('Error getting Magic Horse game:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Make a move in a Magic Horse game
router.post('/:id/move', isAuthenticated, async (req, res) => {
  try {
    const { fromRow, fromCol, toRow, toCol, queensRemaining, moveCount } = req.body;
    
    // Validate move data
    if (fromRow === undefined || fromCol === undefined || toRow === undefined || toCol === undefined) {
      return res.status(400).json({ message: 'Invalid move data' });
    }
    
    // Get the game
    const game = await MagicHorseGame.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if the user is the owner of the game
    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Check if the game is active
    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Game is not active' });
    }
    
    // Add the move to the game
    game.moves.push({
      fromRow,
      fromCol,
      toRow,
      toCol,
      queensRemaining,
      moveCount
    });
    
    // Update game state
    game.queensRemaining = queensRemaining;
    game.moveCount = moveCount;
    
    // Check if the game is over
    if (queensRemaining === getWinCondition(game.level)) {
      game.status = 'completed';
      
      // Update user's progress
      await updateUserProgress(req.user._id, game.level);
    }
    
    await game.save();
    
    res.json({
      message: 'Move recorded successfully',
      game
    });
  } catch (error) {
    console.error('Error making move in Magic Horse game:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get win condition based on level
function getWinCondition(level) {
  switch (level) {
    case 1:
      return 3;
    case 2:
      return 2;
    case 3:
      return 1;
    case 4:
      return 0;
    default:
      return 3;
  }
}

// Update user's progress
async function updateUserProgress(userId, level) {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return;
    }
    
    // Initialize magicHorseProgress if it doesn't exist
    if (!user.magicHorseProgress) {
      user.magicHorseProgress = {};
    }
    
    // Update the level's status to completed
    user.magicHorseProgress[`level${level}`] = 'completed';
    
    // Unlock the next level if applicable
    if (level < 4) {
      const nextLevel = level + 1;
      if (!user.magicHorseProgress[`level${nextLevel}`] || user.magicHorseProgress[`level${nextLevel}`] === 'locked') {
        user.magicHorseProgress[`level${nextLevel}`] = 'not_started';
      }
    }
    
    // Unlock Battle Chess if level 4 is completed
    if (level === 4) {
      // Update unlockedLevels if it doesn't exist
      if (!user.unlockedLevels) {
        user.unlockedLevels = ['level1'];
      }
      
      // Add battleChess to unlockedLevels if it's not already there
      if (!user.unlockedLevels.includes('battleChess')) {
        user.unlockedLevels.push('battleChess');
      }
    }
    
    await user.save();
  } catch (error) {
    console.error('Error updating user progress:', error);
  }
}

// Get user's magic horse progress
router.get('/progress', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      progress: user.magicHorseProgress || { 
        bestQueensRemaining: 24,
        completedChallenges: 0
      },
      unlockedLevels: user.unlockedLevels || ['level1']
    });
  } catch (error) {
    console.error('Error fetching magic horse progress:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update challenge status
router.post('/complete-challenge', isAuthenticated, async (req, res) => {
  try {
    const { level, success, queenCount } = req.body;
    
    // Validate level
    if (!level || isNaN(level) || level < 1 || level > 5) {
      return res.status(400).json({ message: 'Invalid level' });
    }
    
    // Validate success
    if (typeof success !== 'boolean') {
      return res.status(400).json({ message: 'Invalid success parameter' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Initialize magic horse progress if it doesn't exist
    if (!user.magicHorseProgress) {
      user.magicHorseProgress = {
        bestQueensRemaining: 24,
        completedChallenges: 0
      };
    }
    
    if (success) {
      // Update completed challenges count
      if (!user.magicHorseProgress.completedChallenges || 
          user.magicHorseProgress.completedChallenges < level) {
        user.magicHorseProgress.completedChallenges = level;
      }
      
      // Update best queens remaining if applicable
      if (queenCount !== undefined && 
          queenCount < user.magicHorseProgress.bestQueensRemaining) {
        user.magicHorseProgress.bestQueensRemaining = queenCount;
      }
      
      // Award coins based on level
      const coinsAwarded = level * 200;
      user.balance += coinsAwarded;
      
      // Unlock next level if not already unlocked
      if (level < 5) {
        const nextLevel = `level${level + 1}`;
        if (!user.unlockedLevels.includes(nextLevel)) {
          user.unlockedLevels.push(nextLevel);
        }
      }
      
      await user.save();
      
      res.json({
        message: `Challenge ${level} completed successfully!`,
        coinsAwarded,
        progress: user.magicHorseProgress,
        unlockedLevels: user.unlockedLevels
      });
    } else {
      // Challenge failed
      res.json({
        message: `Challenge ${level} not completed.`,
        progress: user.magicHorseProgress,
        unlockedLevels: user.unlockedLevels
      });
    }
  } catch (error) {
    console.error('Error updating challenge status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get challenge details
router.get('/challenge/:level', isAuthenticated, async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    
    // Validate level
    if (isNaN(level) || level < 1 || level > 5) {
      return res.status(400).json({ message: 'Invalid level' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Define challenge details
    const challenges = [
      {
        level: 1,
        title: 'Knight\'s Path Beginner',
        description: 'Move the knight to capture all queens using the fewest moves possible.',
        reward: 200,
        prerequisites: []
      },
      {
        level: 2,
        title: 'Knight\'s Path Intermediate',
        description: 'Navigate a more complex board layout with obstacles.',
        reward: 400,
        prerequisites: ['level1']
      },
      {
        level: 3,
        title: 'Knight\'s Path Advanced',
        description: 'Face moving targets that react to your movements.',
        reward: 600,
        prerequisites: ['level2']
      },
      {
        level: 4,
        title: 'Knight\'s Path Expert',
        description: 'Complete the challenge with a time limit and more queens.',
        reward: 800,
        prerequisites: ['level3']
      },
      {
        level: 5,
        title: 'Knight\'s Path Master',
        description: 'The ultimate challenge with all previous mechanics combined.',
        reward: 1000,
        prerequisites: ['level4']
      }
    ];
    
    const challenge = challenges[level - 1];
    
    // Check prerequisites
    const prerequisites = challenge.prerequisites || [];
    const meetsPrerequisites = prerequisites.every(prereq => 
      user.unlockedLevels.includes(prereq)
    );
    
    if (!meetsPrerequisites) {
      return res.status(403).json({ 
        message: 'You must complete the previous challenges first',
        unlockedLevels: user.unlockedLevels
      });
    }
    
    res.json({
      challenge,
      progress: user.magicHorseProgress || { 
        bestQueensRemaining: 24,
        completedChallenges: 0
      }
    });
  } catch (error) {
    console.error('Error fetching challenge details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 