class GameAnalytics {
    constructor() {
        this.stats = {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            averageGameLength: 0,
            totalMoves: 0,
            capturedPieces: {
                white: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 },
                black: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 }
            },
            openings: {},
            timeControls: {},
            ratingHistory: [],
            winningStreak: 0,
            bestWinningStreak: 0,
            currentStreak: 0
        };
        
        this.currentGame = {
            startTime: null,
            moves: [],
            captures: [],
            timePerMove: [],
            positionEvaluations: [],
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0
        };
        
        this.loadStats();
    }

    startGame() {
        this.currentGame = {
            startTime: Date.now(),
            moves: [],
            captures: [],
            timePerMove: [],
            positionEvaluations: [],
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0
        };
    }

    recordMove(move, timeSpent, evaluation) {
        if (!this.currentGame.startTime) {
            this.startGame();
        }

        this.currentGame.moves.push(move);
        this.currentGame.timePerMove.push(timeSpent);
        this.currentGame.positionEvaluations.push(evaluation);

        // Record captures
        if (move.captured) {
            this.currentGame.captures.push({
                piece: move.captured,
                color: move.color === 'w' ? 'black' : 'white',
                move: this.currentGame.moves.length
            });
        }

        // Analyze move quality
        if (evaluation) {
            const prevEval = this.currentGame.positionEvaluations[this.currentGame.positionEvaluations.length - 2];
            if (prevEval) {
                const evalDiff = Math.abs(evaluation - prevEval);
                if (evalDiff >= 2) {
                    this.currentGame.blunders++;
                } else if (evalDiff >= 1) {
                    this.currentGame.mistakes++;
                } else if (evalDiff >= 0.5) {
                    this.currentGame.inaccuracies++;
                }
            }
        }
    }

    endGame(result, timeControl, opening, finalRating) {
        const gameLength = Date.now() - this.currentGame.startTime;
        const totalMoves = this.currentGame.moves.length;

        // Update general stats
        this.stats.gamesPlayed++;
        this.stats.totalMoves += totalMoves;
        this.stats.averageGameLength = (this.stats.averageGameLength * (this.stats.gamesPlayed - 1) + gameLength) / this.stats.gamesPlayed;

        // Update result stats
        if (result === 'win') {
            this.stats.wins++;
            this.stats.currentStreak = Math.max(0, this.stats.currentStreak + 1);
            this.stats.bestWinningStreak = Math.max(this.stats.bestWinningStreak, this.stats.currentStreak);
        } else if (result === 'loss') {
            this.stats.losses++;
            this.stats.currentStreak = Math.min(0, this.stats.currentStreak - 1);
        } else {
            this.stats.draws++;
            this.stats.currentStreak = 0;
        }

        // Update opening stats
        if (opening) {
            this.stats.openings[opening] = this.stats.openings[opening] || { total: 0, wins: 0, losses: 0, draws: 0 };
            this.stats.openings[opening].total++;
            this.stats.openings[opening][result + 's']++;
        }

        // Update time control stats
        if (timeControl) {
            this.stats.timeControls[timeControl] = this.stats.timeControls[timeControl] || { total: 0, wins: 0, losses: 0, draws: 0 };
            this.stats.timeControls[timeControl].total++;
            this.stats.timeControls[timeControl][result + 's']++;
        }

        // Update captured pieces
        this.currentGame.captures.forEach(capture => {
            this.stats.capturedPieces[capture.color][capture.piece]++;
        });

        // Update rating history
        if (finalRating) {
            this.stats.ratingHistory.push({
                rating: finalRating,
                timestamp: Date.now(),
                result: result
            });
        }

        this.saveStats();
        return this.generateGameSummary();
    }

    generateGameSummary() {
        const summary = {
            duration: Date.now() - this.currentGame.startTime,
            totalMoves: this.currentGame.moves.length,
            captures: this.currentGame.captures.length,
            averageTimePerMove: this.currentGame.timePerMove.reduce((a, b) => a + b, 0) / this.currentGame.moves.length,
            accuracy: this.calculateAccuracy(),
            blunders: this.currentGame.blunders,
            mistakes: this.currentGame.mistakes,
            inaccuracies: this.currentGame.inaccuracies,
            evaluationGraph: this.currentGame.positionEvaluations
        };

        return summary;
    }

    calculateAccuracy() {
        if (this.currentGame.positionEvaluations.length < 2) return 100;

        let totalAccuracy = 0;
        let count = 0;

        for (let i = 1; i < this.currentGame.positionEvaluations.length; i++) {
            const prevEval = this.currentGame.positionEvaluations[i - 1];
            const currentEval = this.currentGame.positionEvaluations[i];
            
            if (prevEval !== null && currentEval !== null) {
                const evalDiff = Math.abs(currentEval - prevEval);
                const moveAccuracy = Math.max(0, 100 - (evalDiff * 20));
                totalAccuracy += moveAccuracy;
                count++;
            }
        }

        return count > 0 ? totalAccuracy / count : 100;
    }

    getStats() {
        return {
            ...this.stats,
            winRate: this.stats.gamesPlayed > 0 ? (this.stats.wins / this.stats.gamesPlayed) * 100 : 0,
            drawRate: this.stats.gamesPlayed > 0 ? (this.stats.draws / this.stats.gamesPlayed) * 100 : 0,
            averageMovesPerGame: this.stats.gamesPlayed > 0 ? this.stats.totalMoves / this.stats.gamesPlayed : 0
        };
    }

    getOpeningStats() {
        return Object.entries(this.stats.openings).map(([opening, stats]) => ({
            name: opening,
            ...stats,
            winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
        })).sort((a, b) => b.total - a.total);
    }

    getTimeControlStats() {
        return Object.entries(this.stats.timeControls).map(([timeControl, stats]) => ({
            timeControl,
            ...stats,
            winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
        })).sort((a, b) => b.total - a.total);
    }

    getRatingHistory() {
        return this.stats.ratingHistory.map((entry, index) => ({
            ...entry,
            change: index > 0 ? entry.rating - this.stats.ratingHistory[index - 1].rating : 0
        }));
    }

    getPerformanceByTimeOfDay() {
        return this.stats.ratingHistory.reduce((acc, entry) => {
            const hour = new Date(entry.timestamp).getHours();
            acc[hour] = acc[hour] || { games: 0, wins: 0 };
            acc[hour].games++;
            if (entry.result === 'win') acc[hour].wins++;
            return acc;
        }, {});
    }

    loadStats() {
        try {
            const saved = localStorage.getItem('chessGameStats');
            if (saved) {
                this.stats = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading game stats:', error);
        }
    }

    saveStats() {
        try {
            localStorage.setItem('chessGameStats', JSON.stringify(this.stats));
        } catch (error) {
            console.error('Error saving game stats:', error);
        }
    }

    resetStats() {
        this.stats = {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            averageGameLength: 0,
            totalMoves: 0,
            capturedPieces: {
                white: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 },
                black: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 }
            },
            openings: {},
            timeControls: {},
            ratingHistory: [],
            winningStreak: 0,
            bestWinningStreak: 0,
            currentStreak: 0
        };
        this.saveStats();
    }

    exportStats() {
        return JSON.stringify({
            stats: this.stats,
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    importStats(statsJson) {
        try {
            const imported = JSON.parse(statsJson);
            if (imported.stats) {
                this.stats = imported.stats;
                this.saveStats();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error importing stats:', error);
            return false;
        }
    }
}

// Export the GameAnalytics class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameAnalytics;
} else {
    window.GameAnalytics = GameAnalytics;
} 