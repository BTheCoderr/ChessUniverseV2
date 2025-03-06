const { Chess } = require('chess.js');
const stockfish = require('stockfish');

class StockfishAI {
  constructor(difficulty = 10) {
    this.engine = stockfish();
    this.difficulty = this.validateDifficulty(difficulty);
    this.isReady = false;
    this.moveCallback = null;
    
    // Initialize the engine
    this.init();
  }
  
  // Validate and normalize difficulty (1-20 scale)
  validateDifficulty(difficulty) {
    const level = parseInt(difficulty);
    if (isNaN(level) || level < 1) return 1;
    if (level > 20) return 20;
    return level;
  }
  
  // Initialize the Stockfish engine
  init() {
    this.engine.onmessage = (message) => {
      // Check if engine is ready
      if (message === 'readyok') {
        this.isReady = true;
        this.configureEngine();
      }
      
      // Parse best move response
      if (message.startsWith('bestmove')) {
        const moveStr = message.split(' ')[1];
        if (this.moveCallback && moveStr) {
          this.moveCallback(moveStr);
        }
      }
    };
    
    // Initialize engine
    this.engine.postMessage('uci');
    this.engine.postMessage('isready');
  }
  
  // Configure engine based on difficulty
  configureEngine() {
    // Set skill level (0-20)
    this.engine.postMessage(`setoption name Skill Level value ${this.difficulty}`);
    
    // Set search depth based on difficulty
    const depth = Math.min(Math.floor(this.difficulty / 2) + 1, 15);
    this.engine.postMessage(`setoption name Contempt value ${this.difficulty - 10}`);
    this.engine.postMessage(`setoption name Threads value 2`);
    this.engine.postMessage(`setoption name Hash value 128`);
    this.engine.postMessage(`setoption name MultiPV value 1`);
    this.engine.postMessage(`setoption name Move Overhead value 30`);
    this.engine.postMessage(`setoption name Minimum Thinking Time value ${50 + (this.difficulty * 5)}`);
    this.engine.postMessage(`setoption name Slow Mover value ${80 + (this.difficulty * 2)}`);
  }
  
  // Get the best move for a given position
  getBestMove(fen, callback, timeLimit = 1000) {
    if (!this.isReady) {
      setTimeout(() => this.getBestMove(fen, callback, timeLimit), 100);
      return;
    }
    
    this.moveCallback = callback;
    
    // Set position and calculate
    this.engine.postMessage(`position fen ${fen}`);
    
    // Adjust time based on difficulty
    const adjustedTime = timeLimit * (this.difficulty / 10);
    this.engine.postMessage(`go movetime ${adjustedTime}`);
  }
  
  // Make a move in the given game
  makeMove(game, callback) {
    if (!(game instanceof Chess)) {
      throw new Error('Invalid chess game instance');
    }
    
    this.getBestMove(game.fen(), (moveStr) => {
      try {
        // Parse move string (e.g., "e2e4", "a7a8q")
        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;
        
        // Make the move
        const move = game.move({
          from,
          to,
          promotion
        });
        
        callback(move);
      } catch (error) {
        console.error('Error making AI move:', error);
        callback(null);
      }
    });
  }
  
  // Set difficulty level
  setDifficulty(difficulty) {
    this.difficulty = this.validateDifficulty(difficulty);
    if (this.isReady) {
      this.configureEngine();
    }
  }
  
  // Clean up resources
  destroy() {
    if (this.engine) {
      this.engine.postMessage('quit');
    }
  }
}

module.exports = StockfishAI; 