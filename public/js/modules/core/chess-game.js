/**
 * Core Chess Game Module
 * Handles the game logic and state management
 */
export default class ChessGame {
  constructor(config = {}) {
    // Core game state
    this.chess = null;
    this.selectedSquare = null;
    this.gameOver = false;
    this.playerColor = config.playerColor || 'black'; // Default to black
    
    // Configuration
    this.config = {
      startPosition: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', // Black moves first
      ...config
    };
    
    // Event callbacks
    this.callbacks = {
      onMove: null,
      onGameOver: null,
      onCheck: null,
      onSelectionChange: null,
      onError: null
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the chess game
   */
  init() {
    try {
      // Create new chess instance with black to move first
      if (typeof Chess === 'undefined') {
        throw new Error('Chess.js library not loaded');
      }
      this.chess = new Chess();
      // Set the starting position
      this.chess.load(this.config.startPosition);
      this.gameOver = false;
      this.selectedSquare = null;
      
      return true;
    } catch (error) {
      this.handleError('Failed to initialize chess game', error);
      return false;
    }
  }
  
  /**
   * Reset the game
   */
  reset() {
    return this.init();
  }
  
  /**
   * Get current FEN position
   */
  getFen() {
    return this.chess.fen();
  }
  
  /**
   * Get piece at the given square
   */
  getPiece(square) {
    return this.chess.get(square);
  }
  
  /**
   * Get all pieces on the board
   */
  getPieces() {
    return this.chess.board();
  }
  
  /**
   * Get current turn ('w' or 'b')
   */
  getTurn() {
    return this.chess.turn();
  }
  
  /**
   * Check if it's currently the player's turn
   */
  isPlayerTurn() {
    const currentTurn = this.chess.turn();
    return (currentTurn === 'w' && this.playerColor === 'white') || 
           (currentTurn === 'b' && this.playerColor === 'black');
  }
  
  /**
   * Make a move on the board
   */
  makeMove(from, to, promotion = 'q') {
    try {
      // Try to make the move
      const move = this.chess.move({
        from,
        to,
        promotion
      });
      
      if (!move) {
        this.handleError('Invalid move');
        return null;
      }
      
      // Clear selection
      this.selectedSquare = null;
      
      // Check for game over conditions
      this.checkGameOver();
      
      // Trigger move callback
      if (this.callbacks.onMove) {
        this.callbacks.onMove(move);
      }
      
      // Check for check
      if (this.chess.inCheck()) {
        if (this.callbacks.onCheck) {
          this.callbacks.onCheck(this.chess.turn());
        }
      }
      
      return move;
    } catch (error) {
      this.handleError('Error making move', error);
      return null;
    }
  }
  
  /**
   * Select a square on the board
   */
  selectSquare(square) {
    // If a square is already selected, try to make a move
    if (this.selectedSquare) {
      const move = this.makeMove(this.selectedSquare, square);
      return { type: 'move', move };
    }
    
    // Check if there's a piece on the selected square
    const piece = this.chess.get(square);
    
    if (!piece) {
      return { type: 'empty' };
    }
    
    // Check if the piece belongs to the current player
    const isCurrentPlayerPiece = (this.chess.turn() === 'w' && piece.color === 'w') || 
                               (this.chess.turn() === 'b' && piece.color === 'b');
    
    if (!isCurrentPlayerPiece) {
      return { type: 'opponent' };
    }
    
    // Select the square
    this.selectedSquare = square;
    
    // Get legal moves for the selected piece
    const legalMoves = this.getLegalMovesForSquare(square);
    
    // Trigger selection change callback
    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange(square, legalMoves);
    }
    
    return { 
      type: 'select', 
      square, 
      piece, 
      legalMoves 
    };
  }
  
  /**
   * Clear the current selection
   */
  clearSelection() {
    const previousSelection = this.selectedSquare;
    this.selectedSquare = null;
    
    if (this.callbacks.onSelectionChange && previousSelection) {
      this.callbacks.onSelectionChange(null, []);
    }
    
    return previousSelection;
  }
  
  /**
   * Get legal moves for the selected square
   */
  getLegalMovesForSquare(square) {
    try {
      return this.chess.moves({
        square,
        verbose: true
      });
    } catch (error) {
      this.handleError('Error getting legal moves', error);
      return [];
    }
  }
  
  /**
   * Get all legal moves for the current position
   */
  getAllLegalMoves() {
    try {
      return this.chess.moves({ verbose: true });
    } catch (error) {
      this.handleError('Error getting all legal moves', error);
      return [];
    }
  }
  
  /**
   * Check if the game is over
   */
  checkGameOver() {
    if (this.chess.isGameOver()) {
      this.gameOver = true;
      
      let result = null;
      let reason = null;
      
      if (this.chess.isCheckmate()) {
        result = this.chess.turn() === 'w' ? 'black' : 'white';
        reason = 'checkmate';
      } else if (this.chess.isDraw()) {
        result = 'draw';
        if (this.chess.isStalemate()) {
          reason = 'stalemate';
        } else if (this.chess.isThreefoldRepetition()) {
          reason = 'repetition';
        } else if (this.chess.isInsufficientMaterial()) {
          reason = 'insufficient';
        } else {
          reason = 'fifty-move-rule';
        }
      }
      
      if (this.callbacks.onGameOver) {
        this.callbacks.onGameOver(result, reason);
      }
      
      return { result, reason };
    }
    
    return false;
  }
  
  /**
   * Check if the game is in check
   */
  isInCheck() {
    return this.chess.inCheck();
  }
  
  /**
   * Check if the game is over
   */
  isGameOver() {
    return this.gameOver;
  }
  
  /**
   * Resign the game
   */
  resign() {
    if (this.gameOver) return false;
    
    this.gameOver = true;
    const winner = this.playerColor === 'white' ? 'black' : 'white';
    
    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(winner, 'resignation');
    }
    
    return winner;
  }
  
