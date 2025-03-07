// Game State
let chess = null;
let board = [];
let gameId = null;
let selectedSquare = null;
let playerColor = 'white';
let isPlayerTurn = false;
let currentUser = null;
let socket = null;
let isAiGame = false;
let isAiVsAiGame = false;
let aiVsAiTimer = null;
let aiMoveSpeed = 1000;
let betPlaced = false;
let soundEnabled = true;
let pendingPromotion = null;
let gameTimers = { white: null, black: null };
let gameTimes = { white: 600, black: 600 }; // 10 minutes in seconds
let timerIntervals = { white: null, black: null };
let bettingHistory = [];
let totalEarnings = 0;
let availablePlayers = [];
let chatOpen = true;
let lobbyMessages = [];
let gameMessages = [];

// DOM Elements
let chessboardEl, gameStatusEl, movesListEl, whitePlayerEl, blackPlayerEl, usernameDisplayEl, balanceDisplayEl;
let loginBtn, registerBtn, logoutBtn, loginModal, registerModal, loginForm, registerForm, closeBtns;
let newGameBtn, playAiBtn, aiVsAiBtn, findOpponentBtn, aiOptions, aiVsAiOptions, bettingOptions;
let aiDifficultySlider, difficultyValueEl, aiWhiteDifficultySlider, aiBlackDifficultySlider;
let whiteDifficultyValueEl, blackDifficultyValueEl, aiMoveSpeedSlider, moveSpeedValueEl;
let startAiGameBtn, startAiVsAiBtn, betAmountInput, placeBetBtn, resignBtn, offerDrawBtn;
let gameResultModal, resultMessageEl, bettingResultEl, newGameAfterResultBtn, viewProfileAfterResultBtn;
let soundToggle, promotionModal, promotionPieces;
let moveSound, captureSound, checkSound, castleSound, promoteSound, gameEndSound, errorSound, chatSound;
let profileBtn, backToGameBtn, gameSection, profileSection;
let gamesPlayedEl, gamesWonEl, gamesLostEl, gamesTiedEl, winPercentageEl, totalEarningsEl, bettingHistoryTableEl;
let lobbyModal, availablePlayersEl, betAmountLobbyInput, createGameBtn, lobbyChatMessagesEl, lobbyChatInput, sendLobbyChatBtn;
let gameChatEl, gameChatHeaderEl, toggleChatBtn, gameChatMessagesEl, gameChatInput, sendGameChatBtn;

// Initialize the app
function init() {
  // Get DOM Elements
  chessboardEl = document.getElementById('chessboard');
  gameStatusEl = document.getElementById('game-status');
  movesListEl = document.getElementById('moves-list');
  whitePlayerEl = document.getElementById('white-player');
  blackPlayerEl = document.getElementById('black-player');
  usernameDisplayEl = document.getElementById('username-display');
  balanceDisplayEl = document.getElementById('balance-display');

  // Auth Elements
  loginBtn = document.getElementById('login-btn');
  registerBtn = document.getElementById('register-btn');
  logoutBtn = document.getElementById('logout-btn');
  loginModal = document.getElementById('login-modal');
  registerModal = document.getElementById('register-modal');
  loginForm = document.getElementById('login-form');
  registerForm = document.getElementById('register-form');
  closeBtns = document.querySelectorAll('.close-btn');

  // Game Control Elements
  newGameBtn = document.getElementById('new-game-btn');
  playAiBtn = document.getElementById('play-ai-btn');
  aiVsAiBtn = document.getElementById('ai-vs-ai-btn');
  findOpponentBtn = document.getElementById('find-opponent-btn');
  aiOptions = document.getElementById('ai-options');
  aiVsAiOptions = document.getElementById('ai-vs-ai-options');
  bettingOptions = document.getElementById('betting-options');
  
  aiDifficultySlider = document.getElementById('ai-difficulty');
  difficultyValueEl = document.getElementById('difficulty-value');
  
  aiWhiteDifficultySlider = document.getElementById('ai-white-difficulty');
  aiBlackDifficultySlider = document.getElementById('ai-black-difficulty');
  whiteDifficultyValueEl = document.getElementById('white-difficulty-value');
  blackDifficultyValueEl = document.getElementById('black-difficulty-value');
  aiMoveSpeedSlider = document.getElementById('ai-move-speed');
  moveSpeedValueEl = document.getElementById('move-speed-value');
  
  startAiGameBtn = document.getElementById('start-ai-game-btn');
  startAiVsAiBtn = document.getElementById('start-ai-vs-ai-btn');
  betAmountInput = document.getElementById('bet-amount');
  placeBetBtn = document.getElementById('place-bet-btn');
  resignBtn = document.getElementById('resign-btn');
  offerDrawBtn = document.getElementById('offer-draw-btn');

  // Game Result Modal
  gameResultModal = document.getElementById('game-result-modal');
  resultMessageEl = document.getElementById('result-message');
  bettingResultEl = document.getElementById('betting-result');
  newGameAfterResultBtn = document.getElementById('new-game-after-result');
  viewProfileAfterResultBtn = document.getElementById('view-profile-after-result');
  
  // Sound Elements
  soundToggle = document.getElementById('sound-toggle');
  moveSound = document.getElementById('move-sound');
  captureSound = document.getElementById('capture-sound');
  checkSound = document.getElementById('check-sound');
  castleSound = document.getElementById('castle-sound');
  promoteSound = document.getElementById('promote-sound');
  gameEndSound = document.getElementById('game-end-sound');
  errorSound = document.getElementById('error-sound');
  chatSound = document.getElementById('chat-sound');
  
  // Promotion Modal
  promotionModal = document.getElementById('promotion-modal');
  promotionPieces = document.querySelectorAll('.promotion-piece');
  
  // Profile Elements
  profileBtn = document.getElementById('profile-btn');
  backToGameBtn = document.getElementById('back-to-game-btn');
  gameSection = document.getElementById('game-section');
  profileSection = document.getElementById('profile-section');
  
  gamesPlayedEl = document.getElementById('games-played');
  gamesWonEl = document.getElementById('games-won');
  gamesLostEl = document.getElementById('games-lost');
  gamesTiedEl = document.getElementById('games-tied');
  winPercentageEl = document.getElementById('win-percentage');
  totalEarningsEl = document.getElementById('total-earnings');
  bettingHistoryTableEl = document.getElementById('betting-history-table');
  
  // Lobby Elements
  lobbyModal = document.getElementById('lobby-modal');
  availablePlayersEl = document.getElementById('available-players');
  betAmountLobbyInput = document.getElementById('bet-amount-lobby');
  createGameBtn = document.getElementById('create-game-btn');
  lobbyChatMessagesEl = document.getElementById('lobby-chat-messages');
  lobbyChatInput = document.getElementById('lobby-chat-input');
  sendLobbyChatBtn = document.getElementById('send-lobby-chat-btn');
  
  // Game Chat Elements
  gameChatEl = document.getElementById('game-chat');
  gameChatHeaderEl = document.querySelector('.chat-header');
  toggleChatBtn = document.getElementById('toggle-chat-btn');
  gameChatMessagesEl = document.getElementById('game-chat-messages');
  gameChatInput = document.getElementById('game-chat-input');
  sendGameChatBtn = document.getElementById('send-game-chat-btn');
  
  // Set promotion piece images
  document.getElementById('promote-queen').src = 'https://lichess1.org/assets/piece/cburnett/wQ.svg';
  document.getElementById('promote-rook').src = 'https://lichess1.org/assets/piece/cburnett/wR.svg';
  document.getElementById('promote-bishop').src = 'https://lichess1.org/assets/piece/cburnett/wB.svg';
  document.getElementById('promote-knight').src = 'https://lichess1.org/assets/piece/cburnett/wN.svg';
  
  // Initialize Chess.js
  chess = new Chess();
  
  // Create the chessboard
  createBoard();
  
  // Setup drag-and-drop functionality
  setupDragAndDrop();
  
  // Connect to WebSocket server
  connectWebSocket();
  
  // Check if user is logged in
  checkAuthStatus();
  
  // Add event listeners
  setupEventListeners();
}

