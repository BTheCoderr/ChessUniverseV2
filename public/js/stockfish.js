class ChessAI {
    constructor(skillLevel = 10) {
        this.engine = new Worker('/stockfish.js');
        this.skillLevel = skillLevel;
        this.isReady = false;
        this.moveHistory = [];
        this.initializeEngine();
    }

    // Difficulty presets
    static DIFFICULTY_PRESETS = {
        BEGINNER: { skillLevel: 3, depth: 5, timeLimit: 500 },
        INTERMEDIATE: { skillLevel: 10, depth: 12, timeLimit: 1000 },
        ADVANCED: { skillLevel: 15, depth: 15, timeLimit: 2000 },
        EXPERT: { skillLevel: 20, depth: 20, timeLimit: 3000 }
    };

    initializeEngine() {
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                reject(new Error('Engine initialization timeout'));
            }, 5000);

            this.engine.onmessage = (event) => {
                const msg = event.data;
                if (msg === 'readyok') {
                    this.isReady = true;
                    clearTimeout(timeout);
                    resolve();
                }
            };

            this.engine.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };

            this.engine.postMessage('uci');
            this.engine.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
            this.engine.postMessage('setoption name Threads value 4');
            this.engine.postMessage('setoption name Hash value 128');
            this.engine.postMessage('isready');
        });
    }

    setDifficulty(preset) {
        const config = ChessAI.DIFFICULTY_PRESETS[preset.toUpperCase()];
        if (!config) {
            throw new Error('Invalid difficulty preset');
        }
        this.skillLevel = config.skillLevel;
        this.engine.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
        return config;
    }

    async getBestMove(fen, options = {}) {
        if (!this.isReady) {
            throw new Error('Engine not ready');
        }

        const config = {
            timeLimit: options.timeLimit || 1000,
            depth: options.depth || 15,
            multipv: options.multipv || 1 // Number of alternative moves to consider
        };

        return new Promise((resolve, reject) => {
            let bestMove = null;
            let alternatives = [];
            let timeout = setTimeout(() => {
                this.engine.postMessage('stop');
                if (bestMove) {
                    resolve({ bestMove, alternatives });
                } else {
                    reject(new Error('Move calculation timeout'));
                }
            }, config.timeLimit + 1000);

            this.engine.onmessage = (event) => {
                const msg = event.data;
                
                // Parse evaluation info
                if (msg.includes('info depth')) {
                    const pvMatch = msg.match(/pv\s+(.*?)(?=\s+|$)/);
                    const scoreMatch = msg.match(/score cp\s+(-?\d+)/);
                    const mateMatch = msg.match(/score mate\s+(-?\d+)/);
                    
                    if (pvMatch && (scoreMatch || mateMatch)) {
                        const moves = pvMatch[1].split(' ');
                        const score = scoreMatch ? parseInt(scoreMatch[1]) / 100 : 
                                    (mateMatch[1].startsWith('-') ? -Infinity : Infinity);
                        
                        alternatives.push({
                            moves,
                            score,
                            mate: mateMatch ? parseInt(mateMatch[1]) : null
                        });
                    }
                }

                // Get best move
                if (msg.includes('bestmove')) {
                    bestMove = msg.split(' ')[1];
                    clearTimeout(timeout);
                    
                    // Sort alternatives by score
                    alternatives.sort((a, b) => b.score - a.score);
                    // Keep only the top N alternatives
                    alternatives = alternatives.slice(0, config.multipv);
                    
                    resolve({ bestMove, alternatives });
                }
            };

            this.engine.postMessage('position fen ' + fen);
            this.engine.postMessage(`setoption name MultiPV value ${config.multipv}`);
            this.engine.postMessage(`go depth ${config.depth} movetime ${config.timeLimit}`);
        });
    }

    async getPositionEvaluation(fen, depth = 15) {
        if (!this.isReady) {
            throw new Error('Engine not ready');
        }

        return new Promise((resolve, reject) => {
            let evaluation = null;
            let timeout = setTimeout(() => {
                this.engine.postMessage('stop');
                if (evaluation !== null) {
                    resolve(evaluation);
                } else {
                    reject(new Error('Evaluation timeout'));
                }
            }, 3000);

            this.engine.onmessage = (event) => {
                const msg = event.data;
                
                // Parse score
                if (msg.includes('score cp')) {
                    const score = parseInt(msg.split('score cp ')[1].split(' ')[0]);
                    evaluation = score / 100;
                } else if (msg.includes('score mate')) {
                    const moves = parseInt(msg.split('score mate ')[1].split(' ')[0]);
                    evaluation = moves > 0 ? Infinity : -Infinity;
                }

                // Get final evaluation
                if (msg.includes('bestmove') && evaluation !== null) {
                    clearTimeout(timeout);
                    resolve({
                        score: evaluation,
                        depth: depth,
                        isMate: evaluation === Infinity || evaluation === -Infinity
                    });
                }
            };

            this.engine.postMessage('position fen ' + fen);
            this.engine.postMessage(`go depth ${depth}`);
        });
    }

    async analyzeMoveQuality(move, fen, playerColor) {
        const evaluation = await this.getPositionEvaluation(fen);
        const moveScore = evaluation.score;
        
        // Get best move in position
        const { bestMove, alternatives } = await this.getBestMove(fen, { multipv: 3 });
        const bestScore = alternatives[0].score;
        
        // Calculate move accuracy
        const scoreDiff = Math.abs(moveScore - bestScore);
        let quality;
        
        if (scoreDiff < 0.1) quality = 'excellent';
        else if (scoreDiff < 0.3) quality = 'good';
        else if (scoreDiff < 0.7) quality = 'inaccuracy';
        else if (scoreDiff < 1.5) quality = 'mistake';
        else quality = 'blunder';
        
        return {
            quality,
            scoreDiff,
            bestMove,
            alternatives
        };
    }

    recordMove(move, fen) {
        this.moveHistory.push({ move, fen });
    }

    getMoveHistory() {
        return this.moveHistory;
    }

    clearMoveHistory() {
        this.moveHistory = [];
    }

    terminate() {
        if (this.engine) {
            this.engine.postMessage('quit');
            this.engine.terminate();
        }
        this.isReady = false;
    }
}

// Export the ChessAI class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessAI;
} else {
    window.ChessAI = ChessAI;
} 