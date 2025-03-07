const express = require('express');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Game = require('../models/Game');

const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// Create a new tournament
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      gameVariant, 
      entryFee, 
      maxParticipants,
      registrationStart,
      registrationEnd,
      tournamentStart
    } = req.body;
    
    // Validate required fields
    if (!name || !entryFee || !maxParticipants || !registrationStart || !registrationEnd || !tournamentStart) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate dates
    const now = new Date();
    const regStart = new Date(registrationStart);
    const regEnd = new Date(registrationEnd);
    const tourStart = new Date(tournamentStart);
    
    if (regStart < now) {
      return res.status(400).json({ message: 'Registration start date must be in the future' });
    }
    
    if (regEnd <= regStart) {
      return res.status(400).json({ message: 'Registration end date must be after registration start date' });
    }
    
    if (tourStart <= regEnd) {
      return res.status(400).json({ message: 'Tournament start date must be after registration end date' });
    }
    
    // Create new tournament
    const newTournament = new Tournament({
      name,
      description,
      gameVariant: gameVariant || 'traditional',
      entryFee,
      maxParticipants,
      registrationStart: regStart,
      registrationEnd: regEnd,
      tournamentStart: tourStart,
      createdBy: req.user._id
    });
    
    await newTournament.save();
    
    res.status(201).json({
      message: 'Tournament created successfully',
      tournament: {
        id: newTournament._id,
        name: newTournament.name,
        gameVariant: newTournament.gameVariant,
        entryFee: newTournament.entryFee,
        maxParticipants: newTournament.maxParticipants,
        registrationStart: newTournament.registrationStart,
        registrationEnd: newTournament.registrationEnd,
        tournamentStart: newTournament.tournamentStart
      }
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const { status, gameVariant } = req.query;
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (gameVariant) {
      query.gameVariant = gameVariant;
    }
    
    // Get tournaments
    const tournaments = await Tournament.find(query)
      .populate('createdBy', 'username')
      .sort({ tournamentStart: 1 });
    
    res.json({
      tournaments: tournaments.map(tournament => ({
        id: tournament._id,
        name: tournament.name,
        description: tournament.description,
        gameVariant: tournament.gameVariant,
        entryFee: tournament.entryFee,
        prizePool: tournament.prizePool,
        maxParticipants: tournament.maxParticipants,
        currentParticipants: tournament.participants.length,
        status: tournament.status,
        registrationStart: tournament.registrationStart,
        registrationEnd: tournament.registrationEnd,
        tournamentStart: tournament.tournamentStart,
        createdBy: tournament.createdBy.username
      }))
    });
  } catch (error) {
    console.error('Error getting tournaments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('participants.user', 'username');
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    res.json({
      tournament: {
        id: tournament._id,
        name: tournament.name,
        description: tournament.description,
        gameVariant: tournament.gameVariant,
        entryFee: tournament.entryFee,
        prizePool: tournament.prizePool,
        prizeDistribution: tournament.prizeDistribution,
        maxParticipants: tournament.maxParticipants,
        participants: tournament.participants.map(p => ({
          id: p.user._id,
          username: p.user.username,
          status: p.status,
          joinedAt: p.joinedAt
        })),
        rounds: tournament.rounds,
        status: tournament.status,
        winners: tournament.winners,
        registrationStart: tournament.registrationStart,
        registrationEnd: tournament.registrationEnd,
        tournamentStart: tournament.tournamentStart,
        tournamentEnd: tournament.tournamentEnd,
        createdBy: tournament.createdBy.username
      }
    });
  } catch (error) {
    console.error('Error getting tournament:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a tournament
router.post('/:id/join', isAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    // Check if tournament is in registration phase
    if (tournament.status !== 'registration') {
      return res.status(400).json({ message: 'Tournament is not in registration phase' });
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
    
    // Check if user has enough balance
    if (req.user.balance < tournament.entryFee) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Deduct entry fee
    req.user.balance -= tournament.entryFee;
    await req.user.save();
    
    // Add user to participants
    tournament.participants.push({
      user: req.user._id,
      status: 'active',
      joinedAt: new Date()
    });
    
    // Recalculate prize pool
    tournament.calculatePrizePool();
    
    await tournament.save();
    
    res.json({
      message: 'Successfully joined tournament',
      tournament: {
        id: tournament._id,
        name: tournament.name,
        prizePool: tournament.prizePool,
        participants: tournament.participants.length,
        maxParticipants: tournament.maxParticipants
      },
      user: {
        balance: req.user.balance
      }
    });
  } catch (error) {
    console.error('Error joining tournament:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start a tournament (admin only)
router.post('/:id/start', isAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    // Check if user is the creator
    if (tournament.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to start this tournament' });
    }
    
    // Check if tournament can be started
    if (tournament.status !== 'registration') {
      return res.status(400).json({ message: 'Tournament is not in registration phase' });
    }
    
    // Check if there are enough participants (at least 4)
    if (tournament.participants.length < 4) {
      return res.status(400).json({ message: 'Not enough participants to start tournament' });
    }
    
    // Generate first round pairings
    const participants = tournament.participants.map(p => p.user);
    const pairings = generatePairings(participants);
    
    // Create first round
    tournament.rounds.push({
      roundNumber: 1,
      matches: pairings.map(pair => ({
        whitePlayer: pair[0],
        blackPlayer: pair[1],
        status: 'pending'
      })),
      startTime: new Date()
    });
    
    // Update tournament status
    tournament.status = 'active';
    
    await tournament.save();
    
    res.json({
      message: 'Tournament started successfully',
      tournament: {
        id: tournament._id,
        status: tournament.status,
        rounds: tournament.rounds
      }
    });
  } catch (error) {
    console.error('Error starting tournament:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate random pairings
function generatePairings(participants) {
  // Shuffle participants
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Create pairs
  const pairs = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push([shuffled[i], shuffled[i + 1]]);
    } else {
      // If odd number of participants, the last one gets a bye
      pairs.push([shuffled[i], null]);
    }
  }
  
  return pairs;
}

// Advance tournament to next round
router.post('/:id/advance', isAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('participants')
      .populate({
        path: 'rounds.matches',
        populate: {
          path: 'player1 player2 winner',
          model: 'User'
        }
      });
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    // Check if user is admin or tournament creator
    if (!req.user.isAdmin && tournament.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to advance this tournament' });
    }
    
    // Check if tournament is active
    if (tournament.status !== 'active') {
      return res.status(400).json({ message: 'Tournament must be active to advance rounds' });
    }
    
    // Check if current round is complete
    const currentRoundIndex = tournament.currentRound - 1;
    if (currentRoundIndex < 0 || currentRoundIndex >= tournament.rounds.length) {
      return res.status(400).json({ message: 'Invalid current round' });
    }
    
    const currentRound = tournament.rounds[currentRoundIndex];
    const allMatchesComplete = currentRound.matches.every(match => match.status === 'completed');
    
    if (!allMatchesComplete) {
      return res.status(400).json({ message: 'All matches in the current round must be completed before advancing' });
    }
    
    // Check if this was the final round
    if (currentRoundIndex === tournament.rounds.length - 1) {
      // Tournament is complete, distribute prizes
      await distributeTournamentPrizes(tournament);
      
      // Update tournament status
      tournament.status = 'completed';
      tournament.completedAt = new Date();
      await tournament.save();
      
      return res.json({
        message: 'Tournament completed and prizes distributed',
        tournament: {
          id: tournament._id,
          name: tournament.name,
          status: tournament.status
        }
      });
    }
    
    // Advance to next round
    tournament.currentRound += 1;
    
    // Update next round matches with winners from current round
    const nextRoundIndex = currentRoundIndex + 1;
    const nextRound = tournament.rounds[nextRoundIndex];
    
    // Pair winners from current round into next round matches
    let winnerIndex = 0;
    for (let i = 0; i < nextRound.matches.length; i++) {
      const match = nextRound.matches[i];
      
      // Set player1 from first winner
      if (winnerIndex < currentRound.matches.length) {
        const winner1 = currentRound.matches[winnerIndex].winner;
        if (winner1) {
          match.player1 = winner1;
        }
        winnerIndex++;
      }
      
      // Set player2 from second winner
      if (winnerIndex < currentRound.matches.length) {
        const winner2 = currentRound.matches[winnerIndex].winner;
        if (winner2) {
          match.player2 = winner2;
        }
        winnerIndex++;
      }
      
      // Update match status
      if (match.player1 && match.player2) {
        match.status = 'scheduled';
      }
    }
    
    await tournament.save();
    
    res.json({
      message: 'Tournament advanced to next round',
      tournament: {
        id: tournament._id,
        name: tournament.name,
        currentRound: tournament.currentRound
      }
    });
  } catch (error) {
    console.error('Error advancing tournament:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Distribute tournament prizes
async function distributeTournamentPrizes(tournament) {
  try {
    // Calculate prize pool
    const entryFee = tournament.entryFee;
    const participantCount = tournament.participants.length;
    const prizePool = entryFee * participantCount * 0.9; // 10% goes to house
    
    // Find the winner (final match winner)
    const finalRound = tournament.rounds[tournament.rounds.length - 1];
    const finalMatch = finalRound.matches[0];
    
    if (!finalMatch || !finalMatch.winner) {
      console.error('No winner found for tournament:', tournament._id);
      return;
    }
    
    // Find second place (loser of final match)
    const secondPlace = finalMatch.player1 && finalMatch.player1._id.toString() === finalMatch.winner.toString()
      ? finalMatch.player2
      : finalMatch.player1;
    
    // Find third place (winner of 3rd place match, or semifinal losers if no 3rd place match)
    let thirdPlace = null;
    if (tournament.rounds.length > 1) {
      const semifinalRound = tournament.rounds[tournament.rounds.length - 2];
      
      // Check if there's a 3rd place match
      const thirdPlaceMatch = tournament.rounds.find(round => round.name === '3rd Place');
      if (thirdPlaceMatch && thirdPlaceMatch.matches[0] && thirdPlaceMatch.matches[0].winner) {
        thirdPlace = thirdPlaceMatch.matches[0].winner;
      } else {
        // Use semifinal losers as tied for 3rd
        const semifinalLosers = semifinalRound.matches
          .filter(match => match.winner && match.status === 'completed')
          .map(match => {
            return match.player1 && match.player1._id.toString() === match.winner.toString()
              ? match.player2
              : match.player1;
          })
          .filter(player => player);
        
        if (semifinalLosers.length > 0) {
          thirdPlace = semifinalLosers[0];
        }
      }
    }
    
    // Calculate prize distribution
    // 1st place: 60% of prize pool
    // 2nd place: 30% of prize pool
    // 3rd place: 10% of prize pool
    const firstPrize = Math.floor(prizePool * 0.6);
    const secondPrize = Math.floor(prizePool * 0.3);
    const thirdPrize = Math.floor(prizePool * 0.1);
    
    // Update winner's balance
    const winner = await User.findById(finalMatch.winner);
    if (winner) {
      winner.balance += firstPrize;
      winner.tournamentsWon += 1;
      winner.totalEarnings += firstPrize;
      await winner.save();
    }
    
    // Update second place's balance
    if (secondPlace) {
      const secondPlaceUser = await User.findById(secondPlace);
      if (secondPlaceUser) {
        secondPlaceUser.balance += secondPrize;
        secondPlaceUser.totalEarnings += secondPrize;
        await secondPlaceUser.save();
      }
    }
    
    // Update third place's balance
    if (thirdPlace) {
      const thirdPlaceUser = await User.findById(thirdPlace);
      if (thirdPlaceUser) {
        thirdPlaceUser.balance += thirdPrize;
        thirdPlaceUser.totalEarnings += thirdPrize;
        await thirdPlaceUser.save();
      }
    }
    
    // Update tournament with prize distribution
    tournament.prizeDistribution = {
      first: {
        user: finalMatch.winner,
        amount: firstPrize
      },
      second: secondPlace ? {
        user: secondPlace,
        amount: secondPrize
      } : null,
      third: thirdPlace ? {
        user: thirdPlace,
        amount: thirdPrize
      } : null
    };
    
    await tournament.save();
    
    console.log(`Prizes distributed for tournament ${tournament._id}`);
  } catch (error) {
    console.error('Error distributing tournament prizes:', error);
  }
}

module.exports = router; 