// Create the chessboard
function createBoard() {
  chessboardEl.innerHTML = '';
  
  // Create 64 squares
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      const isLightSquare = (row + col) % 2 === 0;
      
      square.className = `square ${isLightSquare ? 'light-square' : 'dark-square'}`;
      square.dataset.row = 7 - row; // Flip rows for chess notation (0-7 to a-h)
      square.dataset.col = col;
      
      // Add click event for square selection
      square.addEventListener('click', () => handleSquareClick(square));
      
      chessboardEl.appendChild(square);
      
      // Add to board array for easy access
      if (!board[7 - row]) board[7 - row] = [];
      board[7 - row][col] = square;
    }
  }
  
  // Update the board with pieces
  updateBoard();
}

// Update the board based on current chess position
function updateBoard() {
  // Clear all pieces
  document.querySelectorAll('.piece').forEach(piece => piece.remove());
  
  // Add pieces based on current position
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = chess.board()[row][col];
      if (piece) {
        addPiece(row, col, piece.color, piece.type);
      }
    }
  }
  
  // Update game status
  updateGameStatus();
}

// Add a piece to the board
function addPiece(row, col, color, type) {
  const square = board[row][col];
  const pieceEl = document.createElement('div');
  
  pieceEl.className = 'piece';
  pieceEl.dataset.color = color;
  pieceEl.dataset.type = type;
  
  // Set piece image
  pieceEl.style.backgroundImage = `url('https://lichess1.org/assets/piece/cburnett/${color}${type.toUpperCase()}.svg')`;
  
  // Add drag-and-drop support
  pieceEl.setAttribute('draggable', 'true');
  
  // Add drag events
  pieceEl.addEventListener('dragstart', (e) => {
    // Only allow dragging if it's the player's turn and the piece is the player's color
    if (!isPlayerTurn || color !== playerColor[0]) {
      e.preventDefault();
      return false;
    }
    
    // Add dragging class
    pieceEl.classList.add('dragging');
    
    // Store the piece's position
    e.dataTransfer.setData('text/plain', `${row},${col}`);
    
    // Set the drag image
    const dragImage = pieceEl.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 30, 30);
    
    // Remove the drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    // Clear any existing highlights and set this square as selected
    clearHighlights();
    square.classList.add('selected-piece');
    selectedSquare = square;
    
    // Highlight possible moves
    highlightPossibleMoves(row, col);
  });
  
  pieceEl.addEventListener('dragend', () => {
    pieceEl.classList.remove('dragging');
  });
  
  // Add click event for piece selection
  pieceEl.addEventListener('click', (e) => {
    // Prevent the click from bubbling to the square
    e.stopPropagation();
    
    // Only allow selection if it's the player's turn and the piece is the player's color
    if (!isPlayerTurn || color !== playerColor[0]) {
      return;
    }
    
    // Clear any existing highlights
    clearHighlights();
    
    // If this piece is already selected, deselect it
    if (selectedSquare === square) {
      selectedSquare = null;
      return;
    }
    
    // Set this square as selected
    square.classList.add('selected-piece');
    selectedSquare = square;
    
    // Highlight possible moves
    highlightPossibleMoves(row, col);
  });
  
  square.appendChild(pieceEl);
  
  // Add animation class if this is a new piece being moved
  if (chess.history().length > 0) {
    pieceEl.classList.add('moving');
    // Remove the animation class after the animation completes
    setTimeout(() => {
      pieceEl.classList.remove('moving');
    }, 300);
  }
}

// Play sound effect
function playSound(type, isMuted = false) {
  if (!soundEnabled || isMuted) return;
  
  switch (type) {
    case 'move':
      moveSound.currentTime = 0;
      moveSound.play();
      break;
    case 'capture':
      captureSound.currentTime = 0;
      captureSound.play();
      break;
    case 'check':
      checkSound.currentTime = 0;
      checkSound.play();
      break;
    case 'castle':
      castleSound.currentTime = 0;
      castleSound.play();
      break;
    case 'promote':
      promoteSound.currentTime = 0;
      promoteSound.play();
      break;
    case 'game-end':
      gameEndSound.currentTime = 0;
      gameEndSound.play();
      break;
    case 'error':
      errorSound.currentTime = 0;
      errorSound.play();
      break;
  }
}

