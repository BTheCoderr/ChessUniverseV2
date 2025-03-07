// Game State
let chess = null;
let board = [];
let gameId = null;
let currentGameId = null; // Add this line to initialize currentGameId
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

// DOM Elements for spectator betting
let spectatorPanel, toggleSpectatorBtn, spectatorBetAmount, betOnWhiteBtn, betOnBlackBtn, placeSpectatorBetBtn, spectatorBetsList;
let selectedWinner = null;

// Initialize spectator betting elements
function initSpectatorBetting() {
  spectatorPanel = document.getElementById('spectator-panel');
  toggleSpectatorBtn = document.getElementById('toggle-spectator-btn');
  spectatorBetAmount = document.getElementById('spectator-bet-amount');
  betOnWhiteBtn = document.getElementById('bet-on-white');
  betOnBlackBtn = document.getElementById('bet-on-black');
  placeSpectatorBetBtn = document.getElementById('place-spectator-bet-btn');
  spectatorBetsList = document.getElementById('spectator-bets-list');
  
  // Add event listeners
  if (toggleSpectatorBtn) {
    toggleSpectatorBtn.addEventListener('click', toggleSpectatorPanel);
  }
  
  if (betOnWhiteBtn) {
    betOnWhiteBtn.addEventListener('click', () => {
      selectWinner('white');
    });
  }
  
  if (betOnBlackBtn) {
    betOnBlackBtn.addEventListener('click', () => {
      selectWinner('black');
    });
  }
  
  if (placeSpectatorBetBtn) {
    placeSpectatorBetBtn.addEventListener('click', placeSpectatorBet);
  }
}

// Toggle spectator panel
function toggleSpectatorPanel() {
  if (spectatorPanel.classList.contains('collapsed')) {
    spectatorPanel.classList.remove('collapsed');
    toggleSpectatorBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
  } else {
    spectatorPanel.classList.add('collapsed');
    toggleSpectatorBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
  }
}

// Select winner for spectator bet
function selectWinner(winner) {
  selectedWinner = winner;
  
  if (winner === 'white') {
    betOnWhiteBtn.classList.add('selected');
    betOnBlackBtn.classList.remove('selected');
  } else {
    betOnWhiteBtn.classList.remove('selected');
    betOnBlackBtn.classList.add('selected');
  }
}

// Place spectator bet
function placeSpectatorBet() {
  // Check if user is logged in
  if (!currentUser) {
    showError('You must be logged in to place a bet.');
    return;
  }
  
  // Check if a game is in progress
  if (!gameId || gameId.startsWith('local-')) {
    showError('You can only bet on online games.');
    return;
  }
  
  // Check if a winner is selected
  if (!selectedWinner) {
    showError('Please select a predicted winner.');
    return;
  }
  
  // Get bet amount
  const betAmount = parseInt(spectatorBetAmount.value);
  
  // Validate bet amount
  if (isNaN(betAmount) || betAmount < 10) {
    showError('Bet amount must be at least 10 coins.');
    return;
  }
  
  if (betAmount > 1000) {
    showError('Bet amount cannot exceed 1000 coins.');
    return;
  }
  
  // Show loading message
  showError('Placing bet...', 'info');
  
  // Send bet to server
  fetchWithCredentials('/api/betting/spectator-bet', {
    method: 'POST',
    body: JSON.stringify({
      gameId,
      betAmount,
      predictedWinner: selectedWinner
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.message === 'Spectator bet placed successfully') {
      showError('Bet placed successfully!', 'success');
      
      // Update user balance
      balanceDisplayEl.textContent = `Balance: ${data.user.balance}`;
      
      // Update spectator bets list
      updateSpectatorBetsList(data.game.spectatorBets);
      
      // Reset form
      spectatorBetAmount.value = '100';
      selectedWinner = null;
      betOnWhiteBtn.classList.remove('selected');
      betOnBlackBtn.classList.remove('selected');
    } else {
      showError(data.message);
    }
  })
  .catch(error => {
    console.error('Error placing spectator bet:', error);
    showError('Failed to place bet. Please try again.');
  });
}

// Update spectator bets list
function updateSpectatorBetsList(bets) {
  if (!spectatorBetsList) return;
  
  // Clear the list
  spectatorBetsList.innerHTML = '';
  
  // Check if there are any bets
  if (!bets || bets.length === 0) {
    const noBetsMessage = document.createElement('div');
    noBetsMessage.className = 'no-bets-message';
    noBetsMessage.textContent = 'No bets placed yet.';
    spectatorBetsList.appendChild(noBetsMessage);
    return;
  }
  
  // Add each bet to the list
  bets.forEach(bet => {
    const betItem = document.createElement('div');
    betItem.className = 'spectator-bet-item';
    
    const betUser = document.createElement('span');
    betUser.className = 'bet-user';
    betUser.textContent = bet.userId.username || 'Anonymous';
    
    const betAmount = document.createElement('span');
    betAmount.className = 'bet-amount';
    betAmount.textContent = `${bet.amount} coins`;
    
    const betWinner = document.createElement('span');
    betWinner.className = bet.predictedWinner === 'white' ? 'bet-on-white' : 'bet-on-black';
    betWinner.textContent = bet.predictedWinner.charAt(0).toUpperCase() + bet.predictedWinner.slice(1);
    
    betItem.appendChild(betUser);
    betItem.appendChild(betWinner);
    betItem.appendChild(betAmount);
    
    spectatorBetsList.appendChild(betItem);
  });
}

// Show spectator panel for active games
function showSpectatorPanel() {
  if (!spectatorPanel) return;
  
  // Only show for active online games
  if (gameId && !gameId.startsWith('local-') && chess.game_over() === false) {
    spectatorPanel.classList.remove('hidden');
  } else {
    spectatorPanel.classList.add('hidden');
  }
}

// Initialize spectator betting when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  // Initialize the app
  init();
  
  // Initialize spectator betting
  initSpectatorBetting();
});