  /**
   * Set a callback function
   */
  setCallback(event, callback) {
    if (typeof callback === 'function' && event in this.callbacks) {
      this.callbacks[event] = callback;
      return true;
    }
    return false;
  }
  
  /**
   * Get game status text
   */
  getStatusText() {
    // Check if game is over
    if (this.chess.game_over()) {
      // Check for checkmate
      if (this.chess.in_checkmate()) {
        const winner = this.chess.turn() === 'w' ? 'Black' : 'White';
        return `Checkmate! ${winner} wins`;
      }
      
      // Check for draw conditions
      if (this.chess.in_draw()) {
        if (this.chess.in_stalemate()) {
          return 'Game over - Stalemate';
        }
        if (this.chess.insufficient_material()) {
          return 'Game over - Draw (Insufficient material)';
        }
        if (this.chess.in_threefold_repetition()) {
          return 'Game over - Draw (Threefold repetition)';
        }
        return 'Game over - Draw';
      }
    }
    
    // Game is ongoing
    if (this.chess.in_check()) {
      return `${this.chess.turn() === 'w' ? 'White' : 'Black'} is in check`;
    }
    
    return `${this.chess.turn() === 'w' ? 'White' : 'Black'} to move`;
  }
  
  /**
   * Handle errors
   */
  handleError(message, error = null) {
    console.error(`Chess Game Error: ${message}`, error);
    
    if (this.callbacks.onError) {
      this.callbacks.onError(message, error);
    }
    
    return { message, error };
  }
  
  /**
   * Convert piece type to full name
   */
  static getPieceTypeName(type) {
    const pieceTypes = {
      p: 'pawn',
      r: 'rook',
      n: 'knight',
      b: 'bishop',
      q: 'queen',
      k: 'king'
    };
    
    return pieceTypes[type] || '';
  }
} 