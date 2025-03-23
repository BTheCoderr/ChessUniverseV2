/**
 * AI Player Module
 * Implements a chess AI player with multiple difficulty levels
 */
export default class AIPlayer {
  constructor(config = {}) {
    console.log('Initializing AI Player...');
    
    // Configuration with defaults
    this.config = {
      // AI difficulty level (1-10)
      difficulty: 3,
      
      // Default thinking time (ms)
      thinkingTime: 500,
      
      // Use Stockfish if available (for higher difficulties)
      useStockfish: true,
      
      // Stockfish specific settings
      stockfishPath: '/stockfish.js',
      
      // Additional options
      randomizeMoves: true, // Add some randomness to make AI less predictable
      
      ...config
    };
    
    // State
    this.isThinking = false;
    this.moveTimers = [];
    this.engine = null;
    this.isStockfishReady = false;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the AI player
   */
  init() {
    try {
      // Initialize Stockfish if enabled and available
      if (this.config.useStockfish && this.config.difficulty > 5) {
        this.initStockfish();
      }
      
      console.log(`AI Player initialized with difficulty ${this.config.difficulty}`);
      return true;
    } catch (error) {
      console.error('Error initializing AI player:', error);
      return false;
    }
  }
  
  /**
   * Initialize Stockfish engine
   */
  initStockfish() {
    try {
      // Check if Stockfish is available in the current environment
      if (typeof Worker !== 'undefined' && this.config.stockfishPath) {
        console.log('Initializing Stockfish engine...');
        this.engine = new Worker(this.config.stockfishPath);
        
        // Set up message handler
        this.engine.onmessage = (event) => {
          const message = event.data;
          
          if (message === 'uciok' || message === 'readyok') {
            this.isStockfishReady = true;
            this.configureStockfish();
          }
        };
        
        // Initialize engine
        this.engine.postMessage('uci');
        this.engine.postMessage('isready');
        
        return true;
      } else {
        console.warn('Stockfish not available, falling back to minimax');
        return false;
      }
    } catch (error) {
      console.error('Error initializing Stockfish:', error);
      return false;
    }
  }
  
  /**
   * Configure Stockfish engine based on difficulty
   */
  configureStockfish() {
    if (!this.engine || !this.isStockfishReady) return false;
    
    // Calculate skill level based on our difficulty (1-10 to Stockfish's 0-20)
    const skillLevel = Math.min(20, Math.floor(this.config.difficulty * 2));
    
    // Configure Stockfish
    this.engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
    
    // Set search depth based on difficulty
    const searchDepth = Math.min(15, 5 + this.config.difficulty);
    this.engine.postMessage(`setoption name MultiPV value 1`);
    
    console.log(`Stockfish configured with skill level ${skillLevel} and search depth ${searchDepth}`);
    return true;
  }
  
  /**
   * Calculate and make a move
   */
  makeMove(chessGame, callback) {
    if (this.isThinking) {
      console.warn('AI is already thinking');
      return false;
    }
    
    this.isThinking = true;
    console.log(`AI thinking at difficulty ${this.config.difficulty}...`);
    
    // Clear any existing move timers
    this.moveTimers.forEach(timer => clearTimeout(timer));
    this.moveTimers = [];
    
    // Add a small delay to simulate thinking
    const thinkingTimer = setTimeout(() => {
      try {
        // Get the current position
        const fen = chessGame.getFen();
        const turn = chessGame.getTurn();
        
        // Determine if we should use Stockfish or minimax
        if (this.isStockfishReady && this.config.difficulty > 5) {
          // Use Stockfish
          this.calculateMoveWithStockfish(fen, (move) => {
            this.executeMove(chessGame, move, callback);
          });
        } else {
          // Use minimax
          const move = this.calculateBestMove(chessGame);
          this.executeMove(chessGame, move, callback);
        }
      } catch (error) {
        console.error('Error calculating AI move:', error);
        this.isThinking = false;
        if (callback) callback(null);
      }
    }, this.config.thinkingTime);
    
    this.moveTimers.push(thinkingTimer);
    return true;
  }
  
  /**
   * Execute a move in the chess game
   */
  executeMove(chessGame, move, callback) {
    if (!move) {
      console.error('No valid move found');
      this.isThinking = false;
      if (callback) callback(null);
      return null;
    }
    
    console.log(`AI executing move: ${move.from}${move.to}${move.promotion || ''}`);
    
    // Make the move
    const result = chessGame.makeMove(move.from, move.to, move.promotion);
    
    // Reset thinking state
    this.isThinking = false;
    
    // Execute callback
    if (callback) callback(result);
    
    return result;
  }
  
  /**
   * Calculate the best move using minimax algorithm
   */
  calculateBestMove(chessGame) {
    const chess = chessGame.chess;
    const depth = Math.min(3, this.config.difficulty);
    const aiColor = chessGame.getTurn() === 'w' ? 'white' : 'black';
    
    console.log(`Calculating best move for ${aiColor} at depth ${depth}`);
    
    try {
      // Get all possible moves
      const moves = chess.moves({ verbose: true });
      
      if (moves.length === 0) return null;
      
      // For very low difficulty or as a fallback, just return a random legal move
      if (depth === 0 || this.config.difficulty === 1) {
        return moves[Math.floor(Math.random() * moves.length)];
      }
      
      let bestMove = null;
      let bestScore = aiColor === 'white' ? -Infinity : Infinity;
      let bestMoves = []; // Track equally good moves for randomization
      
      // Evaluate each move
      for (const move of moves) {
        // Make the move
        chess.move(move);
        
        // Calculate score for this move
        const score = this.minimax(
          chess, 
          depth - 1, 
          -Infinity, 
          Infinity, 
          aiColor === 'white' ? false : true
        );
        
        // Undo the move
        chess.undo();
        
        // Update best move if better score found
        if ((aiColor === 'white' && score > bestScore) || 
            (aiColor === 'black' && score < bestScore)) {
          bestScore = score;
          bestMove = move;
          bestMoves = [move];
        } 
        // If score is equal to best score, add to the list of best moves
        else if (score === bestScore) {
          bestMoves.push(move);
        }
      }
      
      // If randomization is enabled, select a random move from equally good moves
      if (this.config.randomizeMoves && bestMoves.length > 1) {
        bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        console.log(`Selecting from ${bestMoves.length} equally good moves`);
      }
      
      return bestMove;
    } catch (error) {
      console.error('Error calculating best move:', error);
      
      // Fallback to a random move on error
      const moves = chess.moves({ verbose: true });
      if (moves.length > 0) {
        return moves[Math.floor(Math.random() * moves.length)];
      }
      return null;
    }
  }
  
  /**
   * Minimax algorithm with alpha-beta pruning
   */
  minimax(chess, depth, alpha, beta, isMaximizingPlayer) {
    // Check for game end conditions or max depth
    if (depth === 0 || chess.isGameOver()) {
      return this.evaluatePosition(chess);
    }
    
    // Get all legal moves
    const moves = chess.moves({ verbose: true });
    
    if (isMaximizingPlayer) {
      let maxScore = -Infinity;
      
      // Try each move and find the best score
      for (const move of moves) {
        chess.move(move);
        const score = this.minimax(chess, depth - 1, alpha, beta, false);
        chess.undo();
        
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        
        // Alpha-beta pruning
        if (beta <= alpha) break;
      }
      
      return maxScore;
    } else {
      let minScore = Infinity;
      
      // Try each move and find the worst score
      for (const move of moves) {
        chess.move(move);
        const score = this.minimax(chess, depth - 1, alpha, beta, true);
        chess.undo();
        
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        
        // Alpha-beta pruning
        if (beta <= alpha) break;
      }
      
      return minScore;
    }
  }
  
  /**
   * Evaluate board position
   */
  evaluatePosition(chess) {
    // Check for checkmate
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -1000 : 1000;
    }
    
    // Check for draw
    if (chess.isDraw()) {
      return 0;
    }
    
    const board = chess.board();
    let score = 0;
    
    // Piece values
    const pieceValues = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0 // King has no material value in evaluation
    };
    