// Initialize the app
function init() {
  try {
    console.log('Initializing application...');
    
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

    // Game Option Elements
  newGameBtn = document.getElementById('new-game-btn');
  playAiBtn = document.getElementById('play-ai-btn');
  aiVsAiBtn = document.getElementById('ai-vs-ai-btn');
  findOpponentBtn = document.getElementById('find-opponent-btn');
  aiOptions = document.getElementById('ai-options');
  aiVsAiOptions = document.getElementById('ai-vs-ai-options');
  bettingOptions = document.getElementById('betting-options');
  
    // Magic Horse Challenge Elements
    magicHorseLevel1Btn = document.getElementById('magic-horse-level1-btn');
    magicHorseLevel2Btn = document.getElementById('magic-horse-level2-btn');
    magicHorseLevel3Btn = document.getElementById('magic-horse-level3-btn');
    magicHorseLevel4Btn = document.getElementById('magic-horse-level4-btn');
    backToGameBtnMagicHorse = document.getElementById('back-to-game-btn-magic-horse');
    magicHorseSection = document.getElementById('magic-horse-section');
    
    // AI Option Elements
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
    
    // Betting Elements
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
    
    // Tournament Elements
    tournamentsBtn = document.getElementById('tournaments-btn');
    tournamentSection = document.getElementById('tournament-section');
    tournamentBackBtn = document.getElementById('tournament-back-btn');
    createTournamentBtn = document.getElementById('create-tournament-btn');
    tournamentStatusFilter = document.getElementById('tournament-status-filter');
    tournamentVariantFilter = document.getElementById('tournament-variant-filter');
    tournamentRefreshBtn = document.getElementById('tournament-refresh-btn');
    tournamentsListEl = document.querySelector('.tournaments-list');
    
    // Magic Horse Challenge Elements
    magicHorseBtn = document.getElementById('magic-horse-btn');
    magicHorseBackBtn = document.getElementById('magic-horse-back-btn');
    magicHorseProgressBar = document.getElementById('magic-horse-progress-bar');
    magicHorseProgressText = document.getElementById('magic-horse-progress-text');
    challengeCards = document.querySelectorAll('.challenge-card');
  
  // Set promotion piece images
    const promoteQueen = document.getElementById('promote-queen');
    const promoteRook = document.getElementById('promote-rook');
    const promoteBishop = document.getElementById('promote-bishop');
    const promoteKnight = document.getElementById('promote-knight');
    
    if (promoteQueen) promoteQueen.src = 'https://lichess1.org/assets/piece/cburnett/wQ.svg';
    if (promoteRook) promoteRook.src = 'https://lichess1.org/assets/piece/cburnett/wR.svg';
    if (promoteBishop) promoteBishop.src = 'https://lichess1.org/assets/piece/cburnett/wB.svg';
    if (promoteKnight) promoteKnight.src = 'https://lichess1.org/assets/piece/cburnett/wN.svg';
  
  // Initialize Chess.js
  chess = new Chess();
    
    try {
      // Initialize socket connection
      connectWebSocket();
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      console.log('Continuing without WebSocket functionality');
    }
    
    try {
      // Check authentication status
      checkAuthStatus();
    } catch (error) {
      console.error('Error checking authentication status:', error);
      console.log('Continuing as guest user');
      updateUIForGuest();
    }
  
  // Create the chessboard
    if (chessboardEl) {
  createBoard();
    } else {
      console.warn('Chessboard element not found');
    }
  
    // Add drag-and-drop support
    setupDragAndDrop();
  
    // Initialize spectator betting
    initSpectatorBetting();
  
    // Setup game event listeners
    setupGameEventListeners();
    
    // Setup event listeners
  setupEventListeners();
    
    console.log('Application initialized successfully');
    
    // Check if tutorial should be shown
    checkTutorial();
  } catch (error) {
    console.error('Error during initialization:', error);
  }
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
  // Clear the board
  chessboardEl.innerHTML = '';
  
  // Create the board
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'square';
      square.classList.add((row + col) % 2 === 0 ? 'light-square' : 'dark-square');
      square.dataset.row = row;
      square.dataset.col = col;
      
      // Add click event
      square.addEventListener('click', () => handleSquareClick(square));
      
      // Add to board
      chessboardEl.appendChild(square);
      
      // Store square in board array
      if (!board[row]) board[row] = [];
      board[row][col] = square;
    }
  }
  
  // Add pieces
  const position = chess.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = position[row][col];
      if (piece) {
        addPiece(row, col, piece.color, piece.type);
      }
    }
  }
  
  // Update game status
  updateGameStatus();
  
  // Show spectator panel if applicable
  showSpectatorPanel();
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
  
  // Add click event to the piece
  pieceEl.addEventListener('click', (e) => {
    // Prevent the click from reaching the square underneath
    e.stopPropagation();
    
    // Only allow clicks if it's the player's turn
    if (!isPlayerTurn) return;
    
    // If it's not the player's color, ignore the click
    if (playerColor && color !== playerColor[0]) return;
    
    // Trigger the square click handler
    handleSquareClick(square);
  });
  
  // Add drag events
  pieceEl.addEventListener('dragstart', (e) => {
    // Only allow dragging if it's the player's turn and the piece is the player's color
    if (!isPlayerTurn || (playerColor && color !== playerColor[0])) {
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
  if (isMuted || !soundEnabled) return;
  
  try {
  switch (type) {
    case 'move':
      moveSound.currentTime = 0;
        moveSound.play().catch(e => {
          console.log('Could not play sound due to browser restrictions:', e);
        });
      break;
    case 'capture':
      captureSound.currentTime = 0;
        captureSound.play().catch(e => {
          console.log('Could not play sound due to browser restrictions:', e);
        });
      break;
    case 'check':
      checkSound.currentTime = 0;
        checkSound.play().catch(e => {
          console.log('Could not play sound due to browser restrictions:', e);
        });
      break;
    case 'castle':
      castleSound.currentTime = 0;
        castleSound.play().catch(e => {
          console.log('Could not play sound due to browser restrictions:', e);
        });
      break;
    case 'promote':
      promoteSound.currentTime = 0;
        promoteSound.play().catch(e => {
          console.log('Could not play sound due to browser restrictions:', e);
        });
      break;
    case 'game-end':
      gameEndSound.currentTime = 0;
        gameEndSound.play().catch(e => {
          console.log('Could not play sound due to browser restrictions:', e);
        });
      break;
    case 'error':
      errorSound.currentTime = 0;
        errorSound.play().catch(e => {
          console.log('Could not play sound due to browser restrictions:', e);
        });
        break;
      case 'chat':
        chatSound.currentTime = 0;
        chatSound.play().catch(e => {
          console.log('Could not play sound due to browser restrictions:', e);
        });
      break;
    }
  } catch (e) {
    console.error('Error playing sound:', e);
  }
}

// Handle square click
function handleSquareClick(square) {
  // Check if we're in custom setup mode
  if (document.getElementById('setup-modal') && !document.getElementById('setup-modal').classList.contains('hidden')) {
    handleSetupSquareClick(square);
    return;
  }
  
  // Only allow moves if it's player's turn
  if (!isPlayerTurn) {
    console.log('Not player turn, ignoring click');
    return;
  }
  
  const row = parseInt(square.dataset.row);
  const col = parseInt(square.dataset.col);
  
  console.log(`Square clicked: row ${row}, col ${col}, isPlayerTurn: ${isPlayerTurn}, playerColor: ${playerColor}`);
  
  // If a piece is already selected, try to move it
  if (selectedSquare) {
    const fromRow = parseInt(selectedSquare.dataset.row);
    const fromCol = parseInt(selectedSquare.dataset.col);
    
    console.log(`Moving from: row ${fromRow}, col ${fromCol} to row ${row}, col ${col}`);
    
    // Convert to algebraic notation
    const from = `${String.fromCharCode(97 + fromCol)}${fromRow + 1}`;
    const to = `${String.fromCharCode(97 + col)}${row + 1}`;
    
    console.log(`Algebraic notation: ${from} to ${to}`);
    
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
      console.log('Attempting move in chess.js');
      const move = chess.move({ from, to, promotion: 'q' }); // Default promotion to queen
      
      if (move) {
        console.log('Move successful:', move);
        
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
      } else {
        console.log('Move was invalid according to chess.js');
        playSound('error');
        showError('Invalid move');
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
    // Check if the clicked square has a piece
    const piece = chess.board()[row][col];
    
    if (piece) {
      console.log('Piece found:', piece);
      
      // In AI vs AI mode, don't allow selecting pieces
      if (isAiVsAiGame) {
        console.log('AI vs AI game, ignoring piece selection');
        return;
      }
      
      // For regular games, only allow selecting pieces of the player's color
      // For black pieces, the color is 'b', for white pieces, the color is 'w'
      const expectedColor = playerColor === 'black' ? 'b' : 'w';
      
      console.log(`Expected color: ${expectedColor}, Piece color: ${piece.color}`);
      
      if (piece.color === expectedColor) {
        console.log('Selecting piece of player color:', playerColor);
        
      // Highlight selected square
      clearHighlights();
        square.classList.add('selected-piece');
      selectedSquare = square;
      
      // Highlight possible moves
      highlightPossibleMoves(row, col);
      } else {
        console.log('Piece does not belong to player. Piece color:', piece.color, 'Player color:', playerColor);
        showError("That's not your piece!");
      }
    } else {
      console.log('No piece on this square');
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
  // Stop timers
  stopTimer('white');
  stopTimer('black');
  
  // Disable game controls
  resignBtn.disabled = true;
  offerDrawBtn.disabled = true;
  
  // Play game end sound
  playSound('gameEnd');
  
  // Determine the result message
  let resultMessage = '';
  let bettingResultMessage = '';
  
  if (result === 'white') {
    resultMessage = 'White wins';
    if (playerColor === 'white') {
      resultMessage += ' - You win!';
      
      // Record Battle Chess win if applicable
      if (gameId && !gameId.startsWith('local-') && chess.load_pgn(chess.pgn()).header().Variant === 'Battle Chess') {
        recordBattleChessWin(gameId);
      }
  } else {
      resultMessage += ' - You lose!';
    }
  } else if (result === 'black') {
    resultMessage = 'Black wins';
    if (playerColor === 'black') {
      resultMessage += ' - You win!';
      
      // Record Battle Chess win if applicable
      if (gameId && !gameId.startsWith('local-') && chess.load_pgn(chess.pgn()).header().Variant === 'Battle Chess') {
        recordBattleChessWin(gameId);
      }
    } else {
      resultMessage += ' - You lose!';
    }
  } else if (result === 'draw') {
    resultMessage = 'Game drawn';
  }
  
  if (reason) {
    resultMessage += ` (${reason})`;
  }
  
  // Handle betting result
  if (betPlaced) {
    if ((result === 'white' && playerColor === 'white') || (result === 'black' && playerColor === 'black')) {
      bettingResultMessage = `You won ${betAmount * 2} coins!`;
      totalEarnings += betAmount;
    } else if (result === 'draw') {
      bettingResultMessage = `Your bet of ${betAmount} coins has been returned.`;
    } else {
      bettingResultMessage = `You lost ${betAmount} coins.`;
      totalEarnings -= betAmount;
    }
    
    // Add to betting history
    const opponent = playerColor === 'white' ? blackPlayerEl.querySelector('.player-name').textContent : whitePlayerEl.querySelector('.player-name').textContent;
    addBettingHistoryItem(opponent, betAmount, result === playerColor[0] ? 'win' : result === 'draw' ? 'draw' : 'loss');
    
    // Save betting history
    saveBettingHistory();
  }
  
  // Show game result modal
  resultMessageEl.textContent = resultMessage;
  bettingResultEl.textContent = bettingResultMessage;
  gameResultModal.classList.remove('hidden');
}

// Record a Battle Chess win
function recordBattleChessWin(gameId) {
  fetchWithCredentials(`/api/game/${gameId}/battle-chess-win`, {
      method: 'POST'
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
    console.log('Battle Chess win recorded:', data);
    
    // Show a message if Custom Setup was unlocked
    if (data.unlockedCustomSetup) {
      showError('Congratulations! You have unlocked Custom Setup mode!', 'success');
      
      // Update the UI to show Custom Setup as unlocked
      const customSetupBtn = document.getElementById('custom-setup-btn');
      if (customSetupBtn) {
        customSetupBtn.classList.remove('locked');
      }
      } else {
      showError(`Battle Chess win recorded! You have ${data.battleChessWins}/3 wins needed to unlock Custom Setup.`, 'info');
        }
      })
      .catch(error => {
    console.error('Error recording Battle Chess win:', error);
  });
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
    // Create a notification banner at the top of the page
    const banner = document.createElement('div');
    banner.className = 'login-required-banner';
    banner.textContent = 'You must be logged in to find opponents';
    
    // Add a close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-banner';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      banner.remove();
    });
    
    banner.appendChild(closeBtn);
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Also show an error message
    showError('You must be logged in to find opponents', 'error');
    return;
  }
  
  lobbyModal.classList.remove('hidden');
  lobbyModal.style.display = 'flex';
  
  // Request available players from server
  if (socket) {
    socket.emit('getAvailablePlayers');
  }
}

// Hide lobby
function hideLobby() {
  if (lobbyModal) {
    lobbyModal.classList.add('hidden');
    lobbyModal.style.display = 'none';
  }
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

// Initialize a new game
function initGame(level = 1) {
  // Set the game level
  if (window.ChessRules) {
    window.ChessRules.setGameLevel(level);
  }
  
  // Initialize chess.js
  chess = new Chess();
  
  // Override chess.js moves if ChessRules is available
  if (window.ChessRules) {
    chess = window.ChessRules.overrideChessJsMoves(chess);
  }
  
  // Set up the board with black to move first
  chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
  
  // Reset game state
  selectedSquare = null;
      isPlayerTurn = true;
  playerColor = 'black';
  
  // Create the board
  createBoard();
  
  // Update the board
  updateBoard();
  
  // Update game status
  updateGameStatus();
  
  // Enable/disable buttons
      resignBtn.disabled = false;
      offerDrawBtn.disabled = false;
  
  // Clear move history
  movesListEl.innerHTML = '';
  
  // Reset timers
  resetTimers();
  
  // Start timers
  startTimers();
  
  // Update UI based on level
  updateUIForLevel(level);
}

// Update UI elements based on the current level
function updateUIForLevel(level) {
  // Update the new game button text
  newGameBtn.textContent = `New Game (Level ${level})`;
  
  // Update level buttons
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const levelBtn = document.getElementById(`level${level}-btn`);
  if (levelBtn) {
    levelBtn.classList.add('active');
  }
  
  // Add a level indicator to the game status
  const levelIndicator = document.createElement('div');
  levelIndicator.className = 'level-indicator';
  levelIndicator.textContent = `Level ${level}`;
  
  // Add level-specific description
  let levelDescription = '';
  switch (level) {
    case 1:
      levelDescription = 'Traditional chess with Black moving first';
      break;
    case 2:
      levelDescription = 'Queens move like Bishop, King, or Knight (not Rook)';
      break;
    case 3:
      levelDescription = 'Queens move like Rook, King, or Knight (not Bishop)';
      break;
    case 4:
      levelDescription = 'Queens move like Rook, Bishop, King, and Knight';
      break;
    default:
      levelDescription = 'Traditional chess with Black moving first';
  }
  
  // Show a notification with the level description
  showError(levelDescription, 'info');
}

// Initialize Battle Chess mode
function initBattleChess(level = 1) {
  // Set the game level
  if (window.ChessRules) {
    window.ChessRules.setGameLevel(level);
  }
  
  // Initialize chess.js
  chess = new Chess();
  
  // Override chess.js moves if ChessRules is available
  if (window.ChessRules) {
    chess = window.ChessRules.overrideChessJsMoves(chess);
  }
  
  // Set up the board with pieces in the center (Battle Chess formation)
  // This FEN string places all pieces in the center of the board
  chess.load('8/8/8/3pppp1/3pnnp1/3pbbp1/3prkp1/3pqqp1 b - - 0 1');
  
  // Reset game state
  selectedSquare = null;
  isPlayerTurn = true;
  playerColor = 'black';
  
  // Create the board
  createBoard();
  
  // Update the board
  updateBoard();
  
  // Update game status
  updateGameStatus();
  
  // Enable/disable buttons
  resignBtn.disabled = false;
  offerDrawBtn.disabled = false;
  
  // Clear move history
  movesListEl.innerHTML = '';
  
  // Reset timers
  resetTimers();
  
  // Start timers
  startTimers();
  
  // Update UI based on level
  updateUIForLevel(level);
  
  // Show Battle Chess description
  showError('Battle Chess Mode: All pieces are pushed to the center of the board (face-to-face). Black still goes first. Win 3 Battle Chess games to unlock Custom Setup!', 'info');
  
  // Update the new game button text
  newGameBtn.textContent = `Battle Chess (Level ${level})`;
}

// Initialize Custom Setup mode
function initCustomSetup() {
  // Set the game level based on user selection (default to level 1)
  let setupLevel = 1;
  if (window.ChessRules) {
    setupLevel = window.ChessRules.getGameLevel();
  }
  
  // Initialize chess.js with an empty board
  chess = new Chess('8/8/8/8/8/8/8/8 w - - 0 1');
  
  // Override chess.js moves if ChessRules is available
  if (window.ChessRules) {
    chess = window.ChessRules.overrideChessJsMoves(chess);
  }
  
  // Reset game state
  selectedSquare = null;
  isPlayerTurn = false; // Disable moves until setup is complete
  
  // Create the board
  createBoard();
  
  // Update the board
  updateBoard();
  
  // Show the setup modal
  showSetupModal(setupLevel);
}

// Show the custom setup modal
function showSetupModal(level) {
  // Create the modal if it doesn't exist
  let setupModal = document.getElementById('setup-modal');
  if (!setupModal) {
    setupModal = document.createElement('div');
    setupModal.id = 'setup-modal';
    setupModal.className = 'modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content setup-content';
    
    const modalHeader = document.createElement('h2');
    modalHeader.textContent = 'Custom Setup';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      setupModal.classList.add('hidden');
    });
    
    const setupInstructions = document.createElement('p');
    setupInstructions.textContent = 'Place your pieces behind the pawns in any arrangement. Pawns will be placed in the traditional formation.';
    
    const levelSelector = document.createElement('div');
    levelSelector.className = 'level-selector';
    levelSelector.innerHTML = `
      <h3>Select Queen Type:</h3>
      <div class="queen-options">
        <div class="queen-option" data-level="1">
          <div class="queen-preview level1"></div>
          <p>Level 1: Traditional Queen</p>
        </div>
        <div class="queen-option" data-level="2">
          <div class="queen-preview level2"></div>
          <p>Level 2: Bishop + Knight + King</p>
        </div>
        <div class="queen-option" data-level="3">
          <div class="queen-preview level3"></div>
          <p>Level 3: Rook + Knight + King</p>
        </div>
        <div class="queen-option" data-level="4">
          <div class="queen-preview level4"></div>
          <p>Level 4: Super Queen</p>
        </div>
      </div>
    `;
    
    const pieceSelector = document.createElement('div');
    pieceSelector.className = 'piece-selector';
    pieceSelector.innerHTML = `
      <h3>Select Pieces to Place:</h3>
      <div class="piece-options">
        <div class="piece-option" data-piece="q" data-color="w">
          <div class="piece-preview white-queen"></div>
          <p>White Queen</p>
          <span class="piece-count">1</span>
        </div>
        <div class="piece-option" data-piece="r" data-color="w">
          <div class="piece-preview white-rook"></div>
          <p>White Rook</p>
          <span class="piece-count">2</span>
        </div>
        <div class="piece-option" data-piece="b" data-color="w">
          <div class="piece-preview white-bishop"></div>
          <p>White Bishop</p>
          <span class="piece-count">2</span>
        </div>
        <div class="piece-option" data-piece="n" data-color="w">
          <div class="piece-preview white-knight"></div>
          <p>White Knight</p>
          <span class="piece-count">2</span>
        </div>
        <div class="piece-option" data-piece="k" data-color="w">
          <div class="piece-preview white-king"></div>
          <p>White King</p>
          <span class="piece-count">1</span>
        </div>
        <div class="piece-option" data-piece="q" data-color="b">
          <div class="piece-preview black-queen"></div>
          <p>Black Queen</p>
          <span class="piece-count">1</span>
        </div>
        <div class="piece-option" data-piece="r" data-color="b">
          <div class="piece-preview black-rook"></div>
          <p>Black Rook</p>
          <span class="piece-count">2</span>
        </div>
        <div class="piece-option" data-piece="b" data-color="b">
          <div class="piece-preview black-bishop"></div>
          <p>Black Bishop</p>
          <span class="piece-count">2</span>
        </div>
        <div class="piece-option" data-piece="n" data-color="b">
          <div class="piece-preview black-knight"></div>
          <p>Black Knight</p>
          <span class="piece-count">2</span>
        </div>
        <div class="piece-option" data-piece="k" data-color="b">
          <div class="piece-preview black-king"></div>
          <p>Black King</p>
          <span class="piece-count">1</span>
        </div>
      </div>
    `;
    
    const setupControls = document.createElement('div');
    setupControls.className = 'setup-controls';
    
    const startGameBtn = document.createElement('button');
    startGameBtn.className = 'btn primary-btn';
    startGameBtn.textContent = 'Start Game';
    startGameBtn.addEventListener('click', () => {
      if (validateSetup()) {
        completeSetup(level);
        setupModal.classList.add('hidden');
      } else {
        showError('Invalid setup. Make sure all pieces are placed correctly.');
      }
    });
    
    const resetSetupBtn = document.createElement('button');
    resetSetupBtn.className = 'btn';
    resetSetupBtn.textContent = 'Reset Setup';
    resetSetupBtn.addEventListener('click', () => {
      resetCustomSetup();
    });
    
    setupControls.appendChild(resetSetupBtn);
    setupControls.appendChild(startGameBtn);
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(setupInstructions);
    modalContent.appendChild(levelSelector);
    modalContent.appendChild(pieceSelector);
    modalContent.appendChild(setupControls);
    
    setupModal.appendChild(modalContent);
    document.body.appendChild(setupModal);
    
    // Add event listeners for piece selection
    const pieceOptions = setupModal.querySelectorAll('.piece-option');
    pieceOptions.forEach(option => {
      option.addEventListener('click', () => {
        selectPieceForPlacement(option.dataset.piece, option.dataset.color);
      });
    });
    
    // Add event listeners for queen type selection
    const queenOptions = setupModal.querySelectorAll('.queen-option');
    queenOptions.forEach(option => {
      option.addEventListener('click', () => {
        selectQueenType(parseInt(option.dataset.level));
      });
    });
  }
  
  // Show the modal
  setupModal.classList.remove('hidden');
  
  // Highlight the current queen level
  const queenOptions = document.querySelectorAll('.queen-option');
  queenOptions.forEach(option => {
    if (parseInt(option.dataset.level) === level) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Initialize the setup
  initializeCustomSetup();
}

// Initialize the custom setup
function initializeCustomSetup() {
  // Clear the board
  chess.clear();
  
  // Add pawns in traditional formation
  for (let col = 0; col < 8; col++) {
    chess.put({ type: 'p', color: 'w' }, String.fromCharCode(97 + col) + '2');
    chess.put({ type: 'p', color: 'b' }, String.fromCharCode(97 + col) + '7');
  }
  
  // Update the board
  updateBoard();
  
  // Reset piece counts
  resetPieceCounts();
  
  // Set the selected piece to null
  window.customSetupSelectedPiece = null;
}

// Reset piece counts
function resetPieceCounts() {
  const pieceCounts = {
    'wq': 1, 'wr': 2, 'wb': 2, 'wn': 2, 'wk': 1,
    'bq': 1, 'br': 2, 'bb': 2, 'bn': 2, 'bk': 1
  };
  
  window.customSetupPieceCounts = pieceCounts;
  
  // Update the UI
  updatePieceCountsUI();
}

// Update piece counts in the UI
function updatePieceCountsUI() {
  const pieceOptions = document.querySelectorAll('.piece-option');
  pieceOptions.forEach(option => {
    const piece = option.dataset.piece;
    const color = option.dataset.color;
    const count = window.customSetupPieceCounts[color + piece] || 0;
    
    const countEl = option.querySelector('.piece-count');
    countEl.textContent = count;
    
    if (count === 0) {
      option.classList.add('disabled');
    } else {
      option.classList.remove('disabled');
    }
  });
}

// Select a piece for placement
function selectPieceForPlacement(piece, color) {
  // Check if there are any pieces of this type left
  if (window.customSetupPieceCounts[color + piece] <= 0) {
    showError('No more pieces of this type available.');
    return;
  }
  
  // Set the selected piece
  window.customSetupSelectedPiece = { type: piece, color: color };
  
  // Update the UI
  const pieceOptions = document.querySelectorAll('.piece-option');
  pieceOptions.forEach(option => {
    if (option.dataset.piece === piece && option.dataset.color === color) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// Select queen type
function selectQueenType(level) {
  // Set the game level
  if (window.ChessRules) {
    window.ChessRules.setGameLevel(level);
  }
  
  // Update the UI
  const queenOptions = document.querySelectorAll('.queen-option');
  queenOptions.forEach(option => {
    if (parseInt(option.dataset.level) === level) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// Handle square click for custom setup
function handleSetupSquareClick(square) {
  // Get the square coordinates
  const file = square.dataset.file;
  const rank = parseInt(square.dataset.rank);
  
  // Check if this is a valid square for placement
  if ((rank !== 0 && rank !== 7) || !window.customSetupSelectedPiece) {
    return;
  }
  
  // Check if the square is already occupied
  const squareId = file + (rank + 1);
  if (chess.get(squareId)) {
    // Remove the piece
    const removedPiece = chess.remove(squareId);
    if (removedPiece) {
      // Increment the piece count
      if (window.customSetupPieceCounts) {
        window.customSetupPieceCounts[removedPiece.color + removedPiece.type]++;
        updatePieceCountsUI();
      }
    }
    updateBoard();
    return;
  }
  
  // Place the piece
  const piece = window.customSetupSelectedPiece;
  chess.put(piece, squareId);
  
  // Decrement the piece count
  if (window.customSetupPieceCounts) {
    window.customSetupPieceCounts[piece.color + piece.type]--;
    updatePieceCountsUI();
  }
  
  // Update the board
  updateBoard();
}

// Validate the setup
function validateSetup() {
  // Check if both kings are placed
  const whiteKing = chess.pieces('k', 'w');
  const blackKing = chess.pieces('k', 'b');
  
  if (whiteKing.length !== 1 || blackKing.length !== 1) {
    return false;
  }
  
  // All checks passed
  return true;
}

// Complete the setup and start the game
function completeSetup(level) {
  // Set the game level
  if (window.ChessRules) {
    window.ChessRules.setGameLevel(level);
  }
  
  // Enable player's turn
  isPlayerTurn = true;
  playerColor = 'black'; // Black moves first
  
  // Update game status
  updateGameStatus();
  
  // Show a notification with the level description
  let levelDescription = '';
  switch (level) {
    case 1:
      levelDescription = 'Traditional chess with Black moving first';
      break;
    case 2:
      levelDescription = 'Queens move like Bishop, King, or Knight (not Rook)';
      break;
    case 3:
      levelDescription = 'Queens move like Rook, King, or Knight (not Bishop)';
      break;
    case 4:
      levelDescription = 'Queens move like Rook, Bishop, King, and Knight';
      break;
    default:
      levelDescription = 'Traditional chess with Black moving first';
  }
  
  showError(`Custom Setup Mode: ${levelDescription}. Black moves first.`, 'info');
}

// Reset the custom setup
function resetCustomSetup() {
  initializeCustomSetup();
}

// Reset timers
function resetTimers() {
  // Reset timer values
  gameTimes = { white: 600, black: 600 }; // 10 minutes in seconds
  
  // Clear any existing intervals
  if (timerIntervals.white) clearInterval(timerIntervals.white);
  if (timerIntervals.black) clearInterval(timerIntervals.black);
  
  // Reset timer displays
  updateTimerDisplay('white');
  updateTimerDisplay('black');
}

// Setup game event listeners
function setupGameEventListeners() {
  // New Game button
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      console.log('New Game button clicked');
      
      // Get the current level
      let currentLevel = 1;
      if (window.ChessRules) {
        currentLevel = window.ChessRules.getGameLevel();
      }
      
      // Initialize a new game with the current level
      initGame(currentLevel);
    });
  }
  
  // Play vs AI button
  if (playAiBtn && aiOptions) {
    playAiBtn.addEventListener('click', () => {
      console.log('Play vs AI button clicked');
      
      // Show AI options
      aiOptions.classList.remove('hidden');
      if (aiVsAiOptions) aiVsAiOptions.classList.add('hidden');
      if (bettingOptions) bettingOptions.classList.add('hidden');
    });
  }
  
  // AI vs AI button
  if (aiVsAiBtn && aiVsAiOptions) {
    aiVsAiBtn.addEventListener('click', () => {
      console.log('AI vs AI button clicked');
      
      // Show AI vs AI options
      aiVsAiOptions.classList.remove('hidden');
      if (aiOptions) aiOptions.classList.add('hidden');
      if (bettingOptions) bettingOptions.classList.add('hidden');
    });
  }
  
  // Find Opponent button
  if (findOpponentBtn) {
    findOpponentBtn.addEventListener('click', () => {
      console.log('Find Opponent button clicked');
      
      // Show lobby
      showLobby();
    });
  }
  
  // Profile button
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      console.log('Profile button clicked');
      showProfile();
    });
  }
  
  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      console.log('Logout button clicked');
      
      // Send logout request to server
      fetchWithCredentials('/api/auth/logout', {
        method: 'POST'
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Update UI for guest
          updateUIForGuest();
          
          // Show success message
          showError('Logged out successfully', 'success');
        }
      })
      .catch(error => {
        console.error('Error logging out:', error);
        showError('Error logging out');
      });
    });
  }
}

