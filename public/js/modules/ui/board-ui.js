/**
 * Board UI Module
 * Handles the rendering and interaction with the chessboard
 */

export default class BoardUI {
  constructor(config = {}) {
    // DOM elements
    this.boardElement = null;
    this.statusElement = null;
    
    // Configuration with defaults
    this.config = {
      boardSelector: '#chessboard',
      statusSelector: '#game-status',
      whitePlayerSelector: '#white-player',
      blackPlayerSelector: '#black-player',
      pieceImagePath: 'images/pieces/{color}_{type}.png',
      ...config
    };
    
    // State
    this.highlightedSquares = [];
    this.pieceElements = {};
    
    // Event listeners
    this.listeners = {
      onSquareClick: null
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the board UI
   */
  init() {
    try {
      // Get board element
      this.boardElement = document.querySelector(this.config.boardSelector);
      if (!this.boardElement) {
        throw new Error(`Board element not found: ${this.config.boardSelector}`);
      }
      
      // Get status element
      this.statusElement = document.querySelector(this.config.statusSelector);
      this.whitePlayerElement = document.querySelector(this.config.whitePlayerSelector);
      this.blackPlayerElement = document.querySelector(this.config.blackPlayerSelector);
      
      // Clear the board
      this.boardElement.innerHTML = '';
      
      return true;
    } catch (error) {
      console.error('Board UI initialization error:', error);
      return false;
    }
  }
  
  /**
   * Create the chessboard grid
   */
  createBoard() {
    if (!this.boardElement) return false;
    
    try {
      console.log('Creating chessboard...');
      
      // Clear any existing content
      this.boardElement.innerHTML = '';
      
      // Create 8x8 squares
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          // Create a square element
          const square = document.createElement('div');
          square.className = 'square';
          
          // Determine if it's a light or dark square
          if ((row + col) % 2 === 0) {
            square.classList.add('light-square');
          } else {
            square.classList.add('dark-square');
          }
          
          // Set data attributes for row and column
          square.setAttribute('data-row', row);
          square.setAttribute('data-col', col);
          
          // Set data attribute for algebraic notation (e.g., 'e4')
          const file = String.fromCharCode(97 + col); // 'a' through 'h'
          const rank = 8 - row; // 1 through 8
          square.setAttribute('data-square', file + rank);
          
          // Add click event listener
          square.addEventListener('click', this.handleSquareClick.bind(this));
          
          // Add to chessboard
          this.boardElement.appendChild(square);
        }
      }
      
      console.log('Chessboard created successfully');
      return true;
    } catch (error) {
      console.error('Error creating board:', error);
      return false;
    }
  }
  
  /**
   * Update the board with the current game state
   */
  updateBoard(pieces) {
    if (!this.boardElement) return false;
    
    try {
      console.log('Updating board with pieces');
      
      // Remove all existing pieces
      document.querySelectorAll('.piece').forEach(piece => piece.remove());
      
      // Reset piece elements tracking
      this.pieceElements = {};
      
      // Add pieces to the board
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = pieces[row][col];
          if (piece) {
            const squareElement = this.getSquareElement(row, col);
            if (squareElement) {
              const pieceElement = this.createPieceElement(piece);
              squareElement.appendChild(pieceElement);
              
              // Track piece elements by position
              const squareNotation = squareElement.getAttribute('data-square');
              this.pieceElements[squareNotation] = pieceElement;
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating board:', error);
      return false;
    }
  }
  
  /**
   * Create a piece element
   */
  createPieceElement(piece) {
    const pieceElement = document.createElement('div');
    pieceElement.className = 'piece';
    
    // Determine piece color and type
    const color = piece.color === 'w' ? 'white' : 'black';
    const type = this.getPieceType(piece.type);
    
    // Add appropriate class
    pieceElement.classList.add(`${color}-${type}`);
    
    // Create and add image
    const imgPath = this.config.pieceImagePath
      .replace('{color}', color[0])
      .replace('{type}', type[0].toUpperCase());
    
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = `${color} ${type}`;
    pieceElement.appendChild(img);
    
    return pieceElement;
  }
  
  /**
   * Handle square click events
   */
  handleSquareClick(event) {
    const square = event.currentTarget;
    const squareNotation = square.getAttribute('data-square');
    
    // Trigger the square click callback if set
    if (this.listeners.onSquareClick) {
      this.listeners.onSquareClick(squareNotation);
    }
  }
  
  /**
   * Highlight a square
   */
  highlightSquare(square, className) {
    const squareElement = this.getSquareElementByNotation(square);
    if (squareElement) {
      squareElement.classList.add(className);
      this.highlightedSquares.push({ element: squareElement, className });
    }
  }
  
  /**
   * Highlight the selected square and legal moves
   */
  highlightSelection(square, legalMoves) {
    // Clear previous highlights
    this.clearHighlights();
    
    // Highlight the selected square
    this.highlightSquare(square, 'selected');
    
    // Highlight legal moves
    legalMoves.forEach(move => {
      this.highlightSquare(move.to, 'possible-move');
    });
  }
  
  /**
   * Highlight the last move made
   */
  highlightLastMove(from, to) {
    this.highlightSquare(from, 'last-move-from');
    this.highlightSquare(to, 'last-move-to');
  }
  
  /**
   * Clear all highlights from the board
   */
  clearHighlights() {
    this.highlightedSquares.forEach(({ element, className }) => {
      element.classList.remove(className);
    });
    this.highlightedSquares = [];
  }
  
  /**
   * Update the game status display
   */
  updateStatus(statusText) {
    if (this.statusElement) {
      this.statusElement.textContent = statusText;
    }
  }
  
  /**
   * Update active player highlighting
   */
  updateActivePlayer(isWhiteTurn) {
    if (this.whitePlayerElement && this.blackPlayerElement) {
      if (isWhiteTurn) {
        this.whitePlayerElement.classList.add('active-player');
        this.blackPlayerElement.classList.remove('active-player');
      } else {
        this.blackPlayerElement.classList.add('active-player');
        this.whitePlayerElement.classList.remove('active-player');
      }
    }
  }
  
  /**
   * Get a square element by row and column
   */
  getSquareElement(row, col) {
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }
  
  /**
   * Get a square element by algebraic notation
   */
  getSquareElementByNotation(notation) {
    return document.querySelector(`[data-square="${notation}"]`);
  }
  
  /**
   * Get all square elements
   */
  getAllSquareElements() {
    return document.querySelectorAll('.square');
  }
  
  /**
   * Set an event listener
   */
  setListener(event, callback) {
    if (event in this.listeners) {
      this.listeners[event] = callback;
      return true;
    }
    return false;
  }
  
  /**
   * Convert piece type to full name
   */
  getPieceType(type) {
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