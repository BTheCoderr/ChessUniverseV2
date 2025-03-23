const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Game = require('../models/Game');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all tournament routes
router.use(isAuthenticated);

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const { status, skip = 0, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    
    // Execute query with pagination
    const tournaments = await Tournament.find(query)
      .sort({ startDate: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('creator', 'username');
    
    const total = await Tournament.countDocuments(query);
    
    res.json({ 
      tournaments,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ message: 'Error fetching tournaments', error: error.message });
  }
});

// Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('creator', 'username')
      .populate('participants.user', 'username rating')
      .populate({
        path: 'matches',
        populate: {
          path: 'player1 player2 winner',
          select: 'username rating'
        }
      });
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    res.json({ tournament });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ message: 'Error fetching tournament', error: error.message });
  }
});

// Create a new tournament
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      startDate, 
      maxParticipants, 
      entryFee, 
      prizePool,
      gameVariant,
      timeControl
    } = req.body;
    
    // Validate inputs
    if (!name || !startDate || !maxParticipants) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate date
    const tournamentDate = new Date(startDate);
    if (isNaN(tournamentDate) || tournamentDate < new Date()) {
      return res.status(400).json({ message: 'Invalid start date' });
    }
    
    // Check if user can afford the creation fee
    const creationFee = 100;
    if (req.user.balance < creationFee) {
      return res.status(400).json({ message: 'Insufficient balance to create tournament' });
    }
    
    // Deduct creation fee
    req.user.balance -= creationFee;
    await req.user.save();
    
    // Create tournament
    const tournament = new Tournament({
      name,
      description,
      creator: req.user._id,
      startDate: tournamentDate,
      maxParticipants: Math.min(maxParticipants, 32), // Cap at 32 players
      entryFee: entryFee || 0,
      prizePool: prizePool || 0,
      gameVariant: gameVariant || 'traditional',
      timeControl: timeControl || 'rapid'
    });
    
    await tournament.save();
    
    res.status(201).json({
      message: 'Tournament created successfully',
      tournament
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ message: 'Error creating tournament', error: error.message });
  }
});

// Join a tournament
router.post('/:id/join', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    // Check if tournament is open for registration
    if (tournament.status !== 'registration') {
      return res.status(400).json({ message: 'Tournament is not open for registration' });
    }
    
    // Check if tournament is full
    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ message: 'Tournament is full' });
    }
    
    // Check if user is already registered
    const isRegistered = tournament.participants.some(p => 
      p.user.toString() === req.user._id.toString()
    );
    
    if (isRegistered) {
      return res.status(400).json({ message: 'You are already registered for this tournament' });
    }
    
    // Check if user can afford the entry fee
    if (tournament.entryFee > 0 && req.user.balance < tournament.entryFee) {
      return res.status(400).json({ message: 'Insufficient balance for entry fee' });
    }
    
    // Deduct entry fee
    if (tournament.entryFee > 0) {
      req.user.balance -= tournament.entryFee;
      await req.user.save();
      
      // Add to prize pool
      tournament.prizePool += tournament.entryFee;
    }
    
    // Add user to participants
    tournament.participants.push({
      user: req.user._id,
      status: 'registered',
      seedNumber: tournament.participants.length + 1
    });
    
    await tournament.save();
    
    res.json({
      message: 'Successfully joined tournament',
      tournament
    });
  } catch (error) {
    console.error('Error joining tournament:', error);
    res.status(500).json({ message: 'Error joining tournament', error: error.message });
  }
});