    // Simple position evaluation based on material
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        
        let value = pieceValues[piece.type] || 0;
        
        // Add small positional bonus based on piece type and position
        // This is a very basic position evaluation that can be improved
        value += this.getPositionalValue(piece, row, col);
        
        // Add/subtract value based on piece color
        score += (piece.color === 'w') ? value : -value;
      }
    }
    
    return score;
  }
  
  /**
   * Get positional value bonus for a piece
   */
  getPositionalValue(piece, row, col) {
    // Centralization bonus for pieces
    const centerBonus = (piece.type !== 'p' && piece.type !== 'k') ? 
      0.1 * (3.5 - Math.abs(3.5 - col)) * (3.5 - Math.abs(3.5 - row)) : 0;
      
    // Pawn advancement bonus
    const pawnAdvancement = (piece.type === 'p') ? 
      (piece.color === 'w' ? (7 - row) * 0.05 : row * 0.05) : 0;
    
    // King safety bonus (prefer corners in the endgame)
    const kingSafety = (piece.type === 'k') ? 
      ((col === 0 || col === 7) && (row === 0 || row === 7) ? 0.2 : 0) : 0;
    
    return centerBonus + pawnAdvancement + kingSafety;
  }
  
  /**
   * Calculate a move using Stockfish
   */
  calculateMoveWithStockfish(fen, callback) {
    if (!this.engine || !this.isStockfishReady) {
      console.warn('Stockfish not ready, falling back to minimax');
      callback(null);
      return false;
    }
    
    try {
      console.log('Calculating move with Stockfish...');
      
      // Set position in Stockfish
      this.engine.postMessage(`position fen ${fen}`);
      
      // Adjust thinking time based on difficulty
      const thinkTime = this.config.difficulty * 100; // 100ms per difficulty level
      
      // Calculate search depth based on difficulty
      const depth = Math.min(15, 5 + this.config.difficulty);
      
      // Start calculation
      this.engine.postMessage(`go depth ${depth} movetime ${thinkTime}`);
      
      // Set up one-time message handler for the best move
      const originalHandler = this.engine.onmessage;
      this.engine.onmessage = (event) => {
        const message = event.data;
        
        // Parse best move
        if (message.startsWith('bestmove')) {
          // Extract the move string (e.g., "e2e4", "a7a8q")
          const moveStr = message.split(' ')[1];
          
          // Restore original handler
          this.engine.onmessage = originalHandler;
          
          if (moveStr) {
            // Parse move
            const from = moveStr.substring(0, 2);
            const to = moveStr.substring(2, 4);
            const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;
            
            callback({ from, to, promotion });
          } else {
            callback(null);
          }
        }
      };
      
      return true;
    } catch (error) {
      console.error('Error calculating move with Stockfish:', error);
      callback(null);
      return false;
    }
  }
  
  /**
   * Set difficulty level
   */
  setDifficulty(level) {
    if (level < 1 || level > 10) {
      console.error('Invalid difficulty level, must be between 1 and 10');
      return false;
    }
    
    this.config.difficulty = level;
    
    // Reconfigure Stockfish if it's available
    if (this.isStockfishReady) {
      this.configureStockfish();
    }
    
    console.log(`AI difficulty set to ${level}`);
    return true;
  }
  
  /**
   * Set thinking time
   */
  setThinkingTime(time) {
    if (time < 100 || time > 10000) {
      console.error('Invalid thinking time, must be between 100ms and 10000ms');
      return false;
    }
    
    this.config.thinkingTime = time;
    console.log(`AI thinking time set to ${time}ms`);
    return true;
  }
  
  /**
   * Check if AI is currently thinking
   */
  isAiThinking() {
    return this.isThinking;
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    try {
      // Clear timers
      this.moveTimers.forEach(timer => clearTimeout(timer));
      
      // Terminate Stockfish if it's running
      if (this.engine) {
        this.engine.terminate();
        this.engine = null;
      }
      
      this.isThinking = false;
      this.isStockfishReady = false;
      
      return true;
    } catch (error) {
      console.error('Error disposing AI resources:', error);
      return false;
    }
  }
} 