// Connect to WebSocket
function connectWebSocket() {
  try {
    console.log('Connecting to WebSocket...');
    
    // Get token from localStorage or cookie
    let token = '';
    if (document.cookie.includes('jwt=')) {
      token = document.cookie.split('jwt=')[1].split(';')[0];
    }
    
    // Connect to socket.io server with optimized settings
    socket = io({
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'], // Prefer WebSocket for better performance
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000
    });
    
    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      showError('Connected to server', 'success');
      
      // Check if we need to reconnect to a game
      if (currentGameId) {
        socket.emit('reconnect_game', { gameId: currentGameId });
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      // Continue as guest if authentication fails
      showError('Connected as guest', 'info');
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      showError('Disconnected from server', 'error');
    });
    
    // Game events with optimized handlers
    socket.on('game_start', handleGameStart);
    socket.on('opponent_move', handleOpponentMove);
    socket.on('game_over', handleGameOver);
    socket.on('opponent_resigned', handleOpponentResigned);
    socket.on('draw_offered', handleDrawOffered);
    socket.on('draw_accepted', handleDrawAccepted);
    socket.on('draw_declined', handleDrawDeclined);
    socket.on('error', handleSocketError);
    
  } catch (error) {
    console.error('Error connecting to WebSocket:', error);
    showError('Error connecting to server');
  }
}