// Handle square click
function handleSquareClick(square) {
  // Only allow moves if it's player's turn
  if (!isPlayerTurn) return;
  
  const row = parseInt(square.dataset.row);
  const col = parseInt(square.dataset.col);
  
  // If a piece is already selected, try to move it
  if (selectedSquare) {
    const fromRow = parseInt(selectedSquare.dataset.row);
    const fromCol = parseInt(selectedSquare.dataset.col);
    
    // Convert to algebraic notation
    const from = `${String.fromCharCode(97 + fromCol)}${fromRow + 1}`;
    const to = `${String.fromCharCode(97 + col)}${row + 1}`;
    
    // Check if this is a pawn promotion move
    const piece = chess.get(from);
    const isPromotion = piece && 
                       piece.type === 'p' && 
                       ((piece.color === 'w' && row === 7) || 
                        (piece.color === 'b' && row === 0));
    
    if (isPromotion) {
      // Store the pending promotion
      pendingPromotion = { from, to };
      
      // Update promotion piece colors based on player color
      const pieceColor = piece.color === 'w' ? 'w' : 'b';
      document.getElementById('promote-queen').src = `https://lichess1.org/assets/piece/cburnett/${pieceColor}Q.svg`;
      document.getElementById('promote-rook').src = `https://lichess1.org/assets/piece/cburnett/${pieceColor}R.svg`;
      document.getElementById('promote-bishop').src = `https://lichess1.org/assets/piece/cburnett/${pieceColor}B.svg`;
      document.getElementById('promote-knight').src = `https://lichess1.org/assets/piece/cburnett/${pieceColor}N.svg`;
      
      // Show promotion modal
      promotionModal.classList.remove('hidden');
      promotionModal.style.display = 'flex';
      
      // Clear selection
      clearHighlights();
      selectedSquare = null;
      
      return;
    }
    
    // Check if move is valid
    try {
      const move = chess.move({ from, to, promotion: 'q' }); // Default promotion to queen
      
      if (move) {
        // Play appropriate sound
        if (move.captured) {
          playSound('capture');
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          playSound('castle');
        } else {
          playSound('move');
        }
        
        // Check if the move puts the opponent in check
        if (chess.isCheck()) {
          playSound('check');
        }
        
        // Update the board
        updateBoard();
        
        // Send move to server
        if (socket && gameId) {
          socket.emit('makeMove', { gameId, from, to, promotion: 'q' });
        }
        
        // Add move to history
        addMoveToHistory(move);
        
        // Highlight the last move
        highlightLastMove(from, to);
        
        // Switch turns
        isPlayerTurn = false;
        
        // Switch active timer
        switchTimer();
        
        // If playing against AI, get AI move
        if (isAiGame) {
          setTimeout(getAiMove, 500);
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
      playSound('error');
      showError('Invalid move');
    }
    
    // Clear selection
    clearHighlights();
    selectedSquare = null;
  } else {
    // Check if the clicked square has a piece of the player's color
    const piece = chess.board()[row][col];
    
    if (piece && piece.color === playerColor[0]) {
      // Highlight selected square
      clearHighlights();
      square.classList.add('selected-piece');
      selectedSquare = square;
      
      // Highlight possible moves
      highlightPossibleMoves(row, col);
    }
  }
}

// Complete promotion move
function completePromotion(promotionPiece) {
  if (!pendingPromotion) return;
  
  const { from, to } = pendingPromotion;
  
  try {
    const move = chess.move({ from, to, promotion: promotionPiece });
    
    if (move) {
      // Play promotion sound
      playSound('promote');
      
      // Update the board
      updateBoard();
      
      // Send move to server
      if (socket && gameId) {
        socket.emit('makeMove', { gameId, from, to, promotion: promotionPiece });
      }
      
      // Add move to history
      addMoveToHistory(move);
      
      // Highlight the last move
      highlightLastMove(from, to);
      
      // Switch turns
      isPlayerTurn = false;
      
      // Switch active timer
      switchTimer();
      
      // If playing against AI, get AI move
      if (isAiGame) {
        setTimeout(getAiMove, 500);
      }
    }
  } catch (error) {
    console.error('Invalid promotion:', error);
    playSound('error');
  }
  
  // Reset pending promotion
  pendingPromotion = null;
  
  // Hide promotion modal
  promotionModal.classList.add('hidden');
}

// Highlight possible moves for a piece
function highlightPossibleMoves(row, col) {
  const from = `${String.fromCharCode(97 + col)}${row + 1}`;
  const moves = chess.moves({ square: from, verbose: true });
  
  moves.forEach(move => {
    const toRow = parseInt(move.to[1]) - 1;
    const toCol = move.to.charCodeAt(0) - 97;
    const targetSquare = board[toRow][toCol];
    
    // Add highlight class
    targetSquare.classList.add('highlight');
    
    // If there's a piece on the target square (capture move), add a special visual indicator
    const targetPiece = chess.get(move.to);
    if (targetPiece) {
      targetSquare.classList.add('capture-highlight');
    }
  });
}

// Clear all highlights
function clearHighlights() {
  document.querySelectorAll('.highlight').forEach(el => {
    el.classList.remove('highlight');
  });
  
  document.querySelectorAll('.last-move').forEach(el => {
    el.classList.remove('last-move');
  });
  
  document.querySelectorAll('.selected-piece').forEach(el => {
    el.classList.remove('selected-piece');
  });
  
  document.querySelectorAll('.capture-highlight').forEach(el => {
    el.classList.remove('capture-highlight');
  });
}

// Highlight the last move
function highlightLastMove(from, to) {
  // Clear previous last-move highlights
  document.querySelectorAll('.last-move').forEach(el => {
    el.classList.remove('last-move');
  });
  
  // Convert algebraic notation to array indices
  const fromRow = parseInt(from[1]) - 1;
  const fromCol = from.charCodeAt(0) - 97;
  const toRow = parseInt(to[1]) - 1;
  const toCol = to.charCodeAt(0) - 97;
  
  // Add last-move class to the squares
  if (board[fromRow] && board[fromRow][fromCol]) {
    board[fromRow][fromCol].classList.add('last-move');
  }
  
  if (board[toRow] && board[toRow][toCol]) {
    board[toRow][toCol].classList.add('last-move');
  }
}

// Add move to history
function addMoveToHistory(move) {
  // Get the history of moves
  const history = chess.history({ verbose: true });
  const moveIndex = history.length - 1;
  const moveNumber = Math.floor(moveIndex / 2) + 1;
  
  // Create move item
  const moveItem = document.createElement('div');
  moveItem.className = 'move-item';
  moveItem.dataset.moveIndex = moveIndex;
  
  // Add move number for white's move
  if (moveIndex % 2 === 0) {
    const moveNumberEl = document.createElement('span');
    moveNumberEl.className = 'move-number';
    moveNumberEl.textContent = `${moveNumber}.`;
    moveItem.appendChild(moveNumberEl);
  }
  
  // Add move notation
  const moveNotation = document.createElement('span');
  moveNotation.className = 'move-notation';
  moveNotation.textContent = chess.history()[moveIndex];
  moveItem.appendChild(moveNotation);
  
  // Add click event to replay the position
  moveItem.addEventListener('click', () => {
    replayPositionAtMove(moveIndex);
  });
  
  // Add to moves list
  movesListEl.appendChild(moveItem);
  
  // Scroll to bottom
  movesListEl.scrollTop = movesListEl.scrollHeight;
}

// Replay the position at a specific move
function replayPositionAtMove(moveIndex) {
  // Create a new chess instance
  const replayChess = new Chess();
  
  // Get the history of moves
  const history = chess.history({ verbose: true });
  
  // Apply moves up to the selected index
  for (let i = 0; i <= moveIndex; i++) {
    if (history[i]) {
      replayChess.move({
        from: history[i].from,
        to: history[i].to,
        promotion: history[i].promotion
      });
    }
  }
  
  // Highlight the selected move
  document.querySelectorAll('.move-item').forEach((item, index) => {
    if (index <= moveIndex) {
      item.classList.add('replayed-move');
    } else {
      item.classList.remove('replayed-move');
    }
  });
  
  // Show a temporary overlay with replay controls
  const replayOverlay = document.createElement('div');
  replayOverlay.className = 'replay-overlay';
  
  // Add replay controls
  const replayControls = document.createElement('div');
  replayControls.className = 'replay-controls';
  
  // Previous move button
  const prevButton = document.createElement('button');
  prevButton.className = 'btn';
  prevButton.innerHTML = '<i class="fas fa-step-backward"></i>';
  prevButton.addEventListener('click', () => {
    if (moveIndex > 0) {
      replayPositionAtMove(moveIndex - 1);
    }
  });
  
  // Next move button
  const nextButton = document.createElement('button');
  nextButton.className = 'btn';
  nextButton.innerHTML = '<i class="fas fa-step-forward"></i>';
  nextButton.addEventListener('click', () => {
    if (moveIndex < history.length - 1) {
      replayPositionAtMove(moveIndex + 1);
    }
  });
  
  // Return to current position button
  const returnButton = document.createElement('button');
  returnButton.className = 'btn primary-btn';
  returnButton.textContent = 'Return to Game';
  returnButton.addEventListener('click', () => {
    // Remove the overlay
    document.querySelector('.replay-overlay')?.remove();
    
    // Update the board with the current position
    updateBoard();
    
    // Remove highlights from all moves
    document.querySelectorAll('.move-item').forEach(item => {
      item.classList.remove('replayed-move');
    });
  });
  
  // Add buttons to controls
  replayControls.appendChild(prevButton);
  replayControls.appendChild(returnButton);
  replayControls.appendChild(nextButton);
  
  // Add controls to overlay
  replayOverlay.appendChild(replayControls);
  
  // Remove any existing overlay
  document.querySelector('.replay-overlay')?.remove();
  
  // Add overlay to the board container
  document.querySelector('.board-container').appendChild(replayOverlay);
  
  // Display the position at the selected move
  // We'll create a temporary board display without affecting the actual game state
  const tempBoard = [];
  
  // Clear all pieces
  document.querySelectorAll('.piece').forEach(piece => piece.remove());
  
  // Add pieces based on the replay position
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = replayChess.board()[row][col];
      if (piece) {
        addPiece(row, col, piece.color, piece.type);
      }
    }
  }
}