// Start a tournament
router.post('/:id/start', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    // Check if user is the creator
    if (tournament.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the tournament creator can start it' });
    }
    
    // Check if tournament can be started
    if (tournament.status !== 'registration') {
      return res.status(400).json({ message: 'Tournament cannot be started' });
    }
    
    // Need at least 2 participants
    if (tournament.participants.length < 2) {
      return res.status(400).json({ message: 'Not enough participants to start tournament' });
    }
    
    // Generate pairings
    const matches = generatePairings(tournament.participants);
    
    // Update tournament
    tournament.status = 'active';
    tournament.currentRound = 1;
    tournament.matches = matches;
    tournament.startDate = new Date();
    
    await tournament.save();
    
    res.json({
      message: 'Tournament started successfully',
      tournament
    });
  } catch (error) {
    console.error('Error starting tournament:', error);
    res.status(500).json({ message: 'Error starting tournament', error: error.message });
  }
});

// Record match result
router.post('/:id/matches/:matchId/result', async (req, res) => {
  try {
    const { winnerId, gameId } = req.body;
    
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    // Find the match
    const match = tournament.matches.id(req.params.matchId);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    // Check if match is active
    if (match.status !== 'scheduled' && match.status !== 'in_progress') {
      return res.status(400).json({ message: 'Match is not active' });
    }
    
    // Check if user is a player in the match
    const isPlayer1 = match.player1.toString() === req.user._id.toString();
    const isPlayer2 = match.player2.toString() === req.user._id.toString();
    
    if (!isPlayer1 && !isPlayer2 && tournament.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to report match result' });
    }
    
    // Validate winner
    if (winnerId !== match.player1.toString() && winnerId !== match.player2.toString()) {
      return res.status(400).json({ message: 'Invalid winner' });
    }
    
    // Validate game ID if provided
    if (gameId) {
      const game = await Game.findById(gameId);
      
      if (!game) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      // Check if game belongs to the match players
      const gameWhite = game.whitePlayer.toString();
      const gameBlack = game.blackPlayer.toString();
      const matchPlayer1 = match.player1.toString();
      const matchPlayer2 = match.player2.toString();
      
      if ((gameWhite !== matchPlayer1 && gameWhite !== matchPlayer2) || 
          (gameBlack !== matchPlayer1 && gameBlack !== matchPlayer2)) {
        return res.status(400).json({ message: 'Game does not match tournament pairing' });
      }
      
      match.gameId = gameId;
    }
    
    // Update match
    match.winner = winnerId;
    match.status = 'completed';
    match.endTime = new Date();
    
    // Update player statuses
    tournament.participants.forEach(participant => {
      if (participant.user.toString() === winnerId) {
        participant.status = 'active';
      } else if (participant.user.toString() === match.player1.toString() || 
                participant.user.toString() === match.player2.toString()) {
        participant.status = 'eliminated';
      }
    });
    
    // Check if round is complete
    const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
    const isRoundComplete = currentRoundMatches.every(m => m.status === 'completed');
    
    if (isRoundComplete) {
      // Generate next round if not final
      const advancingPlayers = tournament.participants.filter(p => p.status === 'active');
      
      if (advancingPlayers.length > 1) {
        // Generate next round
        tournament.currentRound += 1;
        const nextRoundMatches = generateNextRoundPairings(advancingPlayers, tournament.currentRound);
        tournament.matches.push(...nextRoundMatches);
      } else if (advancingPlayers.length === 1) {
        // Tournament completed
        tournament.status = 'completed';
        tournament.winner = advancingPlayers[0].user;
        tournament.endDate = new Date();
        
        // Distribute prizes
        await distributeTournamentPrizes(tournament);
      }
    }
    
    await tournament.save();
    
    res.json({
      message: 'Match result recorded successfully',
      tournament
    });
  } catch (error) {
    console.error('Error recording match result:', error);
    res.status(500).json({ message: 'Error recording match result', error: error.message });
  }
});