// Optimized event handlers
function handleGameStart(data) {
  console.log('Game started:', data);
  
  // Hide lobby
  hideLobby();
  
  // Store game ID
  currentGameId = data.gameId;
  
  // Initialize game
  chess = new Chess();
  
  // Set up the board with black to move first
  chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
  
  // Set up the game
  isAiGame = false;
  isPlayerTurn = data.color === 'black';
  playerColor = data.color;
  
  // Update player info
  if (whitePlayerEl && blackPlayerEl) {
    const whiteNameEl = whitePlayerEl.querySelector('.player-name');
    const blackNameEl = blackPlayerEl.querySelector('.player-name');
    
    if (whiteNameEl) whiteNameEl.textContent = data.color === 'white' ? (currentUser ? currentUser.username : 'You') : data.opponent.username;
    if (blackNameEl) blackNameEl.textContent = data.color === 'black' ? (currentUser ? currentUser.username : 'You') : data.opponent.username;
  }
  
  // Create the board
  createBoard();
  
  // Update the board
  updateBoard();
  
  // Update game status
  updateGameStatus();
  
  // Enable controls
  if (resignBtn) resignBtn.disabled = false;
  if (offerDrawBtn) offerDrawBtn.disabled = false;
  
  // Show game chat
  showGameChat();
  
  // Show success message
  showError('Game started against ' + data.opponent.username, 'success');
}

function handleOpponentMove(data) {
  const { gameId, move } = data;
  
  // Verify this is for the current game
  if (currentGameId !== gameId) return;
  
  // Make the move on the board
  chess.move(move);
  
  // Update the board
  updateBoard();
  
  // Highlight the last move
  highlightLastMove(move.from, move.to);
  
  // Add move to history
  addMoveToHistory(move);
  
  // Update game status
  updateGameStatus();
  
  // Switch turn
  isPlayerTurn = true;
  
  // Play sound
  playSound('move');
}

function handleGameOver(data) {
  const { gameId, result } = data;
  
  // Verify this is for the current game
  if (currentGameId !== gameId) return;
  
  // End the game
  endGame(result);
}

function handleOpponentResigned(data) {
  const { gameId } = data;
  
  // Verify this is for the current game
  if (currentGameId !== gameId) return;
  
  // End the game with win
  endGame(playerColor === 'white' ? 'white' : 'black', 'resignation');
}

function handleDrawOffered(data) {
  const { gameId } = data;
  
  // Verify this is for the current game
  if (currentGameId !== gameId) return;
  
  // Show draw offer
  if (confirm('Your opponent has offered a draw. Accept?')) {
    socket.emit('accept_draw', { gameId });
  } else {
    socket.emit('decline_draw', { gameId });
  }
}

function handleDrawAccepted(data) {
  const { gameId } = data;
  
  // Verify this is for the current game
  if (currentGameId !== gameId) return;
  
  // End the game with draw
  endGame('draw', 'agreement');
}

function handleDrawDeclined(data) {
  const { gameId } = data;
  
  // Verify this is for the current game
  if (currentGameId !== gameId) return;
  
  // Show message
  showError('Draw offer declined', 'info');
}

function handleSocketError(data) {
  console.error('Socket error:', data.message);
  showError(data.message);
}

// Show message (error, success, info)
function showError(message, type = 'error') {
  // Play appropriate sound
  if (type === 'error') {
    playSound('error');
  } else if (type === 'success') {
    playSound('gameEnd');
  }
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `message-notification ${type}-message`;
  messageEl.textContent = message;
  
  // Add to body
  document.body.appendChild(messageEl);
  
  // Remove after 5 seconds
  setTimeout(() => {
    messageEl.classList.add('fade-out');
    setTimeout(() => {
      messageEl.remove();
    }, 500);
  }, 5000);
}