// Update game status
function updateGameStatus() {
  let status = '';
  
  // Check for checkmate
  if (chess.in_checkmate()) {
    status = `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins`;
    playSound('game-end');
    endGame(chess.turn() === 'w' ? 'black' : 'white');
  } 
  // Check for draw
  else if (chess.in_draw()) {
    if (chess.in_stalemate()) {
      status = 'Game over: Stalemate';
    } else if (chess.in_threefold_repetition()) {
      status = 'Game over: Draw by repetition';
    } else if (chess.insufficient_material()) {
      status = 'Game over: Draw by insufficient material';
    } else {
      status = 'Game over: Draw';
    }
    playSound('game-end');
    endGame('draw');
  } 
  // Check for check
  else if (chess.in_check()) {
    status = `Check! ${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
    playSound('check');
  } 
  // Normal move
  else {
    status = `${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
  }
  
  gameStatusEl.textContent = status;
}

// Start game timers
function startTimers() {
  // Reset times
  gameTimes = { white: 600, black: 600 }; // 10 minutes in seconds
  
  // Clear any existing intervals
  if (timerIntervals.white) clearInterval(timerIntervals.white);
  if (timerIntervals.black) clearInterval(timerIntervals.black);
  
  // Update timer displays
  updateTimerDisplay('white');
  updateTimerDisplay('black');
  
  // Start the appropriate timer based on whose turn it is
  const activeColor = chess.turn() === 'w' ? 'white' : 'black';
  startTimer(activeColor);
}

// Start a specific timer
function startTimer(color) {
  // Clear any existing interval for this color
  if (timerIntervals[color]) clearInterval(timerIntervals[color]);
  
  // Start the interval
  timerIntervals[color] = setInterval(() => {
    // Decrement the time
    gameTimes[color]--;
    
    // Update the display
    updateTimerDisplay(color);
    
    // Check if time is up
    if (gameTimes[color] <= 0) {
      // Stop the timer
      clearInterval(timerIntervals[color]);
      
      // End the game
      const winner = color === 'white' ? 'black' : 'white';
      endGame(winner, 'timeout');
    }
  }, 1000);
}

// Stop a specific timer
function stopTimer(color) {
  if (timerIntervals[color]) {
    clearInterval(timerIntervals[color]);
    timerIntervals[color] = null;
  }
}

// Switch active timer
function switchTimer() {
  const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
  const previousTurn = currentTurn === 'white' ? 'black' : 'white';
  
  // Stop the previous timer
  stopTimer(previousTurn);
  
  // Start the current timer
  startTimer(currentTurn);
}

// Update timer display
function updateTimerDisplay(color) {
  const timeElement = color === 'white' ? 
    whitePlayerEl.querySelector('.player-time') : 
    blackPlayerEl.querySelector('.player-time');
  
  // Format the time
  const minutes = Math.floor(gameTimes[color] / 60);
  const seconds = gameTimes[color] % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Update the display
  timeElement.textContent = formattedTime;
  
  // Add warning class if time is low
  if (gameTimes[color] <= 30) {
    timeElement.classList.add('time-low');
  } else {
    timeElement.classList.remove('time-low');
  }
}

// End the game
function endGame(result, reason = null) {
  // Stop all timers
  stopTimer('white');
  stopTimer('black');
  
  // Disable game controls
  resignBtn.disabled = true;
  offerDrawBtn.disabled = false;
  
  // Show game result modal
  let resultText = '';
  
  if (reason === 'timeout') {
    resultText = `${result === 'white' ? 'White' : 'Black'} wins by timeout!`;
  } else {
    resultText = result === 'draw' 
      ? 'Game ended in a draw!' 
      : `${result === 'white' ? 'White' : 'Black'} wins!`;
  }
  
  resultMessageEl.textContent = resultText;
  
  // Update user statistics if logged in
  if (currentUser) {
    // Increment games played
    currentUser.gamesPlayed = (currentUser.gamesPlayed || 0) + 1;
    
    // Update win/loss/draw count
    if (result === 'draw') {
      currentUser.gamesTied = (currentUser.gamesTied || 0) + 1;
    } else if (result === playerColor) {
      currentUser.gamesWon = (currentUser.gamesWon || 0) + 1;
    } else {
      currentUser.gamesLost = (currentUser.gamesLost || 0) + 1;
    }
  }
  
  // Show betting result if bet was placed
  if (betPlaced) {
    const betAmount = parseInt(betAmountInput.value);
    let outcome = 'draw';
    
    if (result === 'draw') {
      bettingResultEl.textContent = `Your bet of ${betAmount} coins has been refunded.`;
    } else if (result === playerColor) {
      bettingResultEl.textContent = `You won ${betAmount * 2} coins!`;
      outcome = 'won';
    } else {
      bettingResultEl.textContent = `You lost ${betAmount} coins.`;
      outcome = 'lost';
    }
    
    // Add to betting history
    const opponent = isAiGame ? 'AI' : (playerColor === 'white' ? blackPlayerEl.querySelector('.player-name').textContent : whitePlayerEl.querySelector('.player-name').textContent);
    addBettingHistoryItem(opponent, betAmount, outcome);
    
    // Settle bet with server
    if (gameId) {
      fetch('/api/betting/settle-bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameId })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Update user balance
        if (currentUser) {
          checkAuthStatus();
        }
      })
      .catch(error => {
        console.error('Error settling bet:', error);
        showError('Failed to settle bet. Your balance will be updated when you refresh the page.');
      });
    }
  }
  
  gameResultModal.classList.remove('hidden');
}

// Show error message
function showError(message) {
  // Play error sound
  playSound('error');
  
  // Create error element
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  
  // Add to body
  document.body.appendChild(errorEl);
  
  // Remove after 5 seconds
  setTimeout(() => {
    errorEl.classList.add('fade-out');
    setTimeout(() => {
      errorEl.remove();
    }, 500);
  }, 5000);
}

// Connect to WebSocket server
function connectWebSocket() {
  socket = io();
  
  // Handle connection
  socket.on('connect', () => {
    console.log('Connected to server');
  });
  
  // Handle game state updates
  socket.on('gameState', (data) => {
    // Update chess position
    chess.load(data.fen);
    
    // Update the board
    updateBoard();
    
    // Highlight last move if available
    if (data.lastMove) {
      highlightLastMove(data.lastMove.from, data.lastMove.to);
      addMoveToHistory(data.lastMove);
    }
    
    // Update turn
    isPlayerTurn = data.turn === playerColor[0];
    
    // Enable/disable controls based on turn
    resignBtn.disabled = !isPlayerTurn;
    offerDrawBtn.disabled = !isPlayerTurn;
  });
  
  // Handle game over
  socket.on('gameOver', (data) => {
    endGame(data.result);
  });
  
  // Handle available players update
  socket.on('availablePlayers', (data) => {
    updateAvailablePlayers(data.players);
  });
  
  // Handle incoming challenge
  socket.on('challenge', (data) => {
    handleChallenge(data);
  });
  
  // Handle challenge accepted
  socket.on('challengeAccepted', (data) => {
    hideLobby();
    gameId = data.gameId;
    playerColor = data.playerColor;
    
    // Show game chat
    showGameChat();
    
    // Add system message
    addGameChatMessage({
      senderId: 'system',
      senderName: 'System',
      message: `Game started! You are playing as ${playerColor}.`,
      isSelf: false
    });
  });
  
  // Handle challenge declined
  socket.on('challengeDeclined', (data) => {
    showError(`${data.opponentName} declined your challenge.`);
  });
  
  // Handle lobby chat message
  socket.on('lobbyChatMessage', (data) => {
    addLobbyChatMessage(data);
  });
  
  // Handle game chat message
  socket.on('gameChatMessage', (data) => {
    if (data.gameId === gameId) {
      addGameChatMessage({
        senderId: data.senderId,
        senderName: data.senderName,
        message: data.message,
        isSelf: false
      });
    }
  });
  
  // Handle errors
  socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    showError(data.message);
  });
}

