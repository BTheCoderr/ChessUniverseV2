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
    
    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if game is in pending status
    if (game.status !== 'pending') {
      return res.status(400).json({ message: 'Bets can only be placed on pending games' });
    }
    
    // Check if a bet has already been placed
    if (game.betAmount > 0) {
      return res.status(400).json({ message: 'A bet has already been placed on this game' });
    }
    
    // Check if user is a player in this game
    let isPlayer = false;
    if (game.whitePlayer && game.whitePlayer.equals(req.user._id)) {
      isPlayer = true;
    } else if (game.blackPlayer && game.blackPlayer.equals(req.user._id)) {
      isPlayer = true;
    }
    
    if (!isPlayer && !game.isAIOpponent) {
      return res.status(403).json({ message: 'You are not a player in this game' });
    }
    
    // Get fresh user data to ensure accurate balance
    const user = await User.findById(req.user._id);
    
    // Check if user has enough balance
    if (user.balance < betAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // For AI games, we only need to check the user's balance
    if (game.isAIOpponent) {
      // Update game with bet amount
      game.betAmount = betAmount;
      await game.save();
      
      // Deduct bet amount from user's balance
      user.balance -= betAmount;
      await user.save();
      
      return res.json({
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
    }
    
    // For human vs human games, check the other player's balance
    const otherPlayerId = game.whitePlayer.equals(req.user._id) ? game.blackPlayer : game.whitePlayer;
    const otherPlayer = await User.findById(otherPlayerId);
    
    if (otherPlayer.balance < betAmount) {
      return res.status(400).json({ 
        message: 'Your opponent does not have enough balance for this bet amount'
      });
    }
    
    // Update game with bet amount
    game.betAmount = betAmount;
    await game.save();
    
    // Deduct bet amount from both players' balances
    user.balance -= betAmount;
    otherPlayer.balance -= betAmount;
    
    await user.save();
    await otherPlayer.save();
    
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
      .populate('spectatorBets.userId')
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
      return res.status(400).json({ message: 'Game is not completed' });
    }
    
    // Check if bets have already been settled
    if (game.betsSettled) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Bets have already been settled' });
    }
    
    // Get the result
    const result = game.result;
    
    // Check if result is valid
    if (result === 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Game result is pending' });
    }
    
    // Calculate the prize pool
    const betAmount = game.betAmount;
    const houseFee = Math.floor(betAmount * 0.1); // 10% house fee
    const prizePool = (betAmount * 2) - houseFee;
    
    // Update player balances and betting stats based on result
    if (result === 'white' || result === 'black') {
      // Get the winner and loser
      const winner = result === 'white' ? game.whitePlayer : game.blackPlayer;
      const loser = result === 'white' ? game.blackPlayer : game.whitePlayer;
      
      if (winner && !game.isAIOpponent) {
        // Update winner's balance and stats
        winner.balance += prizePool;
        
        // Update betting stats
        if (!winner.bettingStats) {
          winner.bettingStats = {
            totalBets: 1,
            wins: 1,
            losses: 0,
            draws: 0,
            profit: betAmount,
            largestWin: betAmount,
            largestLoss: 0,
            spectatorBets: {
              total: 0,
              wins: 0,
              losses: 0,
              profit: 0
            }
          };
        } else {
          winner.bettingStats.totalBets += 1;
          winner.bettingStats.wins += 1;
          winner.bettingStats.profit += betAmount;
          
          // Update largest win if applicable
          if (betAmount > winner.bettingStats.largestWin) {
            winner.bettingStats.largestWin = betAmount;
          }
        }
        
        await winner.save({ session });
      }
      
      if (loser && !game.isAIOpponent) {
        // Update loser's stats
        if (!loser.bettingStats) {
          loser.bettingStats = {
            totalBets: 1,
            wins: 0,
            losses: 1,
            draws: 0,
            profit: -betAmount,
            largestWin: 0,
            largestLoss: betAmount,
            spectatorBets: {
              total: 0,
              wins: 0,
              losses: 0,
              profit: 0
            }
          };
        } else {
          loser.bettingStats.totalBets += 1;
          loser.bettingStats.losses += 1;
          loser.bettingStats.profit -= betAmount;
          
          // Update largest loss if applicable
          if (betAmount > loser.bettingStats.largestLoss) {
            loser.bettingStats.largestLoss = betAmount;
          }
        }
        
        await loser.save({ session });
      }
    } else if (result === 'draw') {
      // Return bets to both players
      if (game.whitePlayer && !game.whiteIsAI) {
        game.whitePlayer.balance += betAmount;
        
        // Update betting stats
        if (!game.whitePlayer.bettingStats) {
          game.whitePlayer.bettingStats = {
            totalBets: 1,
            wins: 0,
            losses: 0,
            draws: 1,
            profit: 0,
            largestWin: 0,
            largestLoss: 0,
            spectatorBets: {
              total: 0,
              wins: 0,
              losses: 0,
              profit: 0
            }
          };
        } else {
          game.whitePlayer.bettingStats.totalBets += 1;
          game.whitePlayer.bettingStats.draws += 1;
        }
        
        await game.whitePlayer.save({ session });
      }
      
      if (game.blackPlayer && !game.blackIsAI) {
        game.blackPlayer.balance += betAmount;
        
        // Update betting stats
        if (!game.blackPlayer.bettingStats) {
          game.blackPlayer.bettingStats = {
            totalBets: 1,
            wins: 0,
            losses: 0,
            draws: 1,
            profit: 0,
            largestWin: 0,
            largestLoss: 0,
            spectatorBets: {
              total: 0,
              wins: 0,
              losses: 0,
              profit: 0
            }
          };
        } else {
          game.blackPlayer.bettingStats.totalBets += 1;
          game.blackPlayer.bettingStats.draws += 1;
        }
        
        await game.blackPlayer.save({ session });
      }
    }
    
    // Settle spectator bets
    if (game.spectatorBets && game.spectatorBets.length > 0) {
      for (const bet of game.spectatorBets) {
        if (bet.settled) continue;
        
        const spectator = bet.userId;
        if (!spectator) continue;
        
        // Calculate payout
        let payout = 0;
        if (result === bet.predictedWinner) {
          // Winner gets 1.8x their bet (after 10% house fee)
          payout = Math.floor(bet.amount * 1.8);
          spectator.balance += payout;
          
          // Update spectator betting stats
          if (!spectator.bettingStats) {
            spectator.bettingStats = {
              totalBets: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              profit: 0,
              largestWin: 0,
              largestLoss: 0,
              spectatorBets: {
                total: 1,
                wins: 1,
                losses: 0,
                profit: payout - bet.amount
              }
            };
          } else {
            if (!spectator.bettingStats.spectatorBets) {
              spectator.bettingStats.spectatorBets = {
                total: 1,
                wins: 1,
                losses: 0,
                profit: payout - bet.amount
              };
            } else {
              spectator.bettingStats.spectatorBets.total += 1;
              spectator.bettingStats.spectatorBets.wins += 1;
              spectator.bettingStats.spectatorBets.profit += (payout - bet.amount);
            }
          }
        } else if (result === 'draw') {
          // Return bet on draw
          payout = bet.amount;
          spectator.balance += payout;
          
          // No change to profit on draw
        } else {
          // Loser gets nothing
          payout = 0;
          
          // Update spectator betting stats
          if (!spectator.bettingStats) {
            spectator.bettingStats = {
              totalBets: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              profit: 0,
              largestWin: 0,
              largestLoss: 0,
              spectatorBets: {
                total: 1,
                wins: 0,
                losses: 1,
                profit: -bet.amount
              }
            };
          } else {
            if (!spectator.bettingStats.spectatorBets) {
              spectator.bettingStats.spectatorBets = {
                total: 1,
                wins: 0,
                losses: 1,
                profit: -bet.amount
              };
            } else {
              spectator.bettingStats.spectatorBets.total += 1;
              spectator.bettingStats.spectatorBets.losses += 1;
              spectator.bettingStats.spectatorBets.profit -= bet.amount;
            }
          }
        }
        
        // Mark bet as settled
        bet.settled = true;
        
        await spectator.save({ session });
      }
    }
    
    // Mark bets as settled
    game.betsSettled = true;
    await game.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      message: 'Bets settled successfully',
      game: {
        id: game._id,
        result: game.result,
        betAmount: game.betAmount,
        betsSettled: game.betsSettled
      }
    });
  } catch (error) {
    // Abort the transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error settling bets:', error);
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

// Place a spectator bet
router.post('/spectator-bet', isAuthenticated, async (req, res) => {
  try {
    const { gameId, betAmount, predictedWinner } = req.body;
    
    // Validate bet amount - ensure it's a positive number and not too large
    if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ message: 'Invalid bet amount' });
    }
    
    // Set a reasonable maximum bet amount
    const maxBet = 1000;
    if (betAmount > maxBet) {
      return res.status(400).json({ message: `Bet amount cannot exceed ${maxBet} coins` });
    }
    
    // Validate predicted winner
    if (!predictedWinner || (predictedWinner !== 'white' && predictedWinner !== 'black')) {
      return res.status(400).json({ message: 'Invalid predicted winner' });
    }
    
    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if game is in active status
    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Bets can only be placed on active games' });
    }
    
    // Check if user is a player in this game (spectators only)
    if (
      (game.whitePlayer && game.whitePlayer.equals(req.user._id)) ||
      (game.blackPlayer && game.blackPlayer.equals(req.user._id))
    ) {
      return res.status(403).json({ message: 'Players cannot place spectator bets on their own games' });
    }
    
    // Get fresh user data to ensure accurate balance
    const user = await User.findById(req.user._id);
    
    // Check if user has enough balance
    if (user.balance < betAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Create a spectator bet
    if (!game.spectatorBets) {
      game.spectatorBets = [];
    }
    
    // Check if user already has a bet on this game
    const existingBetIndex = game.spectatorBets.findIndex(bet => 
      bet.userId.toString() === user._id.toString()
    );
    
    if (existingBetIndex >= 0) {
      return res.status(400).json({ message: 'You already have a bet on this game' });
    }
    
    // Add the spectator bet
    game.spectatorBets.push({
      userId: user._id,
      amount: betAmount,
      predictedWinner: predictedWinner
    });
    
    await game.save();
    
    // Deduct bet amount from user's balance
    user.balance -= betAmount;
    await user.save();
    
    res.json({
      message: 'Spectator bet placed successfully',
      game: {
        id: game._id,
        spectatorBets: game.spectatorBets
      },
      user: {
        id: user._id,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Error placing spectator bet:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get betting leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    // Find all users with betting stats
    const users = await User.find({
      'bettingStats.totalBets': { $gt: 0 }
    }).select('username bettingStats');
    
    // Calculate win rate and sort by profit
    const leaderboard = users
      .map(user => {
        const winRate = user.bettingStats.totalBets > 0 
          ? (user.bettingStats.wins / user.bettingStats.totalBets * 100).toFixed(1) 
          : 0;
        
        return {
          username: user.username,
          totalBets: user.bettingStats.totalBets,
          wins: user.bettingStats.wins,
          losses: user.bettingStats.losses,
          draws: user.bettingStats.draws,
          winRate: `${winRate}%`,
          profit: user.bettingStats.profit
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20); // Get top 20
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching betting leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 