// Create a helper function for fetch with credentials
function fetchWithCredentials(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

// Check authentication status
function checkAuthStatus() {
  console.log('Checking authentication status...');
  
  fetchWithCredentials('/api/auth/current-user')
    .then(response => {
      console.log('Auth status response:', response.status);
      if (!response.ok) {
        if (response.status === 401) {
          console.log('User is not authenticated');
          currentUser = null; // Explicitly set currentUser to null
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
        // Use the new updateUIAfterLogin function
        updateUIAfterLogin(data.user);
      }
    })
    .catch(error => {
      console.error('Authentication check error:', error);
      currentUser = null; // Explicitly set currentUser to null on error
      updateUIForGuest();
    });
}

// Update UI for authenticated user
function updateUIForUser(user) {
  console.log('Updating UI for authenticated user:', user.username);
  
  // Show logout button and profile button, hide login/register buttons
  loginBtn.classList.add('hidden');
  registerBtn.classList.add('hidden');
  logoutBtn.classList.remove('hidden');
  profileBtn.classList.remove('hidden');
  
  // Update username and balance display with clear indication of logged-in state
  document.getElementById('username-display').textContent = user.username;
  document.getElementById('username-display').style.fontWeight = 'bold';
  document.getElementById('username-display').style.color = '#4a6fa5'; // Use primary color
  document.getElementById('balance-display').textContent = `Balance: ${user.balance}`;
  
  // Add visual indicator to header
  const header = document.querySelector('header');
  header.classList.add('authenticated');
  
  // Enable betting features if available
  if (document.getElementById('betting-options')) {
    document.getElementById('betting-options').classList.remove('hidden');
  }
  
  // Enable multiplayer features
  document.getElementById('find-opponent-btn').disabled = false;
  
  // Show a temporary notification
  showError(`Logged in as ${user.username}`, 'success');
}

// Update UI for guest user
function updateUIForGuest() {
  console.log('Updating UI for guest user');
  
  // Show login/register buttons, hide logout button and profile button
  loginBtn.classList.remove('hidden');
  registerBtn.classList.remove('hidden');
  logoutBtn.classList.add('hidden');
  profileBtn.classList.add('hidden');
  
  // Update username and balance display with clear guest indication
  document.getElementById('username-display').textContent = 'Guest';
  document.getElementById('username-display').style.fontWeight = 'normal';
  document.getElementById('username-display').style.color = '#888'; // Gray color for guest
  document.getElementById('balance-display').textContent = 'Balance: 0';
  
  // Remove authenticated class from header
  const header = document.querySelector('header');
  header.classList.remove('authenticated');
  
  // Disable betting features if available
  if (document.getElementById('betting-options')) {
    document.getElementById('betting-options').classList.add('hidden');
  }
  
  // Disable multiplayer features
  document.getElementById('find-opponent-btn').disabled = true;
}

// Get AI move
function getAiMove(color = null) {
  console.log('Getting AI move, current turn:', chess.turn());
  
  // In a real implementation, this would call the Stockfish API
  // For this MVP, we'll simulate an AI move with a random legal move
  const moves = chess.moves({ verbose: true });
  
  if (moves.length > 0) {
    // Select a random move
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    
    console.log('AI selected move:', randomMove);
    
    // Make the move
    chess.move(randomMove);
    
    // Play appropriate sound
    if (randomMove.captured) {
      playSound('capture');
    } else if (randomMove.flags.includes('k') || randomMove.flags.includes('q')) {
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
      console.log('AI move complete, setting isPlayerTurn to true');
      
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
  
  // Reset the game with Black to move first
  chess = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
  updateBoard();
  
  // Clear move history
  movesListEl.innerHTML = '';
  
  // Set up the game
  isAiVsAiGame = true;
  isPlayerTurn = false;
  
  // Update player info
  whitePlayerEl.querySelector('.player-name').textContent = 'AI (White)';
  blackPlayerEl.querySelector('.player-name').textContent = 'AI (Black)';
  gameStatusEl.textContent = 'Black to move';
  
  // Disable controls
  resignBtn.disabled = true;
  offerDrawBtn.disabled = true;
  
  // Start the AI vs AI game by making the first move
  aiVsAiTimer = setTimeout(() => {
    getAiMove();
  }, 500); // Start quickly with the first move
}

// Stop AI vs AI game
function stopAiVsAiGame() {
  if (aiVsAiTimer) {
    clearTimeout(aiVsAiTimer);
    aiVsAiTimer = null;
  }
  isAiVsAiGame = false;
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
  if (outcome === 'win') {
    totalEarnings += betAmount;
  } else if (outcome === 'loss') {
    totalEarnings -= betAmount;
  }
  
  // Save to local storage
  saveBettingHistory();
}

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
  
  // Update game statistics
  gamesPlayedEl.textContent = currentUser.gamesPlayed || 0;
  gamesWonEl.textContent = currentUser.gamesWon || 0;
  gamesLostEl.textContent = currentUser.gamesLost || 0;
  gamesTiedEl.textContent = currentUser.gamesTied || 0;
  
  // Calculate win percentage
  const winPercentage = currentUser.gamesPlayed > 0 
    ? Math.round((currentUser.gamesWon / currentUser.gamesPlayed) * 100) 
    : 0;
  winPercentageEl.textContent = `${winPercentage}%`;
  
  // Update total earnings
  totalEarningsEl.textContent = currentUser.totalEarnings || 0;
  
  // Load betting history
  loadBettingHistory();
  
  // Load betting leaderboard
  loadBettingLeaderboard('overall');
}

// Load betting history
function loadBettingHistory() {
  // Clear existing history
  bettingHistoryTableEl.innerHTML = '';
  
  // Load history from local storage
  loadBettingHistoryFromStorage();
  
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
    
    if (item.outcome === 'win') {
      profitLoss = item.betAmount;
      profitLossClass = 'profit';
    } else if (item.outcome === 'loss') {
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

// Load betting leaderboard
function loadBettingLeaderboard(type = 'overall') {
  const leaderboardTable = document.getElementById('betting-leaderboard-table');
  if (!leaderboardTable) return;
  
  // Clear the table
  leaderboardTable.innerHTML = '';
  
  // Show loading message
  const loadingRow = document.createElement('tr');
  loadingRow.innerHTML = '<td colspan="5" class="loading-message">Loading leaderboard...</td>';
  leaderboardTable.appendChild(loadingRow);
  
  // Fetch leaderboard data
  fetchWithCredentials('/api/betting/leaderboard')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Clear the table
      leaderboardTable.innerHTML = '';
      
      // Check if there's leaderboard data
      if (!data.leaderboard || data.leaderboard.length === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = '<td colspan="5" class="no-data-message">No leaderboard data available</td>';
        leaderboardTable.appendChild(noDataRow);
        return;
      }
      
      // Filter and sort the leaderboard based on type
      let filteredLeaderboard = data.leaderboard;
      
      if (type === 'spectator') {
        // Filter to only include users with spectator bets
        filteredLeaderboard = data.leaderboard.filter(user => 
          user.spectatorBets && user.spectatorBets.total > 0
        );
        
        // Sort by spectator profit
        filteredLeaderboard.sort((a, b) => 
          (b.spectatorBets?.profit || 0) - (a.spectatorBets?.profit || 0)
        );
      }
      
      // Add each user to the table
      filteredLeaderboard.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // Determine values based on leaderboard type
        const bets = type === 'spectator' ? user.spectatorBets?.total || 0 : user.totalBets;
        const wins = type === 'spectator' ? user.spectatorBets?.wins || 0 : user.wins;
        const winRate = bets > 0 ? ((wins / bets) * 100).toFixed(1) + '%' : '0%';
        const profit = type === 'spectator' ? user.spectatorBets?.profit || 0 : user.profit;
        
        // Create row content
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${user.username}</td>
          <td>${bets}</td>
          <td>${winRate}</td>
          <td class="${profit >= 0 ? 'profit' : 'loss'}">${profit}</td>
        `;
        
        leaderboardTable.appendChild(row);
      });
    })
    .catch(error => {
      console.error('Error loading betting leaderboard:', error);
      
      // Show error message
      leaderboardTable.innerHTML = '';
      const errorRow = document.createElement('tr');
      errorRow.innerHTML = '<td colspan="5" class="error-message">Failed to load leaderboard</td>';
      leaderboardTable.appendChild(errorRow);
    });
}

// Show tournaments
function showTournaments() {
  gameSection.classList.add('hidden');
  document.getElementById('tournament-section').classList.remove('hidden');
  
  // Load tournaments
  loadTournaments();
}

// Hide tournaments
function hideTournaments() {
  document.getElementById('tournament-section').classList.add('hidden');
  gameSection.classList.remove('hidden');
}

// Load tournaments
function loadTournaments() {
  const statusFilter = document.getElementById('tournament-status-filter').value;
  const variantFilter = document.getElementById('tournament-variant-filter').value;
  
  // Build query string
  let queryString = '';
  if (statusFilter !== 'all') {
    queryString += `status=${statusFilter}`;
  }
  
  if (variantFilter !== 'all') {
    if (queryString) queryString += '&';
    queryString += `gameVariant=${variantFilter}`;
  }
  
  // Show loading message
  const tournamentsListEl = document.querySelector('.tournaments-list');
  tournamentsListEl.innerHTML = '<div class="loading-message">Loading tournaments...</div>';
  
  // Fetch tournaments from server
  fetchWithCredentials(`/api/tournament${queryString ? '?' + queryString : ''}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Clear loading message
      tournamentsListEl.innerHTML = '';
      
      // Check if there are tournaments
      if (!data.tournaments || data.tournaments.length === 0) {
        tournamentsListEl.innerHTML = '<div class="no-tournaments-message">No tournaments available with the selected filters.</div>';
    return;
  }
  
      // Add tournaments to list
      data.tournaments.forEach(tournament => {
        addTournamentCard(tournament);
      });
    })
    .catch(error => {
      console.error('Error loading tournaments:', error);
      tournamentsListEl.innerHTML = '<div class="error-message">Failed to load tournaments. Please try again.</div>';
    });
}

// Add tournament card
function addTournamentCard(tournament) {
  const tournamentsListEl = document.querySelector('.tournaments-list');
  
  // Create tournament card
  const card = document.createElement('div');
  card.className = 'tournament-card';
  card.dataset.id = tournament._id;
  
  // Format dates
  const regStart = new Date(tournament.registrationStart);
  const regEnd = new Date(tournament.registrationEnd);
  const tourStart = new Date(tournament.tournamentStart);
  
  // Calculate prize pool
  const prizePool = tournament.prizePool || (tournament.participants.length * tournament.entryFee * 0.9);
  
  // Create card content
  card.innerHTML = `
    <div class="tournament-card-header">
      <h3 class="tournament-card-title">${tournament.name}</h3>
      <span class="tournament-card-status status-${tournament.status}">${formatStatus(tournament.status)}</span>
    </div>
    <div class="tournament-card-details">
      <div class="tournament-card-detail">
        <span class="detail-label">Game Variant</span>
        <span class="detail-value">${formatVariant(tournament.gameVariant)}</span>
      </div>
      <div class="tournament-card-detail">
        <span class="detail-label">Entry Fee</span>
        <span class="detail-value">${tournament.entryFee} coins</span>
      </div>
      <div class="tournament-card-detail">
        <span class="detail-label">Prize Pool</span>
        <span class="detail-value">${prizePool} coins</span>
      </div>
      <div class="tournament-card-detail">
        <span class="detail-label">Participants</span>
        <span class="detail-value">${tournament.participants.length}/${tournament.maxParticipants}</span>
      </div>
      <div class="tournament-card-detail">
        <span class="detail-label">Registration</span>
        <span class="detail-value">${formatDate(regStart)} - ${formatDate(regEnd)}</span>
      </div>
      <div class="tournament-card-detail">
        <span class="detail-label">Tournament Start</span>
        <span class="detail-value">${formatDate(tourStart)}</span>
      </div>
    </div>
    <div class="tournament-card-actions">
      <button class="btn view-tournament-btn">View Details</button>
      ${tournament.status === 'registration' ? '<button class="btn primary-btn join-tournament-btn">Join Tournament</button>' : ''}
    </div>
  `;
  
  // Add event listeners
  card.querySelector('.view-tournament-btn').addEventListener('click', () => {
    showTournamentDetails(tournament._id);
  });
  
  if (tournament.status === 'registration') {
    card.querySelector('.join-tournament-btn').addEventListener('click', () => {
      joinTournament(tournament._id);
    });
  }
  
  // Add card to list
  tournamentsListEl.appendChild(card);
}

// Show tournament details
function showTournamentDetails(tournamentId) {
  // Fetch tournament details from server
  fetchWithCredentials(`/api/tournament/${tournamentId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const tournament = data.tournament;
      
      // Format dates
      const regStart = new Date(tournament.registrationStart);
      const regEnd = new Date(tournament.registrationEnd);
      const tourStart = new Date(tournament.tournamentStart);
      
      // Calculate prize pool
      const prizePool = tournament.prizePool || (tournament.participants.length * tournament.entryFee * 0.9);
      
      // Update modal content
      document.getElementById('tournament-details-name').textContent = tournament.name;
      document.getElementById('tournament-details-description').textContent = tournament.description || 'No description provided.';
      document.getElementById('tournament-details-variant').textContent = formatVariant(tournament.gameVariant);
      document.getElementById('tournament-details-fee').textContent = `${tournament.entryFee} coins`;
      document.getElementById('tournament-details-prize').textContent = `${prizePool} coins`;
      document.getElementById('tournament-details-status').textContent = formatStatus(tournament.status);
      document.getElementById('tournament-details-participants').textContent = `${tournament.participants.length}/${tournament.maxParticipants}`;
      document.getElementById('tournament-details-registration').textContent = `${formatDate(regStart)} - ${formatDate(regEnd)}`;
      document.getElementById('tournament-details-start').textContent = formatDate(tourStart);
      
      // Update join button
      const joinBtn = document.getElementById('join-tournament-btn');
      joinBtn.dataset.id = tournament._id;
      
      if (tournament.status !== 'registration') {
        joinBtn.disabled = true;
        joinBtn.textContent = 'Registration Closed';
      } else {
        // Check if user is already registered
        const isRegistered = tournament.participants.some(p => p.user === currentUser?._id);
        
        if (isRegistered) {
          joinBtn.disabled = true;
          joinBtn.textContent = 'Already Registered';
        } else {
          joinBtn.disabled = false;
          joinBtn.textContent = 'Join Tournament';
        }
      }
      
      // Update view bracket button
      const viewBracketBtn = document.getElementById('view-bracket-btn');
      viewBracketBtn.dataset.id = tournament._id;
      viewBracketBtn.disabled = tournament.status === 'registration';
      
      // Update participants list
      const participantsListEl = document.getElementById('tournament-participants-list');
      participantsListEl.innerHTML = '';
      
      if (tournament.participants.length === 0) {
        participantsListEl.innerHTML = '<div class="no-participants-message">No participants yet.</div>';
      } else {
        tournament.participants.forEach(participant => {
          const participantItem = document.createElement('div');
          participantItem.className = 'participant-item';
          participantItem.innerHTML = `
            <span class="participant-name">${participant.user.username}</span>
            <span class="participant-status participant-${participant.status}">${participant.status}</span>
          `;
          participantsListEl.appendChild(participantItem);
        });
      }
      
      // Show modal
      document.getElementById('tournament-details-modal').classList.remove('hidden');
      document.getElementById('tournament-details-modal').style.display = 'flex';
    })
    .catch(error => {
      console.error('Error loading tournament details:', error);
      showError('Failed to load tournament details. Please try again.');
    });
}

// Join tournament
function joinTournament(tournamentId) {
  // Check if user is logged in
  if (!currentUser) {
    showError('You must be logged in to join a tournament.');
    return;
  }
  
  // Show confirmation dialog
  if (!confirm('Are you sure you want to join this tournament? The entry fee will be deducted from your balance.')) {
    return;
  }
  
  // Send join request to server
  fetchWithCredentials(`/api/tournament/${tournamentId}/join`, {
    method: 'POST'
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        });
      }
      return response.json();
    })
    .then(data => {
      showError(data.message, 'success');
      
      // Update user balance
      if (data.user) {
        currentUser.balance = data.user.balance;
        balanceDisplayEl.textContent = `Balance: ${currentUser.balance}`;
      }
      
      // Reload tournaments
      loadTournaments();
      
      // Close details modal if open
      if (!document.getElementById('tournament-details-modal').classList.contains('hidden')) {
        document.getElementById('tournament-details-modal').classList.add('hidden');
        document.getElementById('tournament-details-modal').style.display = 'none';
      }
    })
    .catch(error => {
      console.error('Error joining tournament:', error);
      showError(error.message || 'Failed to join tournament. Please try again.');
    });
}

// Create tournament
function createTournament(formData) {
  // Check if user is logged in
  if (!currentUser) {
    showError('You must be logged in to create a tournament.');
    return;
  }
  
  // Send create request to server
  fetchWithCredentials('/api/tournament/create', {
    method: 'POST',
    body: JSON.stringify(formData)
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        });
      }
      return response.json();
    })
    .then(data => {
      showError(data.message, 'success');
      
      // Close create modal
      document.getElementById('create-tournament-modal').classList.add('hidden');
      document.getElementById('create-tournament-modal').style.display = 'none';
      
      // Reset form
      document.getElementById('create-tournament-form').reset();
      
      // Reload tournaments
      loadTournaments();
    })
    .catch(error => {
      console.error('Error creating tournament:', error);
      showError(error.message || 'Failed to create tournament. Please try again.');
    });
}

// Helper functions
function formatStatus(status) {
  switch (status) {
    case 'registration':
      return 'Registration Open';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatVariant(variant) {
  switch (variant) {
    case 'traditional':
      return 'Traditional';
    case 'level2':
      return 'Level 2';
    case 'level3':
      return 'Level 3';
    case 'level4':
      return 'Level 4';
    case 'battleChess':
      return 'Battle Chess';
    case 'customSetup':
      return 'Custom Setup';
    default:
      return variant.charAt(0).toUpperCase() + variant.slice(1);
  }
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Show Magic Horse Challenge
function showMagicHorseChallenge() {
  gameSection.classList.add('hidden');
  document.getElementById('magic-horse-section').classList.remove('hidden');
}

// Hide Magic Horse Challenge
function hideMagicHorseChallenge() {
  document.getElementById('magic-horse-section').classList.add('hidden');
  gameSection.classList.remove('hidden');
}

// Magic Horse Challenge Functions
function loadMagicHorseProgress() {
  if (!currentUser) {
    console.log('No user logged in, cannot load Magic Horse progress');
    return;
  }
  
  console.log('Loading Magic Horse progress for user:', currentUser.username);
  
  // Fetch user's magic horse progress
  fetchWithCredentials('/api/user/magic-horse-progress')
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Magic Horse progress endpoint not found, using default progress');
          // Use default progress if endpoint not found
          return { progress: { level1: 'not_started' } };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Check if response is HTML instead of JSON (common error)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.warn('Received HTML instead of JSON, using default progress');
        return { progress: { level1: 'not_started' } };
      }
      
      return response.json();
    })
    .then(data => {
      console.log('Magic Horse progress loaded:', data);
      
      // Update progress bar
      const progress = data.progress || {};
      const completedChallenges = Object.values(progress).filter(status => status === 'completed').length;
      const totalChallenges = 4; // Total number of challenges
      
      // Update progress bar width
      const progressBar = document.getElementById('magic-horse-progress-bar');
      if (progressBar) {
        progressBar.style.width = `${(completedChallenges / totalChallenges) * 100}%`;
      } else {
        console.warn('Magic Horse progress bar element not found');
      }
      
      // Update progress text
      const progressText = document.getElementById('magic-horse-progress-text');
      if (progressText) {
        progressText.textContent = `${completedChallenges}/${totalChallenges} Challenges Completed`;
      } else {
        console.warn('Magic Horse progress text element not found');
      }
      
      // Update challenge cards
      updateChallengeCards(progress);
    })
    .catch(error => {
      console.error('Error loading magic horse progress:', error);
      // Use default progress on error
      const defaultProgress = { level1: 'not_started' };
      updateChallengeCards(defaultProgress);
    });
}

function updateChallengeCards(progress) {
  if (!progress) {
    console.warn('Invalid progress data:', progress);
    progress = { level1: 'not_started' }; // Default to level1 not started
  }
  
  console.log('Updating challenge cards with progress:', progress);
  
  try {
    // Get all challenge cards
    const challengeCards = document.querySelectorAll('.challenge-card');
    if (!challengeCards || challengeCards.length === 0) {
      console.warn('No challenge cards found in the DOM');
      return;
    }
    
    // Update each card based on progress
    challengeCards.forEach(card => {
      try {
        const level = card.dataset.level;
        if (!level) {
          console.warn('Challenge card missing level data attribute');
          return;
        }
        
        const status = progress[level] || 'locked';
        const statusEl = card.querySelector('.challenge-status');
        const startBtn = card.querySelector('.start-challenge-btn');
        
        if (!statusEl) {
          console.warn(`Status element not found for ${level}`);
          return;
        }
        
        // Update status text
        statusEl.textContent = formatChallengeStatus(status);
        statusEl.className = `challenge-status status-${status}`;
        
        // Update card and button state
        if (status === 'locked') {
          card.classList.add('locked');
          if (startBtn) {
            startBtn.disabled = true;
          }
        } else {
          card.classList.remove('locked');
          if (startBtn) {
            startBtn.disabled = status === 'completed';
            
            if (status === 'completed') {
              startBtn.textContent = 'Completed';
            }
          }
        }
      } catch (cardError) {
        console.error('Error updating challenge card:', cardError);
      }
    });
  } catch (error) {
    console.error('Error in updateChallengeCards:', error);
  }
}

function formatChallengeStatus(status) {
  switch (status) {
    case 'not_started':
      return 'Not Started';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'locked':
      return 'Locked';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  }
}

function startChallenge(challengeLevel) {
  // Check if user is logged in
  if (!currentUser) {
    showError('You must be logged in to start a challenge.');
    return;
  }
  
  console.log(`Starting challenge: ${challengeLevel}`);
  
  // Hide challenge cards and show game board
  const challengeCards = document.querySelector('.magic-horse-challenges');
  const gameContainer = document.getElementById('magic-horse-game-container');
  
  if (!challengeCards || !gameContainer) {
    showError('Game elements not found. Please refresh the page and try again.');
    return;
  }
  
  // Hide challenge cards and show game board
  challengeCards.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  
  // Extract level number from the challenge level string
  const levelNumber = parseInt(challengeLevel.replace('level', ''));
  if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 4) {
    showError('Invalid challenge level.');
    return;
  }
  
  // Initialize the Magic Horse game with the appropriate level
  if (window.MagicHorse && typeof window.MagicHorse.init === 'function') {
    window.MagicHorse.init(levelNumber);
  } else if (typeof window.initMagicHorseGame === 'function') {
    window.initMagicHorseGame(levelNumber);
  } else {
    showError('Magic Horse game not initialized. Please refresh the page and try again.');
    return;
  }
  
  // Update challenge status to in_progress
  fetchWithCredentials('/api/user/magic-horse-progress', {
    method: 'POST',
    body: JSON.stringify({
      level: challengeLevel,
      status: 'in_progress'
    })
  })
    .then(response => {
      if (!response.ok) {
        console.warn('Failed to update challenge status');
      }
      return response.json();
    })
    .then(data => {
      console.log('Challenge status updated:', data);
    })
    .catch(error => {
      console.error('Error updating challenge status:', error);
    });
}

function setupMagicHorseEventListeners() {
  // Back button
  document.getElementById('magic-horse-back-btn').addEventListener('click', hideMagicHorseChallenge);
  
  // Start challenge buttons
  document.querySelectorAll('.start-challenge-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const challengeLevel = e.target.dataset.challenge;
      if (challengeLevel) {
        startChallenge(challengeLevel);
      }
    });
  });
  
  // Back to challenges button
  const backToChallengesBtn = document.getElementById('back-to-challenges-btn');
  if (backToChallengesBtn) {
    backToChallengesBtn.addEventListener('click', () => {
      // Hide game board and show challenge cards
      const challengeCards = document.querySelector('.magic-horse-challenges');
      const gameContainer = document.getElementById('magic-horse-game-container');
      
      if (challengeCards && gameContainer) {
        gameContainer.classList.add('hidden');
        challengeCards.classList.remove('hidden');
      }
    });
  }
  
  // Restart challenge button
  const restartChallengeBtn = document.getElementById('restart-challenge-btn');
  if (restartChallengeBtn) {
    restartChallengeBtn.addEventListener('click', () => {
      // Get the current level from the game
      let level = 1;
      if (window.MagicHorse && window.MagicHorse.getCurrentLevel) {
        level = window.MagicHorse.getCurrentLevel();
      }
      
      // Restart the game with the same level
      if (window.MagicHorse && typeof window.MagicHorse.init === 'function') {
        window.MagicHorse.init(level);
      } else if (typeof window.initMagicHorseGame === 'function') {
        window.initMagicHorseGame(level);
      }
    });
  }
  
  // Hint button
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      if (window.MagicHorse && typeof window.MagicHorse.hint === 'function') {
        window.MagicHorse.hint();
      } else {
        showError('Hint feature not available. Please refresh the page and try again.');
      }
    });
  }
}

function updateUIAfterLogin(user) {
  // Update current user
  currentUser = user;
  
  // Update UI elements
  document.getElementById('username-display').textContent = user.username;
  document.getElementById('balance-display').textContent = `Balance: ${user.balance}`;
  
  // Show/hide buttons
  document.getElementById('login-btn').classList.add('hidden');
  document.getElementById('register-btn').classList.add('hidden');
  document.getElementById('profile-btn').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  
  // Update level buttons based on unlocked levels
  updateLevelButtons(user.unlockedLevels || ['level1']);
  
  // Load Magic Horse progress
  loadMagicHorseProgress();
  
  // Close login modal if open
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('login-modal').style.display = 'none';
}

// Update level buttons based on unlocked levels
function updateLevelButtons(unlockedLevels) {
  if (!unlockedLevels || !Array.isArray(unlockedLevels)) {
    console.warn('Invalid unlockedLevels data:', unlockedLevels);
    unlockedLevels = ['level1']; // Default to level1 if invalid data
  }
  
  console.log('Updating level buttons with unlocked levels:', unlockedLevels);
  
  // Keep track of previously unlocked levels to detect new unlocks
  const previouslyUnlocked = [];
  
  // Get all level buttons and check which ones were previously unlocked
  const levelButtons = document.querySelectorAll('.level-btn');
  levelButtons.forEach(button => {
    const unlockClass = Array.from(button.classList).find(cls => cls.startsWith('unlock-'));
    if (unlockClass && !button.classList.contains('locked')) {
      previouslyUnlocked.push(unlockClass.replace('unlock-', ''));
    }
  });
  
  // Update each button based on unlocked levels
  levelButtons.forEach(button => {
    // Check if this button has an unlock class
    const unlockClass = Array.from(button.classList).find(cls => cls.startsWith('unlock-'));
    
    if (unlockClass) {
      const level = unlockClass.replace('unlock-', '');
      
      if (unlockedLevels.includes(level)) {
        // Level is unlocked
        button.classList.remove('locked');
        button.disabled = false;
        
        // Check if this is a newly unlocked level
        if (!previouslyUnlocked.includes(level)) {
          // Show notification for newly unlocked level
          setTimeout(() => {
            showLevelUnlockNotification(level);
          }, 1000);
        }
      } else {
        // Level is locked
        button.classList.add('locked');
        button.disabled = true;
      }
    }
  });
  
  // Also update Magic Horse Challenge buttons
  const challengeButtons = document.querySelectorAll('#magic-horse-options .btn');
  
  challengeButtons.forEach(button => {
    // Check if this button has an unlock class
    const unlockClass = Array.from(button.classList).find(cls => cls.startsWith('unlock-'));
    
    if (unlockClass) {
      const level = unlockClass.replace('unlock-', '');
      
      if (unlockedLevels.includes(level)) {
        // Level is unlocked
        button.classList.remove('locked');
        button.disabled = false;
      } else {
        // Level is locked
        button.classList.add('locked');
        button.disabled = true;
      }
    }
  });
}

// Show level unlock notification
function showLevelUnlockNotification(level) {
  const levelUnlockModal = document.getElementById('level-unlock-modal');
  const levelUnlockMessage = document.getElementById('level-unlock-message');
  const levelUnlockDescription = document.getElementById('level-unlock-description');
  const tryLevelBtn = document.getElementById('try-level-btn');
  const continueBtn = document.getElementById('continue-btn');
  
  if (!levelUnlockModal || !levelUnlockMessage || !levelUnlockDescription) {
    console.warn('Level unlock modal elements not found');
    return;
  }
  
  // Set the message and description based on the level
  let message = 'Congratulations! You\'ve unlocked a new level.';
  let description = '';
  let levelNumber = 1;
  
  if (level === 'level2') {
    levelNumber = 2;
    message = 'Level 2 Unlocked: Queen\'s First Transformation!';
    description = 'In Level 2, Queens lose their Rook-like vertical/horizontal moves, but can move like a Bishop, King, and Horse.';
  } else if (level === 'level3') {
    levelNumber = 3;
    message = 'Level 3 Unlocked: Queen\'s Second Transformation!';
    description = 'In Level 3, Queens lose their Bishop-like diagonal movement, but can move like a Rook, King, and Horse.';
  } else if (level === 'level4') {
    levelNumber = 4;
    message = 'Level 4 Unlocked: The Ultimate Evolution!';
    description = 'In Level 4, Queens regain all normal chess abilities and also move like a Horse (Knight).';
  } else if (level === 'battleChess') {
    message = 'Battle Chess Mode Unlocked!';
    description = 'In Battle Chess, all pieces are pushed to the center of the board (face-to-face). Black still goes first.';
  } else if (level === 'customSetup') {
    message = 'Custom Setup Mode Unlocked!';
    description = 'In Custom Setup, you can arrange your pieces behind the Pawns however you want. Queens can be in Level 1, 2, 3, or 4 form.';
  }
  
  levelUnlockMessage.textContent = message;
  levelUnlockDescription.textContent = description;
  
  // Set up button event listeners
  tryLevelBtn.onclick = () => {
    levelUnlockModal.classList.add('hidden');
    
    if (level === 'battleChess') {
      initBattleChess(1);
    } else if (level === 'customSetup') {
      initCustomSetup();
  } else {
      initGame(levelNumber);
    }
  };
  
  continueBtn.onclick = () => {
    levelUnlockModal.classList.add('hidden');
  };
  
  // Show the modal
  levelUnlockModal.classList.remove('hidden');
  
  // Play a sound
  playSound('game-end');
}

// Show tutorial for new users
function showTutorial() {
  const tutorialModal = document.getElementById('tutorial-modal');
  const prevBtn = document.getElementById('prev-tutorial-btn');
  const nextBtn = document.getElementById('next-tutorial-btn');
  const stepIndicator = document.getElementById('tutorial-step-indicator');
  const slides = document.querySelectorAll('.tutorial-slide');
  const startPlayingBtn = document.getElementById('start-playing-btn');
  const closeBtn = tutorialModal.querySelector('.close-btn');
  
  let currentStep = 1;
  const totalSteps = slides.length;
  
  // Update the navigation buttons and step indicator
  function updateNavigation() {
    stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;
    
    // Enable/disable previous button
    prevBtn.disabled = currentStep === 1;
    
    // Update next button text for last step
    if (currentStep === totalSteps) {
      nextBtn.innerHTML = 'Finish <i class="fas fa-check"></i>';
    } else {
      nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
    }
  }
  
  // Show the current slide
  function showSlide(step) {
    // Hide all slides
    slides.forEach(slide => {
      slide.classList.remove('active');
    });
    
    // Show the current slide
    const currentSlide = document.querySelector(`.tutorial-slide[data-step="${step}"]`);
    if (currentSlide) {
      currentSlide.classList.add('active');
    }
    
    updateNavigation();
  }
  
  // Event listeners for navigation
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      showSlide(currentStep);
    }
  });
  
  nextBtn.addEventListener('click', () => {
    if (currentStep < totalSteps) {
      currentStep++;
      showSlide(currentStep);
  } else {
      // Last step, close the tutorial
      tutorialModal.classList.add('hidden');
      
      // Set a flag in localStorage to not show the tutorial again
      localStorage.setItem('tutorialShown', 'true');
    }
  });
  
  // Start playing button
  if (startPlayingBtn) {
    startPlayingBtn.addEventListener('click', () => {
      tutorialModal.classList.add('hidden');
      
      // Set a flag in localStorage to not show the tutorial again
      localStorage.setItem('tutorialShown', 'true');
      
      // Start a new game
      initGame(1);
    });
  }
  
  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      tutorialModal.classList.add('hidden');
      
      // Set a flag in localStorage to not show the tutorial again
      localStorage.setItem('tutorialShown', 'true');
    });
  }
  
  // Show the first slide
  showSlide(currentStep);
  
  // Show the tutorial modal
  tutorialModal.classList.remove('hidden');
}

// Check if tutorial should be shown
function checkTutorial() {
  // Only show tutorial for new users who haven't seen it before
  if (!localStorage.getItem('tutorialShown')) {
    // Wait a bit before showing the tutorial
    setTimeout(showTutorial, 1000);
  }
}

// Setup all event listeners
function setupEventListeners() {
  try {
    console.log('Setting up event listeners');
    
    // Close buttons for modals
    const closeBtns = document.querySelectorAll('.close-btn');
    if (closeBtns && closeBtns.length > 0) {
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          console.log('Close button clicked');
          
          // Hide all modals
          const modals = document.querySelectorAll('.modal');
          modals.forEach(modal => {
            modal.classList.add('hidden');
          });
          
          // Hide lobby specifically
          if (typeof hideLobby === 'function') {
            hideLobby();
          }
        });
      });
    }
    
    // Create Game button in lobby
    const createGameBtn = document.getElementById('create-game-btn');
    const betAmountLobbyInput = document.getElementById('bet-amount-lobby');
    if (createGameBtn && betAmountLobbyInput) {
      createGameBtn.addEventListener('click', () => {
        console.log('Create Game button clicked');
        
        // Get bet amount
        const betAmount = parseInt(betAmountLobbyInput.value);
        
        // Validate bet amount
        if (isNaN(betAmount) || betAmount <= 0) {
          showError('Please enter a valid bet amount');
          return;
        }
        
        if (betAmount > (currentUser ? currentUser.balance : 0)) {
          showError('Insufficient balance for this bet');
          return;
        }
        
        // Create game on server
        if (socket) {
          socket.emit('createGame', {
            betAmount
          });
          
          showError('Game created! Waiting for opponents...', 'info');
        } else {
          showError('Cannot create game: server connection not available');
        }
      });
    }
    
    // Send Lobby Chat button
    const sendLobbyChatBtn = document.getElementById('send-lobby-chat-btn');
    if (sendLobbyChatBtn) {
      sendLobbyChatBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent form submission
        console.log('Send lobby chat button clicked');
        sendLobbyChatMessage();
      });
    }
    
    // Lobby Chat Input - Enter key
    const lobbyChatInput = document.getElementById('lobby-chat-input');
    if (lobbyChatInput) {
      lobbyChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault(); // Prevent form submission
          sendLobbyChatMessage();
        }
      });
    }
    
    // Level buttons
    const level1Btn = document.getElementById('level1-btn');
    if (level1Btn) {
      level1Btn.addEventListener('click', () => {
        initGame(1);
      });
    }
    
    const level2Btn = document.getElementById('level2-btn');
    if (level2Btn) {
      level2Btn.addEventListener('click', () => {
        if (!level2Btn.classList.contains('locked')) {
          initGame(2);
        } else {
          showError('Complete Level 1 and the Magic Horse Challenge to unlock this level!');
        }
      });
    }
    
    const level3Btn = document.getElementById('level3-btn');
    if (level3Btn) {
      level3Btn.addEventListener('click', () => {
        if (!level3Btn.classList.contains('locked')) {
          initGame(3);
        } else {
          showError('Complete Level 2 and the Magic Horse Challenge to unlock this level!');
        }
      });
    }
    
    const level4Btn = document.getElementById('level4-btn');
    if (level4Btn) {
      level4Btn.addEventListener('click', () => {
        if (!level4Btn.classList.contains('locked')) {
          initGame(4);
        } else {
          showError('Complete Level 3 and the Magic Horse Challenge to unlock this level!');
        }
      });
    }
    
    const battleChessBtn = document.getElementById('battle-chess-btn');
    if (battleChessBtn) {
      battleChessBtn.addEventListener('click', () => {
        if (!battleChessBtn.classList.contains('locked')) {
          initBattleChess();
        } else {
          showError('Complete Level 4 to unlock Battle Chess!');
        }
      });
    }
    
    const customSetupBtn = document.getElementById('custom-setup-btn');
    if (customSetupBtn) {
      customSetupBtn.addEventListener('click', () => {
        if (!customSetupBtn.classList.contains('locked')) {
          initCustomSetup();
        } else {
          showError('Win 3 Battle Chess games to unlock Custom Setup!');
        }
      });
    }
    
    // AI options
    const startAiGameBtn = document.getElementById('start-ai-game-btn');
    const aiDifficultySlider = document.getElementById('ai-difficulty');
    if (startAiGameBtn && aiDifficultySlider) {
      startAiGameBtn.addEventListener('click', () => {
        console.log('Start AI Game button clicked');
        
        // Hide AI options
        if (aiOptions) aiOptions.classList.add('hidden');
        
        // Get AI difficulty
        const aiDifficulty = parseInt(aiDifficultySlider.value);
        
        // Initialize a new game with AI
        chess = new Chess();
        
        // Set up the board with black to move first
        chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
        
        // Set up the game
        isAiGame = true;
        isPlayerTurn = true;
        playerColor = 'black';
        
        // Update player info
        if (whitePlayerEl && blackPlayerEl) {
          const whiteNameEl = whitePlayerEl.querySelector('.player-name');
          const blackNameEl = blackPlayerEl.querySelector('.player-name');
          
          if (whiteNameEl) whiteNameEl.textContent = 'AI';
          if (blackNameEl) blackNameEl.textContent = currentUser ? currentUser.username : 'You';
        }
        
        // Create the board
        createBoard();
        
        // Update the board
        updateBoard();
        
        // Update game status
        updateGameStatus();
        
        // Enable controls
        if (resignBtn) resignBtn.disabled = false;
        if (offerDrawBtn) offerDrawBtn.disabled = false;
        
        // Show success message
        showError('Game started against AI', 'success');
      });
    }
    
    // AI vs AI options
    const startAiVsAiBtn = document.getElementById('start-ai-vs-ai-btn');
    if (startAiVsAiBtn) {
      startAiVsAiBtn.addEventListener('click', () => {
        console.log('Start AI vs AI button clicked');
        
        // Hide AI vs AI options
        if (aiVsAiOptions) aiVsAiOptions.classList.add('hidden');
        
        // Start AI vs AI game
        startAiVsAiGame();
        
        // Show success message
        showError('AI vs AI game started', 'success');
      });
    }
    
    // Tournament buttons
    const tournamentsBtn = document.getElementById('tournaments-btn');
    if (tournamentsBtn) {
      tournamentsBtn.addEventListener('click', showTournaments);
    }
    
    const tournamentBackBtn = document.getElementById('tournament-back-btn');
    if (tournamentBackBtn) {
      tournamentBackBtn.addEventListener('click', hideTournaments);
    }
    
    const createTournamentBtn = document.getElementById('create-tournament-btn');
    if (createTournamentBtn) {
      createTournamentBtn.addEventListener('click', () => {
        const createTournamentModal = document.getElementById('create-tournament-modal');
        if (createTournamentModal) {
          createTournamentModal.classList.remove('hidden');
        }
      });
    }
    
    // Tournament filter and refresh
    const tournamentStatusFilter = document.getElementById('tournament-status-filter');
    if (tournamentStatusFilter) {
      tournamentStatusFilter.addEventListener('change', loadTournaments);
    }
    
    const tournamentVariantFilter = document.getElementById('tournament-variant-filter');
    if (tournamentVariantFilter) {
      tournamentVariantFilter.addEventListener('change', loadTournaments);
    }
    
    const tournamentRefreshBtn = document.getElementById('tournament-refresh-btn');
    if (tournamentRefreshBtn) {
      tournamentRefreshBtn.addEventListener('click', loadTournaments);
    }
    
    // Magic Horse Challenge button
    const magicHorseBtn = document.getElementById('magic-horse-btn');
    if (magicHorseBtn) {
      magicHorseBtn.addEventListener('click', () => {
        showMagicHorseChallenge();
        loadMagicHorseProgress();
      });
    }
    
    // Play button to return to game section
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        hideTournaments();
        hideMagicHorseChallenge();
      });
    }
    
    // Setup Magic Horse Challenge event listeners
    if (typeof setupMagicHorseEventListeners === 'function') {
      setupMagicHorseEventListeners();
    }
    
    // Auth event listeners
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        if (loginModal) {
          loginModal.classList.remove('hidden');
        }
      });
    }
    
    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        if (registerModal) {
          registerModal.classList.remove('hidden');
        }
      });
    }
    
    // Login form submission
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const loginUsername = document.getElementById('login-username');
        const loginPassword = document.getElementById('login-password');
        
        if (!loginUsername || !loginPassword) {
          showError('Login form elements not found');
          return;
        }
        
        const username = loginUsername.value;
        const password = loginPassword.value;
        
        fetchWithCredentials('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(data => {
              throw new Error(data.message || 'Login failed');
            });
          }
          return response.json();
        })
        .then(data => {
          // Use the updateUIAfterLogin function
          if (typeof updateUIAfterLogin === 'function') {
            updateUIAfterLogin(data.user);
          }
          showError(data.message, 'success');
        })
        .catch(error => {
          console.error('Login error:', error);
          showError(error.message || 'Login failed. Please check your credentials.');
        });
      });
    }
    
    // Register form submission
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const registerUsername = document.getElementById('register-username');
        const registerEmail = document.getElementById('register-email');
        const registerPassword = document.getElementById('register-password');
        const registerConfirmPassword = document.getElementById('register-confirm-password');
        
        if (!registerUsername || !registerEmail || !registerPassword || !registerConfirmPassword) {
          showError('Register form elements not found');
          return;
        }
        
        const username = registerUsername.value;
        const email = registerEmail.value;
        const password = registerPassword.value;
        const confirmPassword = registerConfirmPassword.value;
        
        if (password !== confirmPassword) {
          showError('Passwords do not match');
          return;
        }
        
        fetchWithCredentials('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password })
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(data => {
              throw new Error(data.message || 'Registration failed');
            });
          }
          return response.json();
        })
        .then(data => {
          // Use the updateUIAfterLogin function
          if (typeof updateUIAfterLogin === 'function') {
            updateUIAfterLogin(data.user);
          }
          showError(data.message, 'success');
        })
        .catch(error => {
          console.error('Registration error:', error);
          showError(error.message || 'Registration failed. Please try again.');
        });
      });
    }
    
    console.log('Event listeners setup complete');
  } catch (error) {
    console.error('Error setting up event listeners:', error);
  }
}
