(function() {
  // Magic Horse Challenge Game Logic
  let magicHorseBoard = [];
  let horsePosition = null;
  let queensRemaining = 24;
  let magicHorseSelectedSquare = null;
  let magicHorseGameId = null;
  let challengeLevel = 1;
  let magicHorseWinCondition = 3;
  let magicHorseMoveCount = 0;
  let magicHorseGameStatus = 'active';
  let hasStartedCapturing = false;

  // DOM Elements
  let magicHorseBoardEl, magicHorseStatusEl, magicHorseMoveCountEl, magicHorseQueensRemainingEl;

  // Initialize the Magic Horse Challenge
  function initMagicHorseGame(level = 1) {
    console.log('initMagicHorseGame called with level:', level);
    
    // Set challenge level and win condition
    challengeLevel = level;
    switch (level) {
      case 1:
        magicHorseWinCondition = 3;
        break;
      case 2:
        magicHorseWinCondition = 2;
        break;
      case 3:
        magicHorseWinCondition = 1;
        break;
      case 4: // Castle Wars Challenge
        magicHorseWinCondition = 0; // Must clear all queens
        break;
      default:
        magicHorseWinCondition = 3;
    }
    
    // Reset game state
    queensRemaining = 24;
    magicHorseMoveCount = 0;
    magicHorseGameStatus = 'active';
    magicHorseSelectedSquare = null;
    hasStartedCapturing = false;
    
    // Get DOM elements
    magicHorseBoardEl = document.getElementById('magic-horse-board');
    console.log('magicHorseBoardEl:', magicHorseBoardEl);
    magicHorseStatusEl = document.getElementById('magic-horse-status');
    console.log('magicHorseStatusEl:', magicHorseStatusEl);
    magicHorseMoveCountEl = document.getElementById('magic-horse-moves');
    console.log('magicHorseMoveCountEl:', magicHorseMoveCountEl);
    magicHorseQueensRemainingEl = document.getElementById('magic-horse-queens');
    console.log('magicHorseQueensRemainingEl:', magicHorseQueensRemainingEl);
    
    // Create a new game on the server
    createGame(level);
    
    // Update challenge description based on level
    updateChallengeDescription(level);
  }

  // Update the challenge description based on level
  function updateChallengeDescription(level) {
    const descriptionEl = document.querySelector('.info-panel p:last-child');
    if (!descriptionEl) return;
    
    switch (level) {
      case 1:
        descriptionEl.textContent = `Level 1 Challenge: Leave ${magicHorseWinCondition} queens to win`;
        break;
      case 2:
        descriptionEl.textContent = `Level 2 Challenge: Leave ${magicHorseWinCondition} queens to win`;
        break;
      case 3:
        descriptionEl.textContent = `Level 3 Challenge: Leave ${magicHorseWinCondition} queen to win`;
        break;
      case 4:
        descriptionEl.textContent = `Castle Wars Challenge: Clear all queens to unlock Battle Chess!`;
        break;
      default:
        descriptionEl.textContent = `Level ${level} Challenge: Leave ${magicHorseWinCondition} queens to win`;
    }
  }

  // Create a new Magic Horse game on the server
  function createGame(level) {
    console.log('createGame called with level:', level);
    
    // Initialize the board
    magicHorseBoard = Array(8).fill().map(() => Array(8).fill(null));
    
    // Place queens on the board (3 rows of 8 queens)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        magicHorseBoard[row][col] = { type: 'queen', row, col };
      }
    }
    
    // Place the horse in the center of the board
    const horseRow = 4;
    const horseCol = 4;
    magicHorseBoard[horseRow][horseCol] = { type: 'horse', row: horseRow, col: horseCol };
    horsePosition = { row: horseRow, col: horseCol };
    
    // Create the board UI
    createBoardUI();
    
    // Update game info
    updateGameInfo();
    
    // Highlight valid moves
    highlightValidMoves();
    
    // Create a new game on the server
    fetchWithCredentials('/api/magicHorse/create', {
      method: 'POST',
      body: JSON.stringify({ level })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Game created:', data);
        magicHorseGameId = data.gameId;
      })
      .catch(error => {
        console.error('Error creating game:', error);
        showError('Failed to create Magic Horse game. Please try again.');
      });
  }

  // Special update for the initial placement phase
  function updateGameInfoWithPlacement() {
    if (!magicHorseMoveCountEl || !magicHorseQueensRemainingEl || !magicHorseStatusEl) {
      console.error('Game info elements not found');
      return;
    }
    
    magicHorseMoveCountEl.textContent = magicHorseMoveCount;
    magicHorseQueensRemainingEl.textContent = queensRemaining;
    
    // Special message for horse placement
    magicHorseStatusEl.textContent = "Click anywhere on the board to place your horse";
  }

  // Create the board UI
  function createBoardUI() {
    if (!magicHorseBoardEl) {
      console.error('Magic Horse board element not found');
      return;
    }
    
    // Clear the board
    magicHorseBoardEl.innerHTML = '';
    
    // Create the squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.className = `square ${(row + col) % 2 === 0 ? 'light-square' : 'dark-square'}`;
        square.dataset.row = row;
        square.dataset.col = col;
        
        // Add piece if there is one
        const piece = magicHorseBoard[row][col];
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.className = `piece ${piece.type}`;
          square.appendChild(pieceEl);
        }
        
        // Add click event listener
        square.addEventListener('click', () => {
          handleSquareClick(row, col);
        });
        
        magicHorseBoardEl.appendChild(square);
      }
    }
  }

  // Handle square click
  function handleSquareClick(row, col) {
    console.log(`Square clicked: row ${row}, col ${col}`);
    
    // If game is not active, ignore clicks
    if (magicHorseGameStatus !== 'active') {
      return;
    }
    
    // If the horse is already selected, try to move it
    if (magicHorseSelectedSquare) {
      const fromRow = magicHorseSelectedSquare.row;
      const fromCol = magicHorseSelectedSquare.col;
      
      // Check if the move is valid
      if (isValidMove(fromRow, fromCol, row, col)) {
        // Make the move
        makeMove(fromRow, fromCol, row, col);
      } else {
        // Invalid move, deselect the horse
        magicHorseSelectedSquare = null;
        clearHighlights();
        highlightValidMoves();
      }
    } else {
      // Try to select the horse
      const piece = magicHorseBoard[row][col];
      if (piece && piece.type === 'horse') {
        magicHorseSelectedSquare = { row, col };
        clearHighlights();
        highlightValidMoves();
      }
    }
  }

  // Make a move
  function makeMove(fromRow, fromCol, toRow, toCol) {
    console.log(`Making move from (${fromRow}, ${fromCol}) to (${toRow}, ${toCol})`);
    
    // Get the piece at the destination
    const targetPiece = magicHorseBoard[toRow][toCol];
    
    // Move the horse
    magicHorseBoard[toRow][toCol] = magicHorseBoard[fromRow][fromCol];
    magicHorseBoard[fromRow][fromCol] = null;
    
    // Update the horse position
    horsePosition = { row: toRow, col: toCol };
    
    // Update the piece's row and col
    magicHorseBoard[toRow][toCol].row = toRow;
    magicHorseBoard[toRow][toCol].col = toCol;
    
    // Increment move count
    magicHorseMoveCount++;
    
    // If the target was a queen, decrement the queen count
    if (targetPiece && targetPiece.type === 'queen') {
      queensRemaining--;
      hasStartedCapturing = true;
      
      // Show capture animation
      showCaptureAnimation(toRow, toCol);
    }
    
    // Deselect the horse
    magicHorseSelectedSquare = null;
    
    // Update the board UI
    createBoardUI();
    
    // Update game info
    updateGameInfo();
    
    // Check if the game is over
    checkGameOver();
    
    // Highlight valid moves
    highlightValidMoves();
    
    // Send the move to the server
    sendMoveToServer(fromRow, fromCol, toRow, toCol);
  }

  // Check if the game is over
  function checkGameOver() {
    // Check if the player has reached the win condition
    if (queensRemaining === magicHorseWinCondition) {
      magicHorseGameStatus = 'won';
      showGameResult(true);
      return;
    }
    
    // Check if there are no valid moves left
    const validMoves = getValidMoves();
    if (validMoves.length === 0) {
      // If the player hasn't started capturing queens, they lose
      if (!hasStartedCapturing) {
        magicHorseGameStatus = 'lost';
        showGameResult(false);
        return;
      }
      
      // If the player has captured queens but not reached the win condition, they lose
      if (queensRemaining !== magicHorseWinCondition) {
        magicHorseGameStatus = 'lost';
        showGameResult(false);
        return;
      }
    }
  }

  // Show game result
  function showGameResult(isWin) {
    // Update game status
    if (isWin) {
      magicHorseStatusEl.textContent = `Level ${challengeLevel} Challenge: You won!`;
      
      // Show success message
      showError(`Congratulations! You completed the Level ${challengeLevel} Magic Horse Challenge!`, 'success');
      
      // Update user progress on the server
      updateUserProgress(challengeLevel, 'completed');
    } else {
      magicHorseStatusEl.textContent = `Level ${challengeLevel} Challenge: You lost!`;
      
      // Show failure message
      showError(`You failed the Level ${challengeLevel} Magic Horse Challenge. Try again!`, 'error');
    }
  }

  // Update user progress on the server
  function updateUserProgress(level, status) {
    fetchWithCredentials('/api/user/magic-horse-progress', {
      method: 'POST',
      body: JSON.stringify({
        level: `level${level}`,
        status: status
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Progress updated:', data);
        
        // If the challenge was completed, update the UI to show the next level as unlocked
        if (status === 'completed') {
          // Update the level buttons
          const nextLevel = level + 1;
          if (nextLevel <= 4) {
            const nextLevelBtn = document.getElementById(`magic-horse-level${nextLevel}-btn`);
            if (nextLevelBtn) {
              nextLevelBtn.classList.remove('locked');
              nextLevelBtn.disabled = false;
            }
          }
          
          // If this was the last level, unlock Battle Chess
          if (level === 4) {
            const battleChessBtn = document.getElementById('battle-chess-btn');
            if (battleChessBtn) {
              battleChessBtn.classList.remove('locked');
              battleChessBtn.disabled = false;
            }
          }
        }
      })
      .catch(error => {
        console.error('Error updating progress:', error);
      });
  }

  // Send move to server
  function sendMoveToServer(fromRow, fromCol, toRow, toCol) {
    if (!magicHorseGameId) {
      console.warn('No game ID, not sending move to server');
      return;
    }
    
    fetchWithCredentials(`/api/magicHorse/${magicHorseGameId}/move`, {
      method: 'POST',
      body: JSON.stringify({
        fromRow,
        fromCol,
        toRow,
        toCol,
        queensRemaining,
        moveCount: magicHorseMoveCount
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Move sent to server:', data);
      })
      .catch(error => {
        console.error('Error sending move to server:', error);
      });
  }

  // Show capture animation
  function showCaptureAnimation(row, col) {
    // Create a capture effect element
    const captureEffect = document.createElement('div');
    captureEffect.className = 'capture-effect';
    
    // Position it at the captured queen
    const square = getSquareElement(row, col);
    if (square) {
      const rect = square.getBoundingClientRect();
      captureEffect.style.left = `${rect.left}px`;
      captureEffect.style.top = `${rect.top}px`;
      captureEffect.style.width = `${rect.width}px`;
      captureEffect.style.height = `${rect.height}px`;
      
      // Add it to the document
      document.body.appendChild(captureEffect);
      
      // Remove it after the animation completes
      setTimeout(() => {
        document.body.removeChild(captureEffect);
      }, 500);
    }
  }

  // Check if a move is valid
  function isValidMove(fromRow, fromCol, toRow, toCol) {
    // Check if the destination has a queen
    if (!magicHorseBoard[toRow][toCol] || magicHorseBoard[toRow][toCol].type !== 'queen') {
      return false;
    }
    
    // Check if the move is an L-shape (knight's move)
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    return (rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1);
  }

  // Highlight valid moves
  function highlightValidMoves() {
    // If no horse is selected, highlight the horse
    if (!magicHorseSelectedSquare) {
      const horseSquare = getSquareElement(horsePosition.row, horsePosition.col);
      if (horseSquare) {
        horseSquare.classList.add('highlight');
      }
      return;
    }
    
    // Get valid moves
    const validMoves = getValidMoves();
    
    // Highlight the selected horse
    const horseSquare = getSquareElement(magicHorseSelectedSquare.row, magicHorseSelectedSquare.col);
    if (horseSquare) {
      horseSquare.classList.add('selected');
    }
    
    // Highlight valid destination squares
    validMoves.forEach(move => {
      const square = getSquareElement(move.row, move.col);
      if (square) {
        square.classList.add('highlight');
      }
    });
  }

  // Clear highlights
  function clearHighlights() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
      square.classList.remove('highlight', 'selected');
    });
  }

  // Get square element by row and col
  function getSquareElement(row, col) {
    return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
  }

  // Update game info
  function updateGameInfo() {
    // Update move count
    if (magicHorseMoveCountEl) {
      magicHorseMoveCountEl.textContent = magicHorseMoveCount;
    }
    
    // Update queens remaining
    if (magicHorseQueensRemainingEl) {
      magicHorseQueensRemainingEl.textContent = queensRemaining;
    }
    
    // Update progress indicator
    updateProgressIndicator();
  }
  
  // Update the progress indicator
  function updateProgressIndicator() {
    // Calculate how far the player is from the win condition
    const initialQueens = 24;
    const targetQueens = magicHorseWinCondition;
    const currentQueens = queensRemaining;
    
    // Get the progress indicator element
    const progressIndicator = document.querySelector('.progress-indicator');
    if (!progressIndicator) return;
    
    // Remove any existing classes
    progressIndicator.classList.remove('target-reached', 'too-few', 'getting-close');
    
    // Add the appropriate class based on the current state
    if (currentQueens === targetQueens) {
      progressIndicator.classList.add('target-reached');
      progressIndicator.textContent = 'Target Reached!';
    } else if (currentQueens < targetQueens) {
      progressIndicator.classList.add('too-few');
      progressIndicator.textContent = `Too Few Queens: ${currentQueens}/${targetQueens}`;
    } else {
      const remaining = currentQueens - targetQueens;
      const total = initialQueens - targetQueens;
      const percentage = Math.floor((total - remaining) / total * 100);
      
      if (remaining <= 3) {
        progressIndicator.classList.add('getting-close');
      }
      
      progressIndicator.textContent = `Progress: ${percentage}% (${remaining} more to remove)`;
    }
  }

  // Get valid moves
  function getValidMoves() {
    if (!magicHorseSelectedSquare) return [];
    
    const { row, col } = magicHorseSelectedSquare;
    const validMoves = [];
    
    // Check all possible knight's moves
    const possibleMoves = [
      { rowOffset: -2, colOffset: -1 },
      { rowOffset: -2, colOffset: 1 },
      { rowOffset: -1, colOffset: -2 },
      { rowOffset: -1, colOffset: 2 },
      { rowOffset: 1, colOffset: -2 },
      { rowOffset: 1, colOffset: 2 },
      { rowOffset: 2, colOffset: -1 },
      { rowOffset: 2, colOffset: 1 }
    ];
    
    possibleMoves.forEach(move => {
      const newRow = row + move.rowOffset;
      const newCol = col + move.colOffset;
      
      // Check if the move is within the board
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        // Check if there's a queen at the destination
        const piece = magicHorseBoard[newRow][newCol];
        if (piece && piece.type === 'queen') {
          validMoves.push({ row: newRow, col: newCol });
        }
      }
    });
    
    return validMoves;
  }

  // Show hint
  function showHint() {
    // Get valid moves
    const validMoves = getValidMoves();
    
    // If no horse is selected, select it first
    if (!magicHorseSelectedSquare) {
      magicHorseSelectedSquare = { row: horsePosition.row, col: horsePosition.col };
      clearHighlights();
      highlightValidMoves();
      return;
    }
    
    // If there are valid moves, highlight one of them
    if (validMoves.length > 0) {
      // Choose a move that gets closer to the win condition if possible
      let bestMove = validMoves[0];
      
      // If we're trying to reach a specific number of queens
      if (queensRemaining > magicHorseWinCondition) {
        // Choose a move that maximizes future options
        bestMove = validMoves.reduce((best, move) => {
          // Simulate the move
          const newBoard = JSON.parse(JSON.stringify(magicHorseBoard));
          newBoard[move.row][move.col] = newBoard[magicHorseSelectedSquare.row][magicHorseSelectedSquare.col];
          newBoard[magicHorseSelectedSquare.row][magicHorseSelectedSquare.col] = null;
          
          // Count future moves
          const futureOptions = countFutureMoves(newBoard, move.row, move.col);
          const bestOptions = countFutureMoves(newBoard, best.row, best.col);
          
          return futureOptions > bestOptions ? move : best;
        }, validMoves[0]);
      }
      
      // Highlight the best move
      const square = getSquareElement(bestMove.row, bestMove.col);
      if (square) {
        square.classList.add('hint');
      }
    } else {
      // No valid moves, show a message
      showError('No valid moves available. Try selecting the horse first.', 'info');
    }
  }

  // Count future moves from a position
  function countFutureMoves(board, row, col) {
    let count = 0;
    
    // Check all possible knight's moves
    const possibleMoves = [
      { rowOffset: -2, colOffset: -1 },
      { rowOffset: -2, colOffset: 1 },
      { rowOffset: -1, colOffset: -2 },
      { rowOffset: -1, colOffset: 2 },
      { rowOffset: 1, colOffset: -2 },
      { rowOffset: 1, colOffset: 2 },
      { rowOffset: 2, colOffset: -1 },
      { rowOffset: 2, colOffset: 1 }
    ];
    
    possibleMoves.forEach(move => {
      const newRow = row + move.rowOffset;
      const newCol = col + move.colOffset;
      
      // Check if the move is within the board
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        // Check if there's a queen at the destination
        const piece = board[newRow][newCol];
        if (piece && piece.type === 'queen') {
          count++;
        }
      }
    });
    
    return count;
  }

  // Helper function for showing errors if not defined in global scope
  if (typeof showError !== 'function') {
    window.showError = function(message, type = 'error') {
      console.error(message);
      alert(message);
    };
  }

  // Helper function for showing success messages if not defined in global scope
  if (typeof showSuccess !== 'function') {
    window.showSuccess = function(message) {
      console.log(message);
      alert(message);
    };
  }

  // Helper function for fetch with credentials
  function fetchWithCredentials(url, options = {}) {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // Merge the default options with the provided options
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };
    
    console.log('Fetching with credentials:', url, mergedOptions);
    return fetch(url, mergedOptions);
  }

  // Show Magic Horse Challenge
  function showMagicHorseChallenge(level = 1) {
    // Initialize the game with the specified level
    initMagicHorseGame(level);
    
    // If we're in the standalone page, nothing else to do
    if (!document.getElementById('game-section')) {
      return;
    }
    
    // Hide game section and show magic horse section
    const gameSection = document.getElementById('game-section');
    const magicHorseSection = document.getElementById('magic-horse-section');
    
    if (gameSection) {
      gameSection.classList.add('hidden');
    }
    
    if (magicHorseSection) {
      magicHorseSection.classList.remove('hidden');
    }
  }
  
  // Hide Magic Horse Challenge
  function hideMagicHorseChallenge() {
    // If we're in the standalone page, redirect to main page
    if (!document.getElementById('game-section')) {
      window.location.href = '/';
      return;
    }
    
    // Hide magic horse section and show game section
    const gameSection = document.getElementById('game-section');
    const magicHorseSection = document.getElementById('magic-horse-section');
    
    if (magicHorseSection) {
      magicHorseSection.classList.add('hidden');
    }
    
    if (gameSection) {
      gameSection.classList.remove('hidden');
    }
  }

  // Export functions to global scope
  window.MagicHorse = {
    show: showMagicHorseChallenge,
    hide: hideMagicHorseChallenge,
    init: initMagicHorseGame,
    hint: showHint,
    getCurrentLevel: function() {
      return challengeLevel;
    }
  };

  // Make initMagicHorseGame globally accessible
  window.initMagicHorseGame = initMagicHorseGame;
})(); 