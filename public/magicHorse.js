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
    const descriptionEl = document.getElementById('magic-horse-status');
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
        descriptionEl.textContent = `Castle Wars Challenge: Capture all queens using castle teleports!`;
        
        // Add detailed help text for Castle Wars
        const infoPanel = document.querySelector('.info-panel');
        if (infoPanel) {
          // Check if we already added the castle wars info
          if (!document.getElementById('castle-wars-help')) {
            const helpText = document.createElement('p');
            helpText.id = 'castle-wars-help';
            helpText.innerHTML = `<strong>Castle Wars Rules:</strong> Your knight can teleport between castle squares (♜). Use this ability to reach all areas of the board and capture every queen.`;
            helpText.style.color = '#8B4513';
            helpText.style.fontStyle = 'italic';
            helpText.style.marginTop = '10px';
            infoPanel.appendChild(helpText);
          }
        }
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
    console.log('Creating board UI...');
    
    // Clear the board element first
    if (magicHorseBoardEl) {
      magicHorseBoardEl.innerHTML = '';
      
      // Create squares
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const square = document.createElement('div');
          square.className = 'square ' + ((row + col) % 2 === 0 ? 'light-square' : 'dark-square');
          square.dataset.row = row;
          square.dataset.col = col;
          
          // Add piece if needed
          if (magicHorseBoard[row][col]) {
            const piece = document.createElement('div');
            piece.className = `piece ${magicHorseBoard[row][col].type}`;
            
            // For display purposes
            if (magicHorseBoard[row][col].type === 'queen') {
              piece.textContent = '♛'; 
            } else if (magicHorseBoard[row][col].type === 'horse') {
              piece.textContent = '♞';
            } else if (magicHorseBoard[row][col].type === 'castle') {
              piece.textContent = '♜';
              piece.classList.add('castle');
            }
            
            square.appendChild(piece);
          }
          
          // Add click event
          square.addEventListener('click', function() {
            console.log(`Square clicked: row ${row}, col ${col}`);
            handleSquareClick(row, col);
          });
          
          magicHorseBoardEl.appendChild(square);
        }
      }
      
      // Add castle CSS if it doesn't exist
      if (!document.getElementById('castle-styles')) {
        const style = document.createElement('style');
        style.id = 'castle-styles';
        style.textContent = `
          .castle {
            color: #8B4513;
            font-size: 2.7em;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
          }
          
          .square:has(.castle) {
            background-color: rgba(139, 69, 19, 0.2);
          }
          
          @keyframes castle-glow {
            0% { box-shadow: 0 0 10px rgba(139, 69, 19, 0.5); }
            50% { box-shadow: 0 0 20px rgba(139, 69, 19, 0.8); }
            100% { box-shadow: 0 0 10px rgba(139, 69, 19, 0.5); }
          }
          
          .castle-valid-move {
            animation: castle-glow 1.5s infinite;
          }
        `;
        document.head.appendChild(style);
      }
      
      console.log('Board UI created with 64 squares');
    } else {
      console.error('Magic horse board element not found!');
    }
  }

  // Handle square click
  function handleSquareClick(row, col) {
    console.log(`handleSquareClick called with row: ${row}, col: ${col}`);
    
    // If game is over, don't do anything
    if (magicHorseGameStatus !== 'active') {
      console.log('Game is over, ignoring click');
      return;
    }
    
    // If we've already selected a square
    if (magicHorseSelectedSquare !== null) {
      const fromRow = magicHorseSelectedSquare.row;
      const fromCol = magicHorseSelectedSquare.col;
      
      // Check the type of piece at the target
      const targetPiece = magicHorseBoard[row][col] ? magicHorseBoard[row][col].type : null;
      const isCastleWars = challengeLevel === 4;
      
      // Special case for Castle Wars: can move between castles or to a queen
      const castleToQueenMove = isCastleWars && 
                              magicHorseBoard[fromRow][fromCol].type === 'horse' &&
                              targetPiece === 'queen' &&
                              isValidMove(fromRow, fromCol, row, col);
                              
      const castleToCastleMove = isCastleWars && 
                               magicHorseBoard[fromRow][fromCol].type === 'horse' &&
                               targetPiece === 'castle';
      
      // Check if move is valid
      if (castleToQueenMove || (castleToCastleMove && horseOnCastle())) {
        console.log(`Valid move from (${fromRow}, ${fromCol}) to (${row}, ${col})`);
        
        // Make the move
        makeMove(fromRow, fromCol, row, col);
        
        // Clear the selected square
        magicHorseSelectedSquare = null;
        clearHighlights();
      } else {
        console.log(`Invalid move from (${fromRow}, ${fromCol}) to (${row}, ${col})`);
        
        // Check if the new click is on the horse, if so, update the selected square
        if (magicHorseBoard[row][col] && magicHorseBoard[row][col].type === 'horse') {
          magicHorseSelectedSquare = { row, col };
          clearHighlights();
          highlightValidMoves();
        } else {
          // Otherwise, just clear the selection
          magicHorseSelectedSquare = null;
          clearHighlights();
        }
      }
    } else {
      // If we haven't selected a square yet, check if the clicked square has the horse
      if (magicHorseBoard[row][col] && magicHorseBoard[row][col].type === 'horse') {
        magicHorseSelectedSquare = { row, col };
        clearHighlights();
        highlightValidMoves();
      }
    }
  }
  
  // Check if the horse is on a castle square
  function horseOnCastle() {
    // In Castle Wars, castles are in specific positions
    if (challengeLevel !== 4) return false;
    
    // Get the horse position
    const { row, col } = horsePosition;
    
    // Check if any of these positions match the castle positions
    const castlePositions = [
      {row: 0, col: 0},  // Top-left
      {row: 0, col: 7},  // Top-right
      {row: 7, col: 0},  // Bottom-left
      {row: 7, col: 7},  // Bottom-right
      {row: 3, col: 3},  // Center left
      {row: 3, col: 4},  // Center right
      {row: 4, col: 3},  // Center bottom-left
      {row: 4, col: 4}   // Center bottom-right
    ];
    
    return castlePositions.some(pos => pos.row === row && pos.col === col);
  }

  // Make a move
  function makeMove(fromRow, fromCol, toRow, toCol) {
    console.log(`makeMove called from (${fromRow}, ${fromCol}) to (${toRow}, ${toCol})`);
    
    // Show capture animation
    showCaptureAnimation(toRow, toCol);
    
    // We're removing a queen
    if (magicHorseBoard[toRow][toCol] && magicHorseBoard[toRow][toCol].type === 'queen') {
      queensRemaining--;
      
      // Set the flag that we've started capturing
      hasStartedCapturing = true;
    }
    
    // Move the horse to the new position
    magicHorseBoard[toRow][toCol] = magicHorseBoard[fromRow][fromCol];
    magicHorseBoard[fromRow][fromCol] = null;
    
    // Update the horse's position
    horsePosition = { row: toRow, col: toCol };
    
    // Update the move count
    magicHorseMoveCount++;
    
    // Highlight the last move
    highlightLastMove(fromRow, fromCol, toRow, toCol);
    
    // Update the game info
    updateGameInfo();
    
    // Update the progress indicator
    updateProgressIndicator();
    
    // Send the move to the server
    sendMoveToServer(fromRow, fromCol, toRow, toCol);
    
    // Check if the game is over
    checkGameOver();
  }
  
  // Highlight last move
  function highlightLastMove(fromRow, fromCol, toRow, toCol) {
    // Clear previous highlights
    clearHighlights();
    
    // Highlight the from and to squares
    const fromSquare = getSquareElement(fromRow, fromCol);
    const toSquare = getSquareElement(toRow, toCol);
    
    if (fromSquare) {
      fromSquare.classList.add('last-move');
    }
    
    if (toSquare) {
      toSquare.classList.add('last-move');
    }
  }

  // Check if the game is over
  function checkGameOver() {
    console.log('Checking if game is over. Queens remaining:', queensRemaining);
    
    // Get possible moves from current position
    let validMoves = [];
    
    // For Castle Wars, we can continue if we're on a castle
    const isCastleWars = challengeLevel === 4;
    const canContinueViaCastle = isCastleWars && horseOnCastle();
    
    // Only check for valid moves if we're not on a castle in Castle Wars
    if (!canContinueViaCastle) {
      validMoves = getValidMoves();
    }
    
    // Check win condition based on level
    let isWin = false;
    
    if (isCastleWars) {
      // Castle Wars: Win if all queens are captured
      isWin = queensRemaining === 0;
    } else {
      // Normal levels: Win if queensRemaining equals the win condition
      isWin = queensRemaining === magicHorseWinCondition;
    }
    
    // Check if the game is over
    if (isWin) {
      console.log('Win condition met! Queens remaining:', queensRemaining);
      magicHorseGameStatus = 'win';
      showGameResult(true);
      return true;
    } else if (validMoves.length === 0 && !canContinueViaCastle) {
      // No more moves available and not on a castle in Castle Wars
      if (queensRemaining < magicHorseWinCondition) {
        console.log('Game over: Too few queens remaining');
        magicHorseGameStatus = 'loss';
        showGameResult(false, 'too_few');
      } else {
        console.log('Game over: No more valid moves');
        magicHorseGameStatus = 'loss';
        showGameResult(false, 'no_moves');
      }
      return true;
    }
    
    return false;
  }

  // Show game result
  function showGameResult(isWin, reason = '') {
    console.log(`Game over - ${isWin ? 'Win' : 'Loss'}`);
    
    // Get appropriate modal
    const modalId = isWin ? 'success-modal' : 'failure-modal';
    const modal = document.getElementById(modalId);
    
    // Get message element
    const messageEl = document.getElementById(isWin ? 'success-message' : 'failure-message');
    
    if (!modal || !messageEl) {
      console.error('Modal or message element not found');
      return;
    }
    
    // Create appropriate message
    let message = '';
    let rewardMessage = '';
    
    if (isWin) {
      // Win messages
      if (challengeLevel === 4) {
        // Castle Wars challenge
        message = `
          <h3>Castle Wars Completed!</h3>
          <p>Congratulations! You've conquered the Castle Wars challenge by capturing all queens in ${magicHorseMoveCount} moves.</p>
          <p>You navigated the castles like a true strategist!</p>
        `;
        rewardMessage = `<p class="reward">Reward: 500 coins added to your balance!</p>`;
      } else {
        // Standard Magic Horse challenge
        message = `
          <h3>Challenge Completed!</h3>
          <p>Congratulations! You've completed the Magic Horse challenge level ${challengeLevel}!</p>
          <p>You left exactly ${queensRemaining} queens on the board in ${magicHorseMoveCount} moves.</p>
        `;
        
        // Different rewards based on level
        const rewards = [100, 200, 300, 500];
        rewardMessage = `<p class="reward">Reward: ${rewards[challengeLevel-1]} coins added to your balance!</p>`;
      }
    } else {
      // Loss messages
      if (challengeLevel === 4) {
        // Castle Wars challenge
        if (reason === 'too_few') {
          message = `
            <h3>Castle Wars Failed</h3>
            <p>Your objective was to capture all queens, but you've run out of moves with ${queensRemaining} queens remaining.</p>
            <p>Try to use the castle network more efficiently to access all queens!</p>
          `;
        } else {
          message = `
            <h3>Castle Wars Failed</h3>
            <p>You've run out of moves! Remember that you can teleport between castle squares to reach different parts of the board.</p>
            <p>Try to plan your route through the castles strategically.</p>
          `;
        }
      } else {
        // Standard Magic Horse challenge
        if (reason === 'too_few') {
          message = `
            <h3>Challenge Failed</h3>
            <p>You've captured too many queens! The target was to leave exactly ${magicHorseWinCondition} queens, but you have ${queensRemaining} remaining.</p>
            <p>Try to plan your moves more carefully.</p>
          `;
        } else {
          message = `
            <h3>Challenge Failed</h3>
            <p>You've run out of moves! There are no more valid moves available.</p>
            <p>Try to position your horse more strategically to avoid getting stuck.</p>
          `;
        }
      }
    }
    
    // Set message
    messageEl.innerHTML = message + rewardMessage;
    
    // Update user progress
    if (isWin) {
      updateUserProgress(challengeLevel, 'completed');
    }
    
    // Show modal
    modal.classList.remove('hidden');
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
    const square = getSquareElement(row, col);
    if (!square) {
      console.error(`Square element not found for capture animation at row ${row}, col ${col}`);
      return;
    }
    
    // Find the piece element in the square
    const pieceEl = square.querySelector('.piece');
    if (!pieceEl) {
      console.error(`Piece element not found in square at row ${row}, col ${col}`);
      return;
    }
    
    // Create a visual effect for the capture
    const effect = document.createElement('div');
    effect.className = 'capture-effect';
    square.appendChild(effect);
    
    // Play capture sound if available
    if (typeof playSound === 'function') {
      playSound('capture');
    }
    
    // Add the capturing class to trigger the animation
    pieceEl.classList.add('capturing');
    
    // Remove the effect and piece after the animation completes
    setTimeout(() => {
      // Remove the effect
      if (effect.parentNode) {
        effect.parentNode.removeChild(effect);
      }
      
      // Remove the piece
      if (pieceEl.parentNode) {
        pieceEl.parentNode.removeChild(pieceEl);
      }
      
      // Update the progress indicator
      updateProgressIndicator();
      
    }, 500);
    
    console.log(`Capture animation shown at row ${row}, col ${col}`);
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
    console.log('highlightValidMoves called');
    clearHighlights();
    
    if (!magicHorseSelectedSquare) {
      // If no square is selected but we have a horse position, highlight the horse
      const horseSquare = getSquareElement(horsePosition.row, horsePosition.col);
      if (horseSquare) {
        horseSquare.classList.add('highlight');
        
        // Add pulsing effect to indicate it can be selected
        horseSquare.classList.add('pulse');
      }
      return;
    }
    
    const validMoves = getValidMoves();
    console.log('Valid moves:', validMoves);
    
    // Highlight the selected square
    const selectedSquare = getSquareElement(magicHorseSelectedSquare.row, magicHorseSelectedSquare.col);
    if (selectedSquare) {
      selectedSquare.classList.add('selected');
    }
    
    // Special handling for Castle Wars challenge
    if (challengeLevel === 4 && horseOnCastle()) {
      // Highlight all other castles as valid destinations
      const castlePositions = [
        {row: 0, col: 0},  // Top-left
        {row: 0, col: 7},  // Top-right
        {row: 7, col: 0},  // Bottom-left
        {row: 7, col: 7},  // Bottom-right
        {row: 3, col: 3},  // Center left
        {row: 3, col: 4},  // Center right
        {row: 4, col: 3},  // Center bottom-left
        {row: 4, col: 4}   // Center bottom-right
      ];
      
      castlePositions.forEach(pos => {
        // Don't highlight the current position
        if (pos.row === horsePosition.row && pos.col === horsePosition.col) return;
        
        const castleSquare = getSquareElement(pos.row, pos.col);
        if (castleSquare) {
          castleSquare.classList.add('castle-valid-move');
          castleSquare.setAttribute('data-move-type', 'castle-jump');
        }
      });
    }
    
    // Highlight normal valid moves (queens that can be captured)
    let moveCount = 0;
    validMoves.forEach(move => {
      moveCount++;
      const validSquare = getSquareElement(move.row, move.col);
      if (validSquare) {
        validSquare.classList.add('highlight');
        
        // Add information about the move direction for better visual cues
        const direction = getMoveDirection(
          magicHorseSelectedSquare.row, 
          magicHorseSelectedSquare.col, 
          move.row, 
          move.col
        );
        validSquare.setAttribute('data-move-direction', direction);
      }
    });
    
    // Update game status to show number of possible moves
    const statusEl = document.getElementById('magic-horse-status');
    if (statusEl) {
      if (moveCount === 0 && !horseOnCastle()) {
        // No more moves, but the game might not be over if we're on a castle in level 4
        statusEl.textContent = `Warning: No valid moves available! ${challengeLevel === 4 ? 'Try to reach a castle!' : ''}`;
        statusEl.style.color = 'red';
      } else {
        const baseText = document.getElementById('magic-horse-status').textContent.split(':')[0];
        statusEl.textContent = `${baseText}: ${moveCount} possible moves${challengeLevel === 4 ? ' (or castle jumps)' : ''}`;
        statusEl.style.color = '';
      }
    }
  }
  
  // Get move direction for visual indicators
  function getMoveDirection(fromRow, fromCol, toRow, toCol) {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    
    if (rowDiff === -2 && colDiff === -1) return 'up-left';
    if (rowDiff === -2 && colDiff === 1) return 'up-right';
    if (rowDiff === -1 && colDiff === -2) return 'left-up';
    if (rowDiff === -1 && colDiff === 2) return 'right-up';
    if (rowDiff === 1 && colDiff === -2) return 'left-down';
    if (rowDiff === 1 && colDiff === 2) return 'right-down';
    if (rowDiff === 2 && colDiff === -1) return 'down-left';
    if (rowDiff === 2 && colDiff === 1) return 'down-right';
    
    return '';
  }

  // Clear highlights
  function clearHighlights() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
      square.classList.remove('highlight', 'selected');
    });
  }

  // Get a square element by row and column
  function getSquareElement(row, col) {
    if (!magicHorseBoardEl) return null;
    
    const square = magicHorseBoardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!square) {
      console.error(`Square element not found for row ${row}, col ${col}`);
      return null;
    }
    
    return square;
  }

  // Update game info
  function updateGameInfo() {
    console.log('Updating game info...');
    
    if (!magicHorseMoveCountEl || !magicHorseQueensRemainingEl || !magicHorseStatusEl) {
      console.error('Game info elements not found');
      return;
    }
    
    // Update move count and queens remaining
    magicHorseMoveCountEl.textContent = magicHorseMoveCount;
    magicHorseQueensRemainingEl.textContent = queensRemaining;
    
    // Update status message based on challenge level
    let statusText = '';
    
    switch (challengeLevel) {
      case 1:
        statusText = `Level 1 Challenge: Leave ${magicHorseWinCondition} queens to win`;
        break;
      case 2:
        statusText = `Level 2 Challenge: Leave ${magicHorseWinCondition} queens to win`;
        break;
      case 3:
        statusText = `Level 3 Challenge: Leave ${magicHorseWinCondition} queen to win`;
        break;
      case 4:
        statusText = 'Castle Wars Challenge: Clear all queens to unlock Battle Chess!';
        break;
      default:
        statusText = `Level ${challengeLevel} Challenge: Leave ${magicHorseWinCondition} queens to win`;
    }
    
    // Show different message if game is over
    if (magicHorseGameStatus === 'won') {
      statusText = `Level ${challengeLevel} Challenge: You won!`;
    } else if (magicHorseGameStatus === 'lost') {
      statusText = `Level ${challengeLevel} Challenge: You lost!`;
    }
    
    magicHorseStatusEl.textContent = statusText;
    
    console.log(`Game info updated: Moves: ${magicHorseMoveCount}, Queens: ${queensRemaining}, Status: ${statusText}`);
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
      console.log(`[${type.toUpperCase()}]: ${message}`);
      
      // Create a toast notification container if it doesn't exist
      let toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
      }
      
      // Create the toast element
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.style.backgroundColor = type === 'success' ? '#4caf50' : 
                                     type === 'info' ? '#2196f3' : '#f44336';
      toast.style.color = 'white';
      toast.style.padding = '12px 20px';
      toast.style.borderRadius = '4px';
      toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      toast.style.marginBottom = '10px';
      toast.style.minWidth = '250px';
      toast.style.display = 'flex';
      toast.style.justifyContent = 'space-between';
      toast.style.alignItems = 'center';
      toast.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 4.7s';
      
      // Add message and close button
      toast.innerHTML = `
        <div>${message}</div>
        <button style="background: transparent; border: none; color: white; font-size: 16px; cursor: pointer; margin-left: 10px;">×</button>
      `;
      
      // Add to container
      toastContainer.appendChild(toast);
      
      // Add close button functionality
      const closeBtn = toast.querySelector('button');
      closeBtn.addEventListener('click', () => {
        toast.style.opacity = '0';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      });
      
      // Auto remove after 5 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 5000);
      
      // Add animation styles if they don't exist
      if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(20px); }
          }
        `;
        document.head.appendChild(style);
      }
    };
  }

  // Helper function for showing success messages if not defined in global scope
  if (typeof showSuccess !== 'function') {
    window.showSuccess = function(message) {
      if (typeof showError === 'function') {
        showError(message, 'success');
      } else {
        console.log(message);
        alert(message);
      }
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

  // At the beginning of the file, add these lines
  document.addEventListener('DOMContentLoaded', () => {
    setupChallengeButtons();
  });

  function setupChallengeButtons() {
    // Get all Start Challenge buttons
    const challengeButtons = document.querySelectorAll('.start-challenge-btn');
    
    // Add event listeners to each button
    challengeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const challengeLevel = e.target.dataset.challenge;
        startChallenge(challengeLevel);
      });
    });
  }

  function startChallenge(challengeLevel) {
    // Check if the user is authenticated
    if (!window.authManager || !window.authManager.isAuthenticated) {
      // Show login required message
      showLoginRequiredMessage();
      return;
    }
    
    // If authenticated, proceed with starting the challenge
    console.log(`Starting challenge: ${challengeLevel}`);
    // Your existing code to start the challenge
    // ...
  }

  function showLoginRequiredMessage() {
    // Create a message element
    const messageContainer = document.createElement('div');
    messageContainer.className = 'login-required-message';
    messageContainer.innerHTML = `
      <div class="login-message-content">
        <h3>Login Required</h3>
        <p>You must be logged in to start a challenge.</p>
        <div class="login-buttons">
          <button id="login-now-btn" class="btn btn-primary">Login</button>
          <button id="use-test-account-btn" class="btn btn-secondary">Use Test Account</button>
        </div>
      </div>
    `;
    
    // Add to the document
    document.body.appendChild(messageContainer);
    
    // Add event listeners
    document.getElementById('login-now-btn').addEventListener('click', () => {
      messageContainer.remove();
      openModal('loginModal');
    });
    
    document.getElementById('use-test-account-btn').addEventListener('click', () => {
      messageContainer.remove();
      // Use the test account functionality
      if (window.authManager) {
        window.authManager.createTestAccount();
      }
    });
    
    // Allow clicking outside to dismiss
    messageContainer.addEventListener('click', (e) => {
      if (e.target === messageContainer) {
        messageContainer.remove();
      }
    });
  }

  // Setup the magic horse board
  function setupBoard() {
    console.log('Setting up board for level:', challengeLevel);
    magicHorseBoard = [];
    
    // Create an empty 8x8 board
    for (let i = 0; i < 8; i++) {
      magicHorseBoard[i] = Array(8).fill(null);
    }
    
    if (challengeLevel === 4) {
      // Castle Wars Challenge setup
      setupCastleWarsBoard();
    } else {
      // Standard Magic Horse Challenge setup
      setupStandardBoard();
    }
    
    renderBoard();
    highlightValidMoves();
    updateGameInfo();
    updateProgressIndicator();
  }
  
  // Setup a standard Magic Horse Challenge board
  function setupStandardBoard() {
    // Place queens on the board
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        // Skip the center 2x2 area
        if ((i === 3 || i === 4) && (j === 3 || j === 4)) continue;
        
        magicHorseBoard[i][j] = { type: 'queen' };
      }
    }
    
    // Place the horse in the center
    horsePosition = { row: 3, col: 3 };
    magicHorseBoard[horsePosition.row][horsePosition.col] = { type: 'horse' };
    
    // Reset the move count and queens remaining
    magicHorseMoveCount = 0;
    queensRemaining = 24;
  }
  
  // Setup the board for Castle Wars Challenge
  function setupCastleWarsBoard() {
    // Place castles in the four corners and center
    const castlePositions = [
      {row: 0, col: 0},  // Top-left
      {row: 0, col: 7},  // Top-right
      {row: 7, col: 0},  // Bottom-left
      {row: 7, col: 7},  // Bottom-right
      {row: 3, col: 3},  // Center left
      {row: 3, col: 4},  // Center right
      {row: 4, col: 3},  // Center bottom-left
      {row: 4, col: 4}   // Center bottom-right
    ];
    
    // Place queens around the board
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        // Skip castle positions
        if (castlePositions.some(pos => pos.row === i && pos.col === j)) {
          magicHorseBoard[i][j] = { type: 'castle' };
        }
        // Place queens in specific patterns
        else if ((i + j) % 2 === 0) {  // Checkered pattern
          magicHorseBoard[i][j] = { type: 'queen' };
        }
      }
    }
    
    // Place the horse in the center castle
    horsePosition = { row: 3, col: 3 };
    magicHorseBoard[horsePosition.row][horsePosition.col] = { type: 'horse' };
    
    // Reset the move count and queens remaining
    // Count the actual queens on the board
    queensRemaining = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (magicHorseBoard[i][j] && magicHorseBoard[i][j].type === 'queen') {
          queensRemaining++;
        }
      }
    }
    
    magicHorseMoveCount = 0;
  }
  
  // Render the board
  function renderBoard() {
    // ... existing code ...
  }
})(); 