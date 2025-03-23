/**
 * AI Game Mode Module
 * Manages games against AI opponents
 */
import AIPlayer from './ai-player.js';

export default class AIGameMode {
  constructor(config = {}) {
    console.log('Initializing AI Game Mode...');
    
    // Configuration with defaults
    this.config = {
      // AI difficulty level (1-10)
      difficulty: 3,
      
      // Player color ('white' or 'black', 'random' for random assignment)
      playerColor: 'random',
      
      // Auto-play AI move after player moves
      autoPlay: true,
      
      // Additional AI configuration
      aiConfig: {},
      
      ...config
    };
    
    // State
    this.chessGame = null;
    this.aiPlayer = null;
    this.isAiTurn = false;
    
    // Event callbacks
    this.callbacks = {
      onAiMoveStart: null,
      onAiMoveEnd: null,
      onPlayerColorAssigned: null
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the AI game mode
   */
  init() {
    try {
      // Create AI player
      this.aiPlayer = new AIPlayer({
        difficulty: this.config.difficulty,
        ...this.config.aiConfig
      });
      
      console.log('AI Game Mode initialized');
      return true;
    } catch (error) {
      console.error('Error initializing AI game mode:', error);
      return false;
    }
  }
  
  /**
   * Connect to a chess game
   */
  connectToGame(chessGame) {
    if (!chessGame) {
      console.error('Invalid chess game instance');
      return false;
    }
    
    try {
      this.chessGame = chessGame;
      
      // Assign player color
      this.assignPlayerColor();
      
      // Connect to game events
      this.connectEvents();
      
      console.log(`AI Game Mode connected to game, player is ${this.chessGame.playerColor}`);
      return true;
    } catch (error) {
      console.error('Error connecting to chess game:', error);
      return false;
    }
  }
  
  /**
   * Connect to game events
   */
  connectEvents() {
    // Add a callback to the chess game for moves
    this.chessGame.setCallback('onMove', this.handlePlayerMove.bind(this));
    
    // Add a callback for game over
    this.chessGame.setCallback('onGameOver', this.handleGameOver.bind(this));
  }
  
  /**
   * Assign player color
   */
  assignPlayerColor() {
    let playerColor = this.config.playerColor;
    
    // Assign random color if needed
    if (playerColor === 'random') {
      playerColor = Math.random() < 0.5 ? 'white' : 'black';
    }
    
    // Update the player color in the chess game
    this.chessGame.playerColor = playerColor;
    
    // Determine if AI moves first
    this.isAiTurn = this.shouldAiMoveFirst();
    
    // Trigger callback if set
    if (this.callbacks.onPlayerColorAssigned) {
      this.callbacks.onPlayerColorAssigned(playerColor);
    }
    
    return playerColor;
  }
  
  /**
   * Determine if AI should move first
   */
  shouldAiMoveFirst() {
    const playerColor = this.chessGame.playerColor;
    const currentTurn = this.chessGame.getTurn();
    
    return (currentTurn === 'w' && playerColor === 'black') || 
           (currentTurn === 'b' && playerColor === 'white');
  }
  
  /**
   * Start the game
   */
  startGame() {
    console.log('Starting AI game mode...');
    
    // Make AI move if it's AI's turn
    if (this.isAiTurn) {
      console.log('AI moves first');
      this.makeAiMove();
    } else {
      console.log('Player moves first');
    }
    
    return true;
  }
  
  /**
   * Make an AI move
   */
  makeAiMove() {
    // Don't make a move if game is over
    if (this.chessGame.isGameOver()) {
      console.log('Game is over, AI will not move');
      return false;
    }
    
    // Notify about AI move start
    if (this.callbacks.onAiMoveStart) {
      this.callbacks.onAiMoveStart();
    }
    
    // Request AI to make a move
    this.aiPlayer.makeMove(this.chessGame, (move) => {
      // AI move is complete
      this.isAiTurn = false;
      
      // Notify about AI move end
      if (this.callbacks.onAiMoveEnd) {
        this.callbacks.onAiMoveEnd(move);
      }
    });
    
    return true;
  }
  
  /**
   * Handle player move
   */
  handlePlayerMove(move) {
    console.log('Player made a move:', move);
    
    // Set AI's turn
    this.isAiTurn = true;
    
    // Auto-play AI move if enabled
    if (this.config.autoPlay && !this.chessGame.isGameOver()) {
      // Add a small delay to make it feel more natural
      setTimeout(() => {
        this.makeAiMove();
      }, 250);
    }
    
    return true;
  }
  
  /**
   * Handle game over
   */
  handleGameOver(result, reason) {
    console.log(`Game over in AI mode: ${result} wins by ${reason}`);
    
    // Clean up AI resources
    if (this.aiPlayer) {
      this.aiPlayer.dispose();
    }
    
    return true;
  }
  
  /**
   * Set AI difficulty
   */
  setDifficulty(level) {
    if (this.aiPlayer) {
      return this.aiPlayer.setDifficulty(level);
    }
    return false;
  }
  
  /**
   * Set player color
   */
  setPlayerColor(color) {
    if (!this.chessGame || !['white', 'black'].includes(color)) {
      return false;
    }
    
    this.chessGame.playerColor = color;
    this.isAiTurn = this.shouldAiMoveFirst();
    
    // Make AI move if it's AI's turn
    if (this.isAiTurn && this.config.autoPlay && !this.chessGame.isGameOver()) {
      this.makeAiMove();
    }
    
    return true;
  }
  
  /**
   * Get current AI state
   */
  getAiState() {
    return {
      isThinking: this.aiPlayer?.isAiThinking() || false,
      isAiTurn: this.isAiTurn,
      difficulty: this.aiPlayer?.config.difficulty || this.config.difficulty
    };
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
   * Clean up resources
   */
  dispose() {
    try {
      // Clean up AI player
      if (this.aiPlayer) {
        this.aiPlayer.dispose();
        this.aiPlayer = null;
      }
      
      // Reset state
      this.isAiTurn = false;
      this.chessGame = null;
      
      return true;
    } catch (error) {
      console.error('Error disposing AI game mode:', error);
      return false;
    }
  }
} 