// Get AI move
function getAiMove(color = null) {
  // In a real implementation, this would call the Stockfish API
  // For this MVP, we'll simulate an AI move with a random legal move
  const moves = chess.moves({ verbose: true });
  
  if (moves.length > 0) {
    // Select a random move
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    
    // Make the move
    chess.move(randomMove);
    
    // Update the board
    updateBoard();
    
    // Add move to history
    addMoveToHistory(randomMove);
    
    // Highlight the move
    highlightLastMove(randomMove.from, randomMove.to);
    
    // If this is an AI vs AI game, schedule the next move
    if (isAiVsAiGame) {
      // Check if the game is over
      if (chess.game_over()) {
        clearTimeout(aiVsAiTimer);
        return;
      }
      
      // Schedule the next AI move
      aiVsAiTimer = setTimeout(() => {
        getAiMove();
      }, aiMoveSpeed);
    } else {
      // Switch turns back to player
      isPlayerTurn = true;
      
      // Enable controls
      resignBtn.disabled = false;
      offerDrawBtn.disabled = false;
    }
  }
}

// Start AI vs AI game
function startAiVsAiGame() {
  // Clear any existing timer
  if (aiVsAiTimer) {
    clearTimeout(aiVsAiTimer);
  }
  
  // Reset the game
  chess = new Chess();
  updateBoard();
  
  // Clear move history
  movesListEl.innerHTML = '';
  
  // Set up the game
  isAiVsAiGame = true;
  isPlayerTurn = false;
  
  // Update player info
  whitePlayerEl.querySelector('.player-name').textContent = 'AI (White)';
  blackPlayerEl.querySelector('.player-name').textContent = 'AI (Black)';
  
  // Disable controls
  resignBtn.disabled = true;
  offerDrawBtn.disabled = true;
  
  // Hide options
  aiVsAiOptions.classList.add('hidden');
  
  // Start the AI vs AI game
  aiVsAiTimer = setTimeout(() => {
    getAiMove();
  }, aiMoveSpeed);
}

// Stop AI vs AI game
function stopAiVsAiGame() {
  if (aiVsAiTimer) {
    clearTimeout(aiVsAiTimer);
    aiVsAiTimer = null;
  }
  isAiVsAiGame = false;
}

// Check authentication status
function checkAuthStatus() {
  console.log('Checking authentication status...');
  fetch('/api/auth/current-user', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin'
  })
  .then(response => {
    console.log('Auth status response:', response.status);
    if (!response.ok) {
      if (response.status === 401) {
        console.log('User is not authenticated');
        updateUIForGuest();
        return null;
      }
      throw new Error('Error checking authentication status: ' + response.status);
    }
    return response.json();
  })
  .then(data => {
    if (data) {
      console.log('User is authenticated:', data.user.username);
      updateUIForUser(data.user);
    }
  })
  .catch(error => {
    console.error('Authentication check error:', error);
    updateUIForGuest();
  });
}

function updateUIForUser(user) {
  // Show logout button and profile button, hide login/register buttons
  loginBtn.classList.add('hidden');
  registerBtn.classList.add('hidden');
  logoutBtn.classList.remove('hidden');
  profileBtn.classList.remove('hidden');
  
  // Update username and balance display
  document.getElementById('username-display').textContent = user.username;
  document.getElementById('balance-display').textContent = `Balance: ${user.balance}`;
  
  // Enable betting features if available
  if (document.getElementById('betting-options')) {
    document.getElementById('betting-options').classList.remove('hidden');
  }
  
  // Enable multiplayer features
  document.getElementById('find-opponent-btn').disabled = false;
}

function updateUIForGuest() {
  // Show login/register buttons, hide logout button and profile button
  loginBtn.classList.remove('hidden');
  registerBtn.classList.remove('hidden');
  logoutBtn.classList.add('hidden');
  profileBtn.classList.add('hidden');
  
  // Update username and balance display
  document.getElementById('username-display').textContent = 'Guest';
  document.getElementById('balance-display').textContent = 'Balance: 0';
  
  // Disable betting features if available
  if (document.getElementById('betting-options')) {
    document.getElementById('betting-options').classList.add('hidden');
  }
  
  // Disable multiplayer features
  document.getElementById('find-opponent-btn').disabled = true;
}

