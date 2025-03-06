const express = require('express');
const Game = require('../models/Game');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// Place a bet on a game
router.post('/place-bet', isAuthenticated, async (req, res) => {
  // Start a transaction to ensure data consistency
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { gameId, betAmount } = req.body;
    
    // Validate bet amount - ensure it's a positive number and not too large
    if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ message: 'Invalid bet amount' });
    }
    
    // Set a reasonable maximum bet amount
    const maxBet = 1000;
    if (betAmount > maxBet) {
      return res.status(400).json({ message: `Bet amount cannot exceed ${maxBet} coins` });
    }
    
    // Find the game with session to lock it
    const game = await Game.findById(gameId).session(session);
    if (!game) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if game is in pending status
    if (game.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Bets can only be placed on pending games' });
    }
    
    // Check if a bet has already been placed
    if (game.betAmount > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'A bet has already been placed on this game' });
    }
    
    // Check if user is a player in this game
    const isWhitePlayer = game.whitePlayer.equals(req.user._id);
    const isBlackPlayer = game.blackPlayer.equals(req.user._id);
    
    if (!isWhitePlayer && !isBlackPlayer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'You are not a player in this game' });
    }
    
    // Get fresh user data with session to ensure accurate balance
    const user = await User.findById(req.user._id).session(session);
    
    // Check if user has enough balance
    if (user.balance < betAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Ensure both players have enough balance for the bet
    const otherPlayerId = isWhitePlayer ? game.blackPlayer : game.whitePlayer;
    const otherPlayer = await User.findById(otherPlayerId).session(session);
    
    if (otherPlayer.balance < betAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Your opponent does not have enough balance for this bet amount'
      });
    }
    
    // Update game with bet amount
    game.betAmount = betAmount;
    await game.save({ session });
    
    // Deduct bet amount from both players' balances
    user.balance -= betAmount;
    otherPlayer.balance -= betAmount;
    
    await user.save({ session });
    await otherPlayer.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      message: 'Bet placed successfully',
      game: {
        id: game._id,
        betAmount: game.betAmount
      },
      user: {
        id: user._id,
        balance: user.balance
      }
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error placing bet:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Settle a bet after game completion
router.post('/settle-bet', isAuthenticated, async (req, res) => {
  // Start a transaction to ensure data consistency
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { gameId } = req.body;
    
    // Find the game with session
    const game = await Game.findById(gameId)
      .populate('whitePlayer')
      .populate('blackPlayer')
      .session(session);
    
    if (!game) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if game is completed
    if (game.status !== 'completed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Game is not completed yet' });
    }
    
    // Check if bet has already been settled
    if (!game.betAmount || game.betAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'No bet to settle or bet already settled' });
    }
    
    // Get fresh user data to ensure accurate balances
    const whitePlayer = await User.findById(game.whitePlayer._id).session(session);
    const blackPlayer = await User.findById(game.blackPlayer._id).session(session);
    
    // Get the winner and update balances
    let winner, loser;
    if (game.result === 'white') {
      winner = whitePlayer;
      loser = blackPlayer;
    } else if (game.result === 'black') {
      winner = blackPlayer;
      loser = whitePlayer;
    }
    
    // Handle the bet based on the result
    if (winner && loser) {
      // Winner takes all
      winner.balance += (game.betAmount * 2);
      winner.gamesWon += 1;
      loser.gamesLost += 1;
      
      await winner.save({ session });
      await loser.save({ session });
      
      // Reset bet amount to indicate it's been settled
      game.betAmount = 0;
      await game.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      res.json({
        message: 'Bet settled successfully',
        winner: {
          id: winner._id,
          username: winner.username,
          balance: winner.balance
        }
      });
    } else if (game.result === 'draw') {
      // Refund bets in case of a draw
      whitePlayer.balance += game.betAmount;
      blackPlayer.balance += game.betAmount;
      whitePlayer.gamesTied += 1;
      blackPlayer.gamesTied += 1;
      
      await whitePlayer.save({ session });
      await blackPlayer.save({ session });
      
      // Reset bet amount to indicate it's been settled
      game.betAmount = 0;
      await game.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      res.json({
        message: 'Game ended in a draw, bets refunded',
        players: [
          {
            id: whitePlayer._id,
            username: whitePlayer.username,
            balance: whitePlayer.balance
          },
          {
            id: blackPlayer._id,
            username: blackPlayer.username,
            balance: blackPlayer.balance
          }
        ]
      });
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid game result' });
    }
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error settling bet:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's betting history
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [
        { whitePlayer: req.user._id },
        { blackPlayer: req.user._id }
      ],
      status: 'completed'
    })
      .populate('whitePlayer', 'username')
      .populate('blackPlayer', 'username')
      .sort({ endTime: -1 });
    
    const bettingHistory = games.map(game => {
      const isWhitePlayer = game.whitePlayer._id.equals(req.user._id);
      const userColor = isWhitePlayer ? 'white' : 'black';
      const outcome = game.result === userColor ? 'won' : 
                     game.result === 'draw' ? 'draw' : 'lost';
      
      // Calculate profit/loss
      let profitLoss = 0;
      if (outcome === 'won') {
        profitLoss = game.betAmount; // Won opponent's bet
      } else if (outcome === 'lost') {
        profitLoss = -game.betAmount; // Lost own bet
      }
      // For draw, profit/loss is 0
      
      return {
        gameId: game._id,
        opponent: isWhitePlayer ? game.blackPlayer.username : game.whitePlayer.username,
        betAmount: game.betAmount,
        outcome,
        profitLoss,
        date: game.endTime
      };
    });
    
    res.json({ bettingHistory });
  } catch (error) {
    console.error('Error fetching betting history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 