// Helper function to generate first round pairings
function generatePairings(participants) {
  // Shuffle participants to randomize seeding
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Check if we need byes (if participant count is not a power of 2)
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const byeCount = nextPowerOf2 - shuffled.length;
  
  // Create matches array
  const matches = [];
  
  // If odd number of participants, give a bye to the first participant
  let position = 0;
  while (position < shuffled.length) {
    if (byeCount > 0 && position < byeCount) {
      // Bye - automatically advance participant
      matches.push({
        round: 1,
        player1: shuffled[position].user,
        player2: null, // Bye
        status: 'completed',
        winner: shuffled[position].user
      });
      
      position += 1;
    } else if (position + 1 < shuffled.length) {
      // Regular match
      matches.push({
        round: 1,
        player1: shuffled[position].user,
        player2: shuffled[position + 1].user,
        status: 'scheduled'
      });
      
      position += 2;
    } else {
      // Odd player at the end gets a bye
      matches.push({
        round: 1,
        player1: shuffled[position].user,
        player2: null, // Bye
        status: 'completed',
        winner: shuffled[position].user
      });
      
      position += 1;
    }
  }
  
  return matches;
}

// Helper function to generate next round pairings
function generateNextRoundPairings(advancingPlayers, roundNumber) {
  const matches = [];
  
  for (let i = 0; i < advancingPlayers.length; i += 2) {
    if (i + 1 < advancingPlayers.length) {
      matches.push({
        round: roundNumber,
        player1: advancingPlayers[i].user,
        player2: advancingPlayers[i + 1].user,
        status: 'scheduled'
      });
    } else {
      // If odd number of players, give a bye
      matches.push({
        round: roundNumber,
        player1: advancingPlayers[i].user,
        player2: null,
        status: 'completed',
        winner: advancingPlayers[i].user
      });
    }
  }
  
  return matches;
}

// Helper function to distribute tournament prizes
async function distributeTournamentPrizes(tournament) {
  try {
    if (!tournament.winner) return;
    
    const prizePool = tournament.prizePool || 0;
    if (prizePool <= 0) return;
    
    // Define prize distribution percentages
    const prizeDistribution = {
      1: 0.6, // Winner gets 60%
      2: 0.3, // Runner-up gets 30%
      3: 0.1  // Third place gets 10%
    };
    
    // Find finalists
    const winner = await User.findById(tournament.winner);
    if (!winner) return;
    
    // Winner gets first prize
    const firstPrize = Math.floor(prizePool * prizeDistribution[1]);
    winner.balance += firstPrize;
    winner.tournamentsWon += 1;
    winner.totalEarnings += firstPrize;
    await winner.save();
    
    // Find second and third place if available
    const finalists = tournament.matches.filter(m => m.round === tournament.currentRound - 1);
    
    if (finalists.length > 0) {
      // Find the runner-up (the player who lost in the final)
      const final = finalists.find(m => 
        m.player1?.toString() === tournament.winner.toString() || 
        m.player2?.toString() === tournament.winner.toString()
      );
      
      if (final) {
        const runnerUpId = final.player1?.toString() === tournament.winner.toString() ? 
          final.player2 : final.player1;
        
        if (runnerUpId) {
          const runnerUp = await User.findById(runnerUpId);
          if (runnerUp) {
            const secondPrize = Math.floor(prizePool * prizeDistribution[2]);
            runnerUp.balance += secondPrize;
            runnerUp.totalEarnings += secondPrize;
            await runnerUp.save();
          }
        }
      }
    }
    
    if (finalists.length > 1 && prizeDistribution[3]) {
      // Find third place (winner of the 3rd place match if it exists)
      const thirdPlaceMatch = tournament.matches.find(m => m.round === tournament.currentRound - 1 && m.isThirdPlace);
      
      if (thirdPlaceMatch && thirdPlaceMatch.winner) {
        const thirdPlace = await User.findById(thirdPlaceMatch.winner);
        if (thirdPlace) {
          const thirdPrize = Math.floor(prizePool * prizeDistribution[3]);
          thirdPlace.balance += thirdPrize;
          thirdPlace.totalEarnings += thirdPrize;
          await thirdPlace.save();
        }
      }
    }
  } catch (error) {
    console.error('Error distributing tournament prizes:', error);
  }
}

module.exports = router; 