// Setup event listeners
function setupEventListeners() {
  // Auth modal events
  loginBtn.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
  });
  
  registerBtn.addEventListener('click', () => {
    registerModal.classList.remove('hidden');
  });
  
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      loginModal.classList.add('hidden');
      registerModal.classList.add('hidden');
      lobbyModal.classList.add('hidden');
    });
  });
  
  // Sound toggle
  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
  });
  
  // Promotion piece selection
  promotionPieces.forEach(piece => {
    piece.addEventListener('click', () => {
      const promotionPiece = piece.dataset.piece;
      completePromotion(promotionPiece);
    });
  });
  
  // Profile button
  profileBtn.addEventListener('click', () => {
    showProfile();
  });
  
  // Back to game button
  backToGameBtn.addEventListener('click', () => {
    hideProfile();
  });
  
  // View profile after game result
  viewProfileAfterResultBtn.addEventListener('click', () => {
    gameResultModal.classList.add('hidden');
    showProfile();
  });
  
  // New game after result
  newGameAfterResultBtn.addEventListener('click', () => {
    gameResultModal.classList.add('hidden');
    newGameBtn.click();
  });
  
  // Find opponent button
  findOpponentBtn.addEventListener('click', () => {
    showLobby();
  });
  
  // Create game button
  createGameBtn.addEventListener('click', () => {
    // Create a new game and wait for opponents
    if (socket) {
      const betAmount = parseInt(betAmountLobbyInput.value);
      
      if (!betAmount || betAmount <= 0 || betAmount > currentUser.balance) {
        showError('Invalid bet amount');
        return;
      }
      
      socket.emit('createGame', {
        playerId: currentUser.id,
        playerName: currentUser.username,
        betAmount
      });
      
      showError('Game created! Waiting for opponents...');
    }
  });
  
  // Send lobby chat message
  sendLobbyChatBtn.addEventListener('click', () => {
    sendLobbyChatMessage();
  });
  
  // Send lobby chat message on Enter key
  lobbyChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendLobbyChatMessage();
    }
  });
  
  // Toggle game chat
  gameChatHeaderEl.addEventListener('click', () => {
    toggleGameChat();
  });
  
  // Send game chat message
  sendGameChatBtn.addEventListener('click', () => {
    sendGameChatMessage();
  });
  
  // Send game chat message on Enter key
  gameChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendGameChatMessage();
    }
  });
  
  // Login form submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    console.log('Attempting login for user:', username);
    
    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password })
    })
    .then(response => {
      console.log('Login response status:', response.status);
      return response.json().then(data => {
        if (!response.ok) {
          throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        }
        return data;
      });
    })
    .then(data => {
      console.log('Login successful:', data.message);
      loginModal.classList.add('hidden');
      document.getElementById('login-form').reset();
      checkAuthStatus();
    })
    .catch(error => {
      console.error('Login error:', error);
      showError(error.message || 'Error logging in. Please try again.');
    });
  });
  
  // Register form submission
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    console.log('Attempting registration for user:', username);
    
    fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ username, email, password })
    })
    .then(response => {
      console.log('Registration response status:', response.status);
      return response.json().then(data => {
        if (!response.ok) {
          throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        }
        return data;
      });
    })
    .then(data => {
      console.log('Registration successful:', data.message);
      registerModal.classList.add('hidden');
      document.getElementById('register-form').reset();
      checkAuthStatus();
    })
    .catch(error => {
      console.error('Registration error:', error);
      showError(error.message || 'Error registering. Please try again.');
    });
  });
  
  // Logout button
  logoutBtn.addEventListener('click', () => {
    console.log('Attempting logout');
    
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    })
    .then(response => {
      console.log('Logout response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Logout successful:', data.message);
      checkAuthStatus();
    })
    .catch(error => {
      console.error('Logout error:', error);
      showError('Error logging out. Please try again.');
    });
  });
  
  // Game control events
  newGameBtn.addEventListener('click', () => {
    // Stop any AI vs AI game in progress
    stopAiVsAiGame();
    
    // Reset game
    chess = new Chess();
    updateBoard();
    
    // Show betting options
    bettingOptions.classList.remove('hidden');
    aiOptions.classList.add('hidden');
    aiVsAiOptions.classList.add('hidden');
    
    // Create a new game on the server first
    fetch('/api/game/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isAIOpponent: true,
        aiDifficulty: 10
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.message === 'Game created successfully') {
        gameId = data.game.id;
        console.log('Game created with ID:', gameId);
      }
    })
    .catch(error => {
      console.error('Error creating game:', error);
      // Continue with local game even if server request fails
      gameId = 'local-' + Date.now(); // Generate a local ID
    });
    
    // Reset game state
    isAiGame = true;
    isAiVsAiGame = false;
    betPlaced = false;
    
    // Enable controls
    resignBtn.disabled = false;
    offerDrawBtn.disabled = false;
    
    // Show game chat for AI games
    showGameChat();
    
    // Add system message
    addGameChatMessage({
      senderId: 'system',
      senderName: 'System',
      message: 'New game started! Place your bet to begin.',
      isSelf: false
    });
  });
  
  playAiBtn.addEventListener('click', () => {
    // Stop any AI vs AI game in progress
    stopAiVsAiGame();
    
    // Show AI options
    aiOptions.classList.remove('hidden');
    bettingOptions.classList.add('hidden');
    aiVsAiOptions.classList.add('hidden');
  });
  
  aiVsAiBtn.addEventListener('click', () => {
    // Show AI vs AI options
    aiVsAiOptions.classList.remove('hidden');
    aiOptions.classList.add('hidden');
    bettingOptions.classList.add('hidden');
  });
  
  // AI difficulty slider
  aiDifficultySlider.addEventListener('input', () => {
    difficultyValueEl.textContent = aiDifficultySlider.value;
  });
  
  // AI vs AI sliders
  aiWhiteDifficultySlider.addEventListener('input', () => {
    whiteDifficultyValueEl.textContent = aiWhiteDifficultySlider.value;
  });
  
  aiBlackDifficultySlider.addEventListener('input', () => {
    blackDifficultyValueEl.textContent = aiBlackDifficultySlider.value;
  });
  
  aiMoveSpeedSlider.addEventListener('input', () => {
    moveSpeedValueEl.textContent = aiMoveSpeedSlider.value;
    aiMoveSpeed = parseInt(aiMoveSpeedSlider.value);
  });
  
  // Start AI vs AI game
  startAiVsAiBtn.addEventListener('click', () => {
    startAiVsAiGame();
    
    // Show game chat for AI vs AI games
    showGameChat();
    
    // Add system message
    addGameChatMessage({
      senderId: 'system',
      senderName: 'System',
      message: 'AI vs AI game started!',
      isSelf: false
    });
  });
  
  // Start AI game
  startAiGameBtn.addEventListener('click', () => {
    // Reset game
    chess = new Chess();
    
    // Set up AI game
    isAiGame = true;
    
    // Always assign player as black
    playerColor = 'black';
    
    // In chess, white always goes first, but we want black to go first
    // So we need to modify the initial position
    chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
    isPlayerTurn = true;
    
    // Update player info
    whitePlayerEl.querySelector('.player-name').textContent = 'AI';
    blackPlayerEl.querySelector('.player-name').textContent = currentUser.username;
    
    // Update the board
    updateBoard();
    
    // Hide options
    aiOptions.classList.add('hidden');
    
    // Enable controls
    resignBtn.disabled = false;
    offerDrawBtn.disabled = false;
    
    // Show game chat for AI games
    showGameChat();
    
    // Add system message
    addGameChatMessage({
      senderId: 'system',
      senderName: 'System',
      message: 'Game started! You are playing as Black.',
      isSelf: false
    });
    
    // Create game on server
    fetch('/api/game/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isAIOpponent: true,
        aiDifficulty: parseInt(aiDifficultySlider.value)
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.message === 'Game created successfully') {
        gameId = data.game.id;
        
        // Start the game
        return fetch(`/api/game/${gameId}/start`, {
          method: 'POST'
        });
      }
    })
    .then(response => {
      if (response && !response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response ? response.json() : null;
    })
    .then(data => {
      if (data) {
        console.log('Game started:', data);
        
        // Set up the game with black (player) to move first
        playerColor = 'black';
        chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
        isPlayerTurn = true;
        
        // Update player info
        whitePlayerEl.querySelector('.player-name').textContent = 'AI';
        blackPlayerEl.querySelector('.player-name').textContent = currentUser.username;
        
        // Update the board
        updateBoard();
        
        // Add system message
        addGameChatMessage({
          senderId: 'system',
          senderName: 'System',
          message: 'Game started! You are playing as Black.',
          isSelf: false
        });
      }
    })
    .catch(error => {
      console.error('Error creating/starting game:', error);
      // Continue with local game even if server request fails
    });
  });
  
  // Place bet
  placeBetBtn.addEventListener('click', () => {
    const betAmount = parseInt(betAmountInput.value);
    
    if (!betAmount || betAmount <= 0 || betAmount > currentUser.balance) {
      showError('Invalid bet amount');
      return;
    }
    
    // If we don't have a gameId yet, create a local game
    if (!gameId) {
      gameId = 'local-' + Date.now();
    }
    
    // For local games, just update the UI and simulate the bet
    if (gameId.startsWith('local-')) {
      betPlaced = true;
      bettingOptions.classList.add('hidden');
      
      // Update user balance locally
      currentUser.balance -= betAmount;
      balanceDisplayEl.textContent = `Balance: ${currentUser.balance}`;
      
      // Set up the game with black (player) to move first
      playerColor = 'black';
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
      isPlayerTurn = true;
      
      // Update player info
      whitePlayerEl.querySelector('.player-name').textContent = 'AI';
      blackPlayerEl.querySelector('.player-name').textContent = currentUser.username;
      
      // Update the board
      updateBoard();
      
      // Add system message
      addGameChatMessage({
        senderId: 'system',
        senderName: 'System',
        message: `Bet placed: ${betAmount} coins. Game started!`,
        isSelf: false
      });
      
      return;
    }
    
    // Place bet on server
    fetch('/api/betting/place-bet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId,
        betAmount
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.message === 'Bet placed successfully') {
        betPlaced = true;
        bettingOptions.classList.add('hidden');
        
        // Update user balance
        balanceDisplayEl.textContent = `Balance: ${data.user.balance}`;
        
        // Start the game
        return fetch(`/api/game/${gameId}/start`, {
          method: 'POST'
        });
      } else {
        showError(data.message);
      }
    })
    .then(response => {
      if (response && !response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response ? response.json() : null;
    })
    .then(data => {
      if (data) {
        console.log('Game started:', data);
        
        // Set up the game with black (player) to move first
        playerColor = 'black';
        chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
        isPlayerTurn = true;
        
        // Update player info
        whitePlayerEl.querySelector('.player-name').textContent = 'AI';
        blackPlayerEl.querySelector('.player-name').textContent = currentUser.username;
        
        // Update the board
        updateBoard();
        
        // Add system message
        addGameChatMessage({
          senderId: 'system',
          senderName: 'System',
          message: `Bet placed: ${betAmount} coins. Game started!`,
          isSelf: false
        });
      }
    })
    .catch(error => {
      console.error('Error placing bet or starting game:', error);
      showError('Error placing bet. Please try again.');
      
      // Continue with local game even if server request fails
      betPlaced = true;
      bettingOptions.classList.add('hidden');
      
      // Set up the game with black (player) to move first
      playerColor = 'black';
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
      isPlayerTurn = true;
      
      // Update player info
      whitePlayerEl.querySelector('.player-name').textContent = 'AI';
      blackPlayerEl.querySelector('.player-name').textContent = currentUser.username;
      
      // Update the board
      updateBoard();
      
      // Add system message
      addGameChatMessage({
        senderId: 'system',
        senderName: 'System',
        message: `Bet placed: ${betAmount} coins. Game started!`,
        isSelf: false
      });
    });
  });
  
  // Resign game
  resignBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to resign?')) {
      // Resign on server
      if (gameId && !gameId.startsWith('local-')) {
        fetch(`/api/game/${gameId}/resign`, {
          method: 'POST'
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.message === 'Game resigned') {
            endGame(playerColor === 'white' ? 'black' : 'white');
            
            // Add system message
            addGameChatMessage({
              senderId: 'system',
              senderName: 'System',
              message: 'You resigned the game.',
              isSelf: false
            });
          }
        })
        .catch(error => {
          console.error('Error resigning game:', error);
          showError('Error resigning game. Please try again.');
          
          // Continue with local game even if server request fails
          endGame(playerColor === 'white' ? 'black' : 'white');
        });
      } else {
        // Handle local game resignation
        endGame(playerColor === 'white' ? 'black' : 'white');
        
        // Add system message
        addGameChatMessage({
          senderId: 'system',
          senderName: 'System',
          message: 'You resigned the game.',
          isSelf: false
        });
      }
    }
  });
  
  // Offer draw
  offerDrawBtn.addEventListener('click', () => {
    if (isAiGame) {
      // AI always declines draws in this MVP
      showError('AI declined your draw offer.');
      
      // Add system message
      addGameChatMessage({
        senderId: 'system',
        senderName: 'System',
        message: 'AI declined your draw offer.',
        isSelf: false
      });
    } else {
      // For multiplayer games, send draw offer through socket
      if (socket && gameId) {
        socket.emit('offerDraw', { gameId });
        
        // Add system message
        addGameChatMessage({
          senderId: 'system',
          senderName: 'System',
          message: 'You offered a draw.',
          isSelf: false
        });
      }
    }
  });
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Show profile
function showProfile() {
  gameSection.classList.add('hidden');
  profileSection.classList.remove('hidden');
  
  // Update profile statistics
  updateProfileStats();
  
  // Load betting history
  loadBettingHistory();
}

