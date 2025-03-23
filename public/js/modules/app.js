/**
 * Main Chess Application Module
 * Connects the game logic and UI components
 */
import ChessGame from './core/chess-game.js';
import BoardUI from './ui/board-ui.js';
import MoveHistory from './ui/move-history.js';
import SoundManager from './utils/sound-manager.js';

export default class ChessApp {
  constructor(config = {}) {
    console.log('Initializing Chess Application...');
    
    // Configuration with defaults
    this.config = {
      // Board configuration
      boardSelector: '#chessboard',
      statusSelector: '#game-status',
      whitePlayerSelector: '#white-player',
      blackPlayerSelector: '#black-player',
      
      // Game configuration
      playerColor: 'black', // Default to black
      startPosition: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', // Black moves first
      
      // UI configuration
      pieceImagePath: 'images/pieces/{color}_{type}.png',
      
      // Game buttons
      newGameBtnSelector: '#new-game-btn',
      resignBtnSelector: '#resign-btn',
      
      // Move history configuration
      moveHistorySelector: '#moves-list',
      
      // Sound configuration
      sounds: {
        move: '/audio/Move.mp3',
        capture: '/audio/Capture.mp3',
        check: '/audio/Check.mp3',
        checkmate: '/audio/Checkmate.mp3',
        castle: '/audio/Castle.mp3',
        promote: '/audio/Promote.mp3',
        draw: '/audio/Draw.mp3',
        error: '/audio/Error.mp3',
        start: '/audio/GameStart.mp3'
      },
      
      ...config
    };
    
    // Initialize components
    this.game = null;
    this.boardUI = null;
    this.moveHistory = null;
    this.soundManager = null;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the application
   */
  init() {
    try {
      // Initialize sound manager
      this.soundManager = new SoundManager({
        sounds: this.config.sounds
      });
      
      // Initialize game logic
      this.game = new ChessGame({
        playerColor: this.config.playerColor,
        startPosition: this.config.startPosition
      });
      
      // Initialize board UI
      this.boardUI = new BoardUI({
        boardSelector: this.config.boardSelector,
        statusSelector: this.config.statusSelector,
        whitePlayerSelector: this.config.whitePlayerSelector,
        blackPlayerSelector: this.config.blackPlayerSelector,
        pieceImagePath: this.config.pieceImagePath
      });
      
      // Initialize move history
      this.moveHistory = new MoveHistory({
        containerSelector: this.config.moveHistorySelector
      });
      
      // Create the board
      this.boardUI.createBoard();
      
      // Connect game events to UI updates
      this.connectEvents();
      
      // Setup button event listeners
      this.setupButtons();
      
      // Update the board with the initial position
      this.updateBoard();
      
      // Play game start sound
      this.soundManager.play('start');
      
      console.log('Chess Application initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing chess application:', error);
      return false;
    }
  }
  
  /**
   * Connect game events to UI updates
   */
  connectEvents() {
    // Set up the square click handler
    this.boardUI.setListener('onSquareClick', this.handleSquareClick.bind(this));
    
    // Set up game event handlers
    this.game.setCallback('onMove', this.handleMove.bind(this));
    this.game.setCallback('onGameOver', this.handleGameOver.bind(this));
    this.game.setCallback('onCheck', this.handleCheck.bind(this));
    this.game.setCallback('onSelectionChange', this.handleSelectionChange.bind(this));
    this.game.setCallback('onError', this.handleError.bind(this));
    
    // Set up move history handlers
    this.moveHistory.setCallback('onMoveSelect', this.handleMoveSelect.bind(this));
  }
  
  /**
   * Set up button event listeners
   */
  setupButtons() {
    // New Game button
    const newGameBtn = document.querySelector(this.config.newGameBtnSelector);
    if (newGameBtn) {
      newGameBtn.addEventListener('click', this.startNewGame.bind(this));
    }
    
    // Resign button
    const resignBtn = document.querySelector(this.config.resignBtnSelector);
    if (resignBtn) {
      resignBtn.addEventListener('click', this.resignGame.bind(this));
    }
  }
  
  /**
   * Update the board with the current game state
   */
  updateBoard() {
    const pieces = this.game.getPieces();
    this.boardUI.updateBoard(pieces);
    
    // Update status
    const statusText = this.game.getStatusText();
    this.boardUI.updateStatus(statusText);
    
    // Update active player
    const isWhiteTurn = this.game.getTurn() === 'w';
    this.boardUI.updateActivePlayer(isWhiteTurn);
  }
  
  /**
   * Handle square click
   */
  handleSquareClick(square) {
    console.log(`Square clicked: ${square}`);
    
    // Don't do anything if game is over
    if (this.game.isGameOver()) {
      return;
    }
    
    // Process the selection in the game logic
    const result = this.game.selectSquare(square);
    
    // Handle different selection results
    switch (result.type) {
      case 'select':
        console.log(`Selected ${result.piece.color} ${result.piece.type} at ${square}`);
        this.boardUI.highlightSelection(square, result.legalMoves);
        break;
        
      case 'move':
        console.log(`Move made: ${result.move.san}`);
        this.boardUI.clearHighlights();
        if (result.move) {
          this.boardUI.highlightLastMove(result.move.from, result.move.to);
        }
        break;
        
      case 'empty':
        console.log('Empty square clicked');
        this.game.clearSelection();
        this.boardUI.clearHighlights();
        break;
        
      case 'opponent':
        console.log('Opponent piece clicked');
        this.game.clearSelection();
        this.boardUI.clearHighlights();
        break;
    }
  }
  
  /**
   * Handle move event
   */
  handleMove(move) {
    console.log('Move made:', move);
    
    // Update the board after a move
    this.updateBoard();
    
    // Add move to history
    this.moveHistory.addMove(move);
    
    // Play appropriate sound for the move
    this.soundManager.playMoveSound(move);
  }
  
  /**
   * Handle game over event
   */
  handleGameOver(result, reason) {
    console.log(`Game over: ${result} wins by ${reason}`);
    
    // Update status text
    this.boardUI.updateStatus(this.game.getStatusText());
    
    // Play appropriate sound
    if (reason === 'checkmate') {
      this.soundManager.play('checkmate');
    } else if (reason === 'draw') {
      this.soundManager.play('draw');
    }
    
    // Show game over notification
    this.showNotification(`Game over - ${result} wins by ${reason}`, 'info');
  }
  
  /**
   * Handle check event
   */
  handleCheck(color) {
    console.log(`${color === 'w' ? 'White' : 'Black'} is in check`);
    
    // Play check sound
    this.soundManager.play('check');
  }
  
  /**
   * Handle selection change event
   */
  handleSelectionChange(square, legalMoves) {
    if (square) {
      this.boardUI.highlightSelection(square, legalMoves);
    } else {
      this.boardUI.clearHighlights();
    }
  }
  
  /**
   * Handle move selection from the move history
   */
  handleMoveSelect(move, index) {
    console.log(`Move selected from history: ${move.san} (index ${index})`);
    
    // TODO: Implement position replay at selected move
    // This will be implemented in a future phase
  }
  
  /**
   * Handle error event
   */
  handleError(message, error) {
    console.error(`Chess error: ${message}`, error);
    
    // Play error sound
    this.soundManager.play('error');
    
    // Show error notification
    this.showNotification(message, 'error');
  }
  
  /**
   * Start a new game
   */
  startNewGame() {
    // Reset the game
    this.game.reset();
    
    // Clear move history
    this.moveHistory.clear();
    
    // Update the board
    this.updateBoard();
    
    // Clear highlights
    this.boardUI.clearHighlights();
    
    // Play start game sound
    this.soundManager.play('start');
    
    // Show notification
    this.showNotification('New game started with Black moving first', 'info');
  }
  
  /**
   * Resign the current game
   */
  resignGame() {
    if (this.game.isGameOver()) return;
    
    const winner = this.game.resign();
    
    // Update the board
    this.updateBoard();
    
    // Show notification
    this.showNotification(`You resigned. ${winner} wins.`, 'info');
  }
  
  /**
   * Show a notification message
   */
  showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Use existing notification function if available
    if (typeof showError === 'function') {
      showError(message, type);
      return;
    }
    
    // Create a simple notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `message-notification ${type}-message`;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }
} 