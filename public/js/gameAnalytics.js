class GameAnalytics {
    constructor(chessAI) {
        this.chessAI = chessAI;
        this.gameHistory = [];
        this.currentGameMoves = [];
        this.currentGameAnalysis = {};
        
        // Initialize UI elements
        this.moveHistoryElement = document.getElementById('moveHistory');
        
        this.loadHistory();
    }

    recordMove(move, fen, playerColor) {
        this.currentGameMoves.push({
            move: move,
            fen: fen,
            playerColor: playerColor,
            timestamp: new Date().toISOString()
        });
        
        // Analyze position after move
        this.analyzePosition(fen).then(evaluation => {
            this.currentGameAnalysis[fen] = evaluation;
            this.updateMoveDisplay(move, evaluation);
        });
    }

    async analyzePosition(fen) {
        try {
            return await this.chessAI.getPositionEvaluation(fen);
        } catch (error) {
            console.error('Error analyzing position:', error);
            return null;
        }
    }

    updateMoveDisplay(move, evaluation) {
        const moveNumber = Math.floor((this.currentGameMoves.length + 1) / 2);
        const isWhiteMove = this.currentGameMoves.length % 2 === 1;
        
        const moveElement = document.createElement('div');
        moveElement.className = 'move-item';
        
        let evaluationText = '';
        if (evaluation !== null) {
            if (evaluation === Infinity) {
                evaluationText = '♔ Mate';
            } else if (evaluation === -Infinity) {
                evaluationText = '⚫ Mate';
            } else {
                evaluationText = evaluation > 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1);
            }
        }
        
        moveElement.innerHTML = `
            <span class="move-number">${moveNumber}${isWhiteMove ? '.' : '...'}</span>
            <span class="move-notation">${move}</span>
            <span class="move-evaluation">${evaluationText}</span>
        `;
        
        if (this.moveHistoryElement) {
            this.moveHistoryElement.appendChild(moveElement);
            this.moveHistoryElement.scrollTop = this.moveHistoryElement.scrollHeight;
        }
    }

    endGame(result) {
        const gameRecord = {
            moves: this.currentGameMoves,
            analysis: this.currentGameAnalysis,
            result: result,
            timestamp: new Date().toISOString()
        };
        
        this.gameHistory.push(gameRecord);
        this.saveHistory();
        
        // Reset current game data
        this.currentGameMoves = [];
        this.currentGameAnalysis = {};
        
        return this.generateGameSummary(gameRecord);
    }

    generateGameSummary(gameRecord) {
        const totalMoves = gameRecord.moves.length;
        const whiteMovesCount = Math.ceil(totalMoves / 2);
        const blackMovesCount = Math.floor(totalMoves / 2);
        
        // Calculate average position evaluation
        const evaluations = Object.values(gameRecord.analysis).filter(e => 
            e !== Infinity && e !== -Infinity
        );
        const avgEvaluation = evaluations.length > 0 
            ? evaluations.reduce((a, b) => a + b, 0) / evaluations.length 
            : 0;
        
        return {
            totalMoves,
            whiteMovesCount,
            blackMovesCount,
            averageEvaluation: avgEvaluation.toFixed(2),
            result: gameRecord.result,
            timestamp: gameRecord.timestamp
        };
    }

    getRecentGames(limit = 10) {
        return this.gameHistory
            .slice(-limit)
            .map(this.generateGameSummary)
            .reverse();
    }

    saveHistory() {
        try {
            localStorage.setItem('gameHistory', JSON.stringify(this.gameHistory));
        } catch (error) {
            console.error('Error saving game history:', error);
        }
    }

    loadHistory() {
        try {
            const savedHistory = localStorage.getItem('gameHistory');
            if (savedHistory) {
                this.gameHistory = JSON.parse(savedHistory);
            }
        } catch (error) {
            console.error('Error loading game history:', error);
            this.gameHistory = [];
        }
    }

    clearHistory() {
        this.gameHistory = [];
        this.saveHistory();
    }
}

// Export the GameAnalytics class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameAnalytics;
} else {
    window.GameAnalytics = GameAnalytics;
} 