// Hide profile
function hideProfile() {
  profileSection.classList.add('hidden');
  gameSection.classList.remove('hidden');
}

// Update profile statistics
function updateProfileStats() {
  if (!currentUser) return;
  
  const gamesPlayed = currentUser.gamesPlayed || 0;
  const gamesWon = currentUser.gamesWon || 0;
  const gamesLost = currentUser.gamesLost || 0;
  const gamesTied = currentUser.gamesTied || 0;
  
  // Calculate win percentage
  const winPercentage = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  
  // Update DOM elements
  gamesPlayedEl.textContent = gamesPlayed;
  gamesWonEl.textContent = gamesWon;
  gamesLostEl.textContent = gamesLost;
  gamesTiedEl.textContent = gamesTied;
  winPercentageEl.textContent = `${winPercentage}%`;
  totalEarningsEl.textContent = totalEarnings;
}

// Load betting history
function loadBettingHistory() {
  // Clear existing history
  bettingHistoryTableEl.innerHTML = '';
  
  // If no history, show message
  if (bettingHistory.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="no-history">No betting history available</td>';
    bettingHistoryTableEl.appendChild(row);
    return;
  }
  
  // Add history items
  bettingHistory.forEach(item => {
    const row = document.createElement('tr');
    
    // Format date
    const date = new Date(item.date);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    // Calculate profit/loss
    let profitLoss = 0;
    let profitLossClass = '';
    
    if (item.outcome === 'won') {
      profitLoss = item.betAmount;
      profitLossClass = 'profit';
    } else if (item.outcome === 'lost') {
      profitLoss = -item.betAmount;
      profitLossClass = 'loss';
    }
    
    // Create row
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${item.opponent}</td>
      <td>${item.betAmount}</td>
      <td>${item.outcome.charAt(0).toUpperCase() + item.outcome.slice(1)}</td>
      <td class="${profitLossClass}">${profitLoss > 0 ? '+' : ''}${profitLoss}</td>
    `;
    
    bettingHistoryTableEl.appendChild(row);
  });
}

// Add betting history item
function addBettingHistoryItem(opponent, betAmount, outcome) {
  const historyItem = {
    date: new Date(),
    opponent,
    betAmount,
    outcome
  };
  
  // Add to history
  bettingHistory.unshift(historyItem);
  
  // Update total earnings
  if (outcome === 'won') {
    totalEarnings += betAmount;
  } else if (outcome === 'lost') {
    totalEarnings -= betAmount;
  }
  
  // Save to local storage
  saveBettingHistory();
}

// Save betting history to local storage
function saveBettingHistory() {
  if (currentUser) {
    localStorage.setItem(`bettingHistory_${currentUser.id}`, JSON.stringify(bettingHistory));
    localStorage.setItem(`totalEarnings_${currentUser.id}`, totalEarnings);
  }
}

// Load betting history from local storage
function loadBettingHistoryFromStorage() {
  if (currentUser) {
    const storedHistory = localStorage.getItem(`bettingHistory_${currentUser.id}`);
    const storedEarnings = localStorage.getItem(`totalEarnings_${currentUser.id}`);
    
    if (storedHistory) {
      bettingHistory = JSON.parse(storedHistory);
    }
    
    if (storedEarnings) {
      totalEarnings = parseInt(storedEarnings);
    }
  }
}

// Show lobby
function showLobby() {
  if (!currentUser) {
    showError('You must be logged in to find opponents');
    return;
  }
  
  lobbyModal.classList.remove('hidden');
  
  // Request available players from server
  if (socket) {
    socket.emit('getAvailablePlayers');
  }
}

// Hide lobby
function hideLobby() {
  lobbyModal.classList.add('hidden');
}

// Update available players list
function updateAvailablePlayers(players) {
  availablePlayers = players;
  
  // Clear existing list
  availablePlayersEl.innerHTML = '';
  
  // If no players, show message
  if (players.length === 0) {
    availablePlayersEl.innerHTML = '<div class="no-players-message">No players available at the moment.</div>';
    return;
  }
  
  // Add players to list
  players.forEach(player => {
    if (player.id === currentUser.id) return; // Skip current user
    
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    playerItem.innerHTML = `
      <span class="player-name">${player.username}</span>
      <button class="btn primary-btn challenge-btn" data-player-id="${player.id}">Challenge</button>
    `;
    
    availablePlayersEl.appendChild(playerItem);
  });
  
  // Add event listeners to challenge buttons
  document.querySelectorAll('.challenge-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const playerId = btn.dataset.playerId;
      challengePlayer(playerId);
    });
  });
}

// Challenge a player
function challengePlayer(playerId) {
  if (!currentUser) return;
  
  const betAmount = parseInt(betAmountLobbyInput.value);
  
  if (!betAmount || betAmount <= 0 || betAmount > currentUser.balance) {
    showError('Invalid bet amount');
    return;
  }
  
  // Send challenge to server
  if (socket) {
    socket.emit('challengePlayer', {
      challengerId: currentUser.id,
      challengerName: currentUser.username,
      opponentId: playerId,
      betAmount
    });
  }
  
  showError('Challenge sent!');
}

// Handle incoming challenge
function handleChallenge(challenge) {
  // Play sound
  playSound('chat');
  
  // Create challenge notification
  const notification = document.createElement('div');
  notification.className = 'challenge-notification';
  notification.innerHTML = `
    <p>${challenge.challengerName} has challenged you to a game with a bet of ${challenge.betAmount} coins!</p>
    <div class="challenge-buttons">
      <button class="btn primary-btn accept-btn">Accept</button>
      <button class="btn decline-btn">Decline</button>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Add event listeners
  notification.querySelector('.accept-btn').addEventListener('click', () => {
    acceptChallenge(challenge);
    notification.remove();
  });
  
  notification.querySelector('.decline-btn').addEventListener('click', () => {
    declineChallenge(challenge);
    notification.remove();
  });
  
  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 30000);
}

// Accept challenge
function acceptChallenge(challenge) {
  if (socket) {
    socket.emit('acceptChallenge', challenge);
  }
}

// Decline challenge
function declineChallenge(challenge) {
  if (socket) {
    socket.emit('declineChallenge', challenge);
  }
}

// Toggle game chat
function toggleGameChat() {
  const chatBody = gameChatEl.querySelector('.chat-body');
  chatOpen = !chatOpen;
  
  if (chatOpen) {
    chatBody.style.display = 'flex';
    toggleChatBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
  } else {
    chatBody.style.display = 'none';
    toggleChatBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
  }
}

// Show game chat
function showGameChat() {
  gameChatEl.classList.remove('hidden');
  gameChatMessagesEl.innerHTML = '';
  gameMessages = [];
}

// Hide game chat
function hideGameChat() {
  gameChatEl.classList.add('hidden');
}

// Send lobby chat message
function sendLobbyChatMessage() {
  if (!currentUser) return;
  
  const message = lobbyChatInput.value.trim();
  if (!message) return;
  
  // Send message to server
  if (socket) {
    socket.emit('lobbyChatMessage', {
      senderId: currentUser.id,
      senderName: currentUser.username,
      message
    });
  }
  
  // Clear input
  lobbyChatInput.value = '';
}

// Send game chat message
function sendGameChatMessage() {
  if (!currentUser || !gameId) return;
  
  const message = gameChatInput.value.trim();
  if (!message) return;
  
  // Send message to server
  if (socket) {
    socket.emit('gameChatMessage', {
      gameId,
      senderId: currentUser.id,
      senderName: currentUser.username,
      message
    });
  }
  
  // Add message to chat
  addGameChatMessage({
    senderId: currentUser.id,
    senderName: currentUser.username,
    message,
    isSelf: true
  });
  
  // Clear input
  gameChatInput.value = '';
}

// Add lobby chat message
function addLobbyChatMessage(message) {
  // Add to messages array
  lobbyMessages.push(message);
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${message.senderId === (currentUser?.id || '') ? 'sent' : 'received'}`;
  
  // Add sender name if not self
  if (message.senderId !== (currentUser?.id || '')) {
    messageEl.innerHTML = `<strong>${message.senderName}:</strong> ${message.message}`;
  } else {
    messageEl.textContent = message.message;
  }
  
  // Add to chat
  lobbyChatMessagesEl.appendChild(messageEl);
  
  // Scroll to bottom
  lobbyChatMessagesEl.scrollTop = lobbyChatMessagesEl.scrollHeight;
  
  // Play sound if not self
  if (message.senderId !== (currentUser?.id || '')) {
    playSound('chat');
  }
}

// Add game chat message
function addGameChatMessage(message) {
  // Add to messages array
  gameMessages.push(message);
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${message.isSelf ? 'sent' : 'received'}`;
  
  // Add sender name if not self
  if (!message.isSelf) {
    messageEl.innerHTML = `<strong>${message.senderName}:</strong> ${message.message}`;
  } else {
    messageEl.textContent = message.message;
  }
  
  // Add to chat
  gameChatMessagesEl.appendChild(messageEl);
  
  // Scroll to bottom
  gameChatMessagesEl.scrollTop = gameChatMessagesEl.scrollHeight;
  
  // Play sound if not self
  if (!message.isSelf) {
    playSound('chat');
  }
}

// Add drag-and-drop support to the chessboard
function setupDragAndDrop() {
  // Add event listeners to the chessboard
  chessboardEl.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  chessboardEl.addEventListener('drop', (e) => {
    e.preventDefault();
    
    // Get the target square
    const targetSquare = e.target.closest('.square');
    if (!targetSquare) return;
    
    // Get the source position from the dataTransfer
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    const [fromRow, fromCol] = data.split(',').map(Number);
    const toRow = parseInt(targetSquare.dataset.row);
    const toCol = parseInt(targetSquare.dataset.col);
    
    // Convert to algebraic notation
    const from = `${String.fromCharCode(97 + fromCol)}${fromRow + 1}`;
    const to = `${String.fromCharCode(97 + toCol)}${toRow + 1}`;
    
    // Check if this is a pawn promotion move
    const piece = chess.get(from);
    const isPromotion = piece && 
                       piece.type === 'p' && 
                       ((piece.color === 'w' && toRow === 7) || 
                        (piece.color === 'b' && toRow === 0));
    
    if (isPromotion) {
      // Store the pending promotion
      pendingPromotion = { from, to };
      
      // Update promotion piece colors based on player color
      const pieceColor = piece.color === 'w' ? 'w' : 'b';
      document.getElementById('promote-queen').src = `https://lichess1.org/assets/piece/cburnett/${pieceColor}Q.svg`;
      document.getElementById('promote-rook').src = `https://lichess1.org/assets/piece/cburnett/${pieceColor}R.svg`;
      document.getElementById('promote-bishop').src = `https://lichess1.org/assets/piece/cburnett/${pieceColor}B.svg`;
      document.getElementById('promote-knight').src = `https://lichess1.org/assets/piece/cburnett/${pieceColor}N.svg`;
      
      // Show promotion modal
      promotionModal.classList.remove('hidden');
      promotionModal.style.display = 'flex';
      
      // Clear selection
      clearHighlights();
      selectedSquare = null;
      
      return;
    }
    
    // Check if move is valid
    try {
      const move = chess.move({ from, to, promotion: 'q' }); // Default promotion to queen
      
      if (move) {
        // Play appropriate sound
        if (move.captured) {
          playSound('capture');
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          playSound('castle');
        } else {
          playSound('move');
        }
        
        // Check if the move puts the opponent in check
        if (chess.isCheck()) {
          playSound('check');
        }
        
        // Update the board
        updateBoard();
        
        // Send move to server
        if (socket && gameId) {
          socket.emit('makeMove', { gameId, from, to, promotion: 'q' });
        }
        
        // Add move to history
        addMoveToHistory(move);
        
        // Highlight the last move
        highlightLastMove(from, to);
        
        // Switch turns
        isPlayerTurn = false;
        
        // Switch active timer
        switchTimer();
        
        // If playing against AI, get AI move
        if (isAiGame) {
          setTimeout(getAiMove, 500);
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
      playSound('error');
      showError('Invalid move');
    }
    
    // Clear selection
    clearHighlights();
    selectedSquare = null;
  });
} 