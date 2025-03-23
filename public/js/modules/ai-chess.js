/**
 * AI Chess Application Entry Point
 * Connects all modules to create an AI chess game
 */
import ChessGame from './core/chess-game.js';
import BoardUI from './ui/board-ui.js';
import MoveHistory from './ui/move-history.js';
import SoundManager from './utils/sound-manager.js';
import AIGameMode from './game-modes/ai-game-mode.js';

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing AI Chess Application...');
  
  // Initialize components
  const chessGame = new ChessGame({
    playerColor: 'black', // Default to black (user can change this)
    startPosition: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1' // Black moves first
  });
  
  const boardUI = new BoardUI({
    boardSelector: '#chessboard',
    statusSelector: '#game-status',
    whitePlayerSelector: '#white-player',
    blackPlayerSelector: '#black-player',
    pieceImagePath: 'images/pieces/{color}_{type}.png'
  });
  
  const moveHistory = new MoveHistory({
    containerSelector: '#moves-list'
  });
  
  const soundManager = new SoundManager({
    sounds: {
      move: document.getElementById('move-sound')?.src || '/audio/Move.mp3',
      capture: document.getElementById('capture-sound')?.src || '/audio/Capture.mp3',
      check: document.getElementById('check-sound')?.src || '/audio/Check.mp3',
      checkmate: document.getElementById('check-sound')?.src || '/audio/Checkmate.mp3',
      castle: document.getElementById('castle-sound')?.src || '/audio/Castle.mp3',
      promote: document.getElementById('promote-sound')?.src || '/audio/Promote.mp3',
      draw: document.getElementById('game-end-sound')?.src || '/audio/Draw.mp3',
      error: document.getElementById('error-sound')?.src || '/audio/Error.mp3',
      start: document.getElementById('game-end-sound')?.src || '/audio/GameStart.mp3'
    }
  });
  
  // Initialize the AI Game Mode
  const aiGameMode = new AIGameMode({
    difficulty: 3,
    playerColor: 'black', // Default to black
    autoPlay: true,
    aiConfig: {
      thinkingTime: 500
    }
  });
  
  // Create the App Controller to manage all these components
  class AIChessApp {
    constructor() {
      this.chessGame = chessGame;
      this.boardUI = boardUI;
      this.moveHistory = moveHistory;
      this.soundManager = soundManager;
      this.aiGameMode = aiGameMode;
      
      // Initialize
      this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
      try {
        console.log('Initializing AI Chess Application...');
        
        // Create the board
        this.boardUI.createBoard();
        
        // Connect AI to chess game
        this.aiGameMode.connectToGame(this.chessGame);
        
        // Connect events
        this.connectEvents();
        
        // Set up UI event listeners
        this.setupUIEventListeners();
        
        // Update the board with the initial position
        this.updateBoard();
        
        // Start AI game mode
        this.aiGameMode.startGame();
        
        // Play start game sound
        this.soundManager.play('start');
        
        // Update player labels based on initial color
        this.updatePlayerLabels(this.chessGame.playerColor);
        
        console.log('AI Chess Application initialized successfully');
        return true;
      } catch (error) {
        console.error('Error initializing AI chess application:', error);
        return false;
      }
    }
    
    /**
     * Connect event handlers
     */
    connectEvents() {
      // Set up the square click handler
      this.boardUI.setListener('onSquareClick', this.handleSquareClick.bind(this));
      
      // Set up game event handlers
      this.chessGame.setCallback('onMove', this.handleMove.bind(this));
      this.chessGame.setCallback('onGameOver', this.handleGameOver.bind(this));
      this.chessGame.setCallback('onCheck', this.handleCheck.bind(this));
      this.chessGame.setCallback('onSelectionChange', this.handleSelectionChange.bind(this));
      this.chessGame.setCallback('onError', this.handleError.bind(this));
      
      // Set up AI game mode handlers
      this.aiGameMode.setCallback('onAiMoveStart', this.handleAiMoveStart.bind(this));
      this.aiGameMode.setCallback('onAiMoveEnd', this.handleAiMoveEnd.bind(this));
      this.aiGameMode.setCallback('onPlayerColorAssigned', this.handlePlayerColorAssigned.bind(this));
      
      // Set up move history handlers
      this.moveHistory.setCallback('onMoveSelect', this.handleMoveSelect.bind(this));
    }
    
    /**
     * Set up UI event listeners
     */
    setupUIEventListeners() {
      // New Game button
      const newGameBtn = document.getElementById('new-game-btn');
      if (newGameBtn) {
        newGameBtn.addEventListener('click', this.startNewGame.bind(this));
      }
      
      // Resign button
      const resignBtn = document.getElementById('resign-btn');
      if (resignBtn) {
        resignBtn.addEventListener('click', this.resignGame.bind(this));
      }
      
      // AI Move button
      const aiMoveBtn = document.getElementById('ai-move-btn');
      if (aiMoveBtn) {
        aiMoveBtn.addEventListener('click', this.makeAiMove.bind(this));
      }
      
      // AI Difficulty slider
      const difficultySlider = document.getElementById('ai-difficulty');
      const difficultyValue = document.getElementById('difficulty-value');
      const currentDifficulty = document.getElementById('current-difficulty');
      
      if (difficultySlider && difficultyValue && currentDifficulty) {
        difficultySlider.addEventListener('input', () => {
          const difficulty = parseInt(difficultySlider.value);
          
          difficultyValue.textContent = difficulty;
          currentDifficulty.textContent = difficulty;
          
          // Update AI difficulty
          this.aiGameMode.setDifficulty(difficulty);
        });
      }
      
      // Player color selection
      const colorRadios = document.querySelectorAll('input[name="player-color"]');
      if (colorRadios) {
        colorRadios.forEach(radio => {
          radio.addEventListener('change', () => {
            if (radio.checked) {
              this.setPlayerColor(radio.value);
            }
          });
        });
      }
      
      // Sound controls
      this.setupSoundControls();
    }
    
    /**
     * Setup sound control UI elements
     */
    setupSoundControls() {
      const soundToggle = document.getElementById('sound-toggle');
      const volumeSlider = document.getElementById('volume-slider');
      
      if (soundToggle) {
        // Initialize checkbox state from sound manager
        soundToggle.checked = this.soundManager.getSettings().enabled;
        
        // Add change event listener
        soundToggle.addEventListener('change', () => {
          const newState = this.soundManager.toggleSound();
          console.log(`Sound ${newState ? 'enabled' : 'disabled'}`);
          
          // Play a sound to demonstrate the change if enabled
          if (newState) {
            this.soundManager.play('move');
          }
        });
      }
      
      if (volumeSlider) {
        // Initialize slider value from sound manager
        volumeSlider.value = this.soundManager.getSettings().volume * 100;
        
        // Add input event listener
        volumeSlider.addEventListener('input', () => {
          const volume = volumeSlider.value / 100;
          this.soundManager.setVolume(volume);
          console.log(`Volume set to ${volume}`);
          
          // Play a sound to demonstrate the volume level
          this.soundManager.play('move');
        });
      }
    }
    
    /**
     * Update the board with the current game state
     */
    updateBoard() {
      const pieces = this.chessGame.getPieces();
      this.boardUI.updateBoard(pieces);
      
      // Update status
      const statusText = this.chessGame.getStatusText();
      this.boardUI.updateStatus(statusText);
      
      // Update active player
      const isWhiteTurn = this.chessGame.getTurn() === 'w';
      this.boardUI.updateActivePlayer(isWhiteTurn);
    }
    
    /**
     * Set the player's color
     */
    setPlayerColor(color) {
      console.log(`Setting player color to ${color}`);
      
      // Start a new game with the selected color
      this.startNewGame(color);
    }
    
    /**
     * Make an AI move (used for manual AI move button)
     */
    makeAiMove() {
      // Only make a move if it's AI's turn
      const aiState = this.aiGameMode.getAiState();
      
      if (aiState.isAiTurn && !aiState.isThinking) {
        this.aiGameMode.makeAiMove();
      } else {
        console.log('Not AI\'s turn or AI is already thinking');
      }
    }
    
    /**
     * Handle square click
     */
    handleSquareClick(square) {
      console.log(`Square clicked: ${square}`);
      
      // Don't allow moves if game is over
      if (this.chessGame.isGameOver()) {
        return;
      }
      
      // Only allow moves on player's turn
      if (!this.chessGame.isPlayerTurn()) {
        console.log('Not your turn');
        this.soundManager.play('error');
        return;
      }
      
      // Process the selection in the game logic
      const result = this.chessGame.selectSquare(square);
      
      // Handle different selection results
      switch (result.type) {
        case 'select':
          console.log(`Selected ${result.piece.color} ${result.piece.type} at ${square}`);
          this.boardUI.highlightSelection(square, result.legalMoves);
          break;
          
        case 'move':
          console.log(`Move made: ${result.move?.san}`);
          this.boardUI.clearHighlights();
          if (result.move) {
            this.boardUI.highlightLastMove(result.move.from, result.move.to);
          }
          break;
          
        case 'empty':
          console.log('Empty square clicked');
          this.chessGame.clearSelection();
          this.boardUI.clearHighlights();
          break;
          
        case 'opponent':
          console.log('Opponent piece clicked');
          this.chessGame.clearSelection();
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
      
      // Update last evaluation display
      document.getElementById('last-evaluation')?.textContent = move.san;
    }
    
    /**
     * Handle AI move start
     */
    handleAiMoveStart() {
      console.log('AI thinking...');
      
      // Show thinking indicator
      const thinkingIndicator = document.getElementById('thinking-indicator');
      if (thinkingIndicator) {
        thinkingIndicator.style.display = 'inline-block';
      }
    }
    
    /**
     * Handle AI move end
     */
    handleAiMoveEnd(move) {
      console.log('AI move completed:', move);
      
      // Hide thinking indicator
      const thinkingIndicator = document.getElementById('thinking-indicator');
      if (thinkingIndicator) {
        thinkingIndicator.style.display = 'none';
      }
    }
    
    /**
     * Handle player color assigned
     */
    handlePlayerColorAssigned(color) {
      console.log(`Player assigned color: ${color}`);
      
      // Update player labels
      this.updatePlayerLabels(color);
      
      // Select the correct radio button
      const radioSelector = `#play-as-${color}`;
      const radio = document.querySelector(radioSelector);
      if (radio) {
        radio.checked = true;
      }
    }
    
    /**
     * Update player labels based on player color
     */
    updatePlayerLabels(playerColor) {
      const whiteLabel = document.querySelector('#white-player .player-name');
      const blackLabel = document.querySelector('#black-player .player-name');
      
      if (whiteLabel && blackLabel) {
        if (playerColor === 'white') {
          whiteLabel.textContent = 'You (White)';
          blackLabel.textContent = 'Computer (Black)';
        } else {
          whiteLabel.textContent = 'Computer (White)';
          blackLabel.textContent = 'You (Black)';
        }
      }
    }
    
    /**
     * Handle game over event
     */
    handleGameOver(result, reason) {
      console.log(`Game over: ${result} wins by ${reason}`);
      
      // Update status text
      this.boardUI.updateStatus(this.chessGame.getStatusText());
      
      // Play appropriate sound
      if (reason === 'checkmate') {
        this.soundManager.play('checkmate');
      } else if (reason === 'draw') {
        this.soundManager.play('draw');
      }
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
    }
    
    /**
     * Start a new game
     */
    startNewGame(playerColor = null) {
      // If a specific player color is requested, use it
      if (playerColor) {
        this.chessGame.playerColor = playerColor;
      }
      
      // Reset the game
      this.chessGame.reset();
      
      // Clear move history
      this.moveHistory.clear();
      
      // Update the board
      this.updateBoard();
      
      // Clear highlights
      this.boardUI.clearHighlights();
      
      // Update player labels
      this.updatePlayerLabels(this.chessGame.playerColor);
      
      // Reconnect AI to the game
      this.aiGameMode.connectToGame(this.chessGame);
      
      // Start AI game mode
      this.aiGameMode.startGame();
      
      // Play start game sound
      this.soundManager.play('start');
      
      console.log(`New game started, player is ${this.chessGame.playerColor}`);
    }
    
    /**
     * Resign the current game
     */
    resignGame() {
      if (this.chessGame.isGameOver()) return;
      
      const winner = this.chessGame.resign();
      
      // Update the board
      this.updateBoard();
      
      console.log(`Game resigned, ${winner} wins`);
    }
  }
  
  // Create the app instance
  window.aiChessApp = new AIChessApp();
  
  console.log('AI Chess Application ready');
}); 