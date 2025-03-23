/**
 * Move History Module
 * Tracks and displays the history of chess moves
 */
export default class MoveHistory {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      containerSelector: '#moves-list',
      maxMoves: 100,
      ...config
    };
    
    // DOM elements
    this.container = null;
    
    // State
    this.moves = [];
    this.currentIndex = -1;
    
    // Event callbacks
    this.callbacks = {
      onMoveSelect: null
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the move history module
   */
  init() {
    try {
      // Get container element
      this.container = document.querySelector(this.config.containerSelector);
      
      if (!this.container) {
        console.warn(`Move history container not found: ${this.config.containerSelector}`);
      } else {
        // Clear container
        this.container.innerHTML = '';
        
        // Add click event listener for move selection
        this.container.addEventListener('click', this.handleClickEvent.bind(this));
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing move history:', error);
      return false;
    }
  }
  
  /**
   * Add a move to the history
   */
  addMove(move) {
    if (!move) return false;
    
    try {
      // Add move to history
      this.moves.push(move);
      this.currentIndex = this.moves.length - 1;
      
      // Limit history size
      if (this.moves.length > this.config.maxMoves) {
        this.moves.shift();
        this.currentIndex--;
      }
      
      // Update display
      this.updateDisplay();
      
      return true;
    } catch (error) {
      console.error('Error adding move to history:', error);
      return false;
    }
  }
  
  /**
   * Clear move history
   */
  clear() {
    this.moves = [];
    this.currentIndex = -1;
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    return true;
  }
  
  /**
   * Update the move history display
   */
  updateDisplay() {
    if (!this.container) return false;
    
    try {
      // Clear container
      this.container.innerHTML = '';
      
      // Create move elements
      let moveNumber = 1;
      let moveElement = null;
      
      this.moves.forEach((move, index) => {
        // Determine if it's white's or black's move
        const isWhiteMove = (index % 2 === 0);
        
        if (isWhiteMove) {
          // Create a new move element for the move pair
          moveElement = document.createElement('div');
          moveElement.className = 'move-item';
          
          // Add move number
          const moveNumberSpan = document.createElement('span');
          moveNumberSpan.className = 'move-number';
          moveNumberSpan.textContent = `${moveNumber}.`;
          moveElement.appendChild(moveNumberSpan);
          
          // Add white's move
          const whiteMoveSpan = document.createElement('span');
          whiteMoveSpan.className = 'move-notation';
          whiteMoveSpan.textContent = move.san;
          whiteMoveSpan.setAttribute('data-index', index);
          moveElement.appendChild(whiteMoveSpan);
          
          // Highlight if it's the current move
          if (index === this.currentIndex) {
            whiteMoveSpan.classList.add('current-move');
          }
          
          // Add to container
          this.container.appendChild(moveElement);
        } else {
          // Add black's move to the current move element
          const blackMoveSpan = document.createElement('span');
          blackMoveSpan.className = 'move-notation';
          blackMoveSpan.textContent = move.san;
          blackMoveSpan.setAttribute('data-index', index);
          moveElement.appendChild(blackMoveSpan);
          
          // Highlight if it's the current move
          if (index === this.currentIndex) {
            blackMoveSpan.classList.add('current-move');
          }
          
          // Increment move number for the next pair
          moveNumber++;
        }
      });
      
      // Scroll to the bottom to show latest moves
      this.container.scrollTop = this.container.scrollHeight;
      
      return true;
    } catch (error) {
      console.error('Error updating move history display:', error);
      return false;
    }
  }
  
  /**
   * Handle click events on move history
   */
  handleClickEvent(event) {
    // Check if a move notation was clicked
    if (event.target.classList.contains('move-notation')) {
      const index = parseInt(event.target.getAttribute('data-index'), 10);
      
      if (!isNaN(index) && index >= 0 && index < this.moves.length) {
        this.selectMove(index);
      }
    }
  }
  
  /**
   * Select a move in the history
   */
  selectMove(index) {
    if (index < 0 || index >= this.moves.length) return false;
    
    try {
      // Update current index
      this.currentIndex = index;
      
      // Update display to highlight the selected move
      this.updateDisplay();
      
      // Call the callback if set
      if (this.callbacks.onMoveSelect) {
        this.callbacks.onMoveSelect(this.moves[index], index);
      }
      
      return true;
    } catch (error) {
      console.error('Error selecting move:', error);
      return false;
    }
  }
  
  /**
   * Get the list of moves
   */
  getMoves() {
    return [...this.moves];
  }
  
  /**
   * Get the move at the specified index
   */
  getMove(index) {
    if (index < 0 || index >= this.moves.length) return null;
    return this.moves[index];
  }
  
  /**
   * Get the current move
   */
  getCurrentMove() {
    if (this.currentIndex < 0) return null;
    return this.moves[this.currentIndex];
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
} 