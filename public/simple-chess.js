// Core chess variables
let chess;
let selectedSquare = null;
let playerColor = 'black'; // Default to black
let gameOver = false;

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Simple chess initializing...');
    
    // Initialize chess with black to move first
    chess = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
    
    // Create the board
    createBoard();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Simple chess initialized');
});

// Create the chessboard
function createBoard() {
    console.log('Creating chessboard...');
    
    // Get the chessboard element
    const chessboard = document.getElementById('chessboard');
    if (!chessboard) {
        console.error('Chessboard element not found');
        return;
    }
    
    // Clear any existing content
    chessboard.innerHTML = '';
    
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
            square.addEventListener('click', handleSquareClick);
            
            // Add to chessboard
            chessboard.appendChild(square);
        }
    }
    
    console.log('Chessboard created. Now updating with pieces...');
    
    // Update the board with pieces
    updateBoard();
}

// Update the board to reflect the current game state
function updateBoard() {
    console.log('Updating board with game state:', chess.fen());
    
    // First, remove all pieces
    document.querySelectorAll('.piece').forEach(piece => piece.remove());
    
    // Get the current position from chess.js
    const position = chess.board();
    
    // Add pieces to the board based on the current position
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = position[row][col];
            if (piece) {
                const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (square) {
                    // Create piece element
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    
                    // Determine piece color and type
                    const color = piece.color === 'w' ? 'white' : 'black';
                    const type = getPieceType(piece.type);
                    
                    // Add appropriate class for the piece
                    pieceElement.classList.add(`${color}-${type}`);
                    
                    // Create and add the piece image
                    const img = document.createElement('img');
                    img.src = `images/pieces/${color}_${type}.png`;
                    img.alt = `${color} ${type}`;
                    pieceElement.appendChild(img);
                    
                    // Add the piece to the square
                    square.appendChild(pieceElement);
                }
            }
        }
    }
    
    // Update game status
    updateGameStatus();
}

// Handle square click events
function handleSquareClick(event) {
    const square = event.currentTarget;
    const squareNotation = square.getAttribute('data-square');
    
    console.log(`Clicked on ${squareNotation}`);
    
    // Don't allow moves if game is over
    if (gameOver) {
        console.log('Game is over');
        return;
    }
    
    // If a square is already selected
    if (selectedSquare) {
        // Try to make the move
        try {
            const move = chess.move({
                from: selectedSquare,
                to: squareNotation,
                promotion: 'q' // Always promote to queen for simplicity
            });
            
            if (move) {
                console.log('Move made:', move);
                
                // Play move sound if available
                if (typeof playMoveSound === 'function') {
                    playMoveSound(move);
                } else if (typeof playSound === 'function') {
                    playSound('move');
                }
                
                // Clear selection
                selectedSquare = null;
                
                // Remove all highlights
                clearHighlights();
                
                // Update the board
                updateBoard();
                
                // Highlight the last move
                highlightLastMove(move.from, move.to);
                
                // Update game status
                updateGameStatus();
                
                // If in AI mode, make the AI move after a short delay
                if (typeof makeAIMove === 'function' && !gameOver) {
                    setTimeout(makeAIMove, 500);
                }
            } else {
                console.log('Invalid move');
                selectedSquare = null;
                clearHighlights();
            }
        } catch (error) {
            console.error('Error making move:', error);
            selectedSquare = null;
            clearHighlights();
        }
    } else {
        // Check if there's a piece here
        const piece = chess.get(squareNotation);
        
        if (piece) {
            // For normal play, only allow selecting your own pieces
            const isPlayerPiece = (playerColor === 'white' && piece.color === 'w') || 
                                 (playerColor === 'black' && piece.color === 'b');
            
            if (!isPlayerPiece) {
                console.log('Not your piece');
                return;
            }
            
            console.log(`Selected piece: ${piece.type} at ${squareNotation}`);
            selectedSquare = squareNotation;
            square.classList.add('selected');
            
            // Highlight possible moves
            const moves = chess.moves({
                square: squareNotation,
                verbose: true
            });
            
            console.log('Legal moves:', moves);
            
            moves.forEach(move => {
                const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
                if (targetSquare) {
                    targetSquare.classList.add('possible-move');
                }
            });
        }
    }
}

// Clear all highlights from the board
function clearHighlights() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'possible-move', 'last-move-from', 'last-move-to');
    });
}

// Highlight the last move made
function highlightLastMove(from, to) {
    const fromSquare = document.querySelector(`[data-square="${from}"]`);
    const toSquare = document.querySelector(`[data-square="${to}"]`);
    
    if (fromSquare) fromSquare.classList.add('last-move-from');
    if (toSquare) toSquare.classList.add('last-move-to');
}

// Update game status
function updateGameStatus() {
    const statusElement = document.getElementById('game-status');
    if (!statusElement) return;
    
    let status = '';
    
    if (chess.isCheckmate()) {
        const winner = chess.turn() === 'w' ? 'Black' : 'White';
        status = `Checkmate! ${winner} wins`;
        gameOver = true;
    } else if (chess.isDraw()) {
        status = 'Game over - Draw';
        gameOver = true;
    } else {
        const currentTurn = chess.turn() === 'w' ? 'White' : 'Black';
        status = `${currentTurn} to move`;
        
        if (chess.isCheck()) {
            status += ' (Check)';
        }
    }
    
    // Update the status display
    statusElement.textContent = status;
    
    // Update player info highlights
    const whitePlayerElement = document.getElementById('white-player');
    const blackPlayerElement = document.getElementById('black-player');
    
    if (whitePlayerElement && blackPlayerElement) {
        if (chess.turn() === 'w') {
            whitePlayerElement.classList.add('active-player');
            blackPlayerElement.classList.remove('active-player');
        } else {
            blackPlayerElement.classList.add('active-player');
            whitePlayerElement.classList.remove('active-player');
        }
    }
}

// Convert piece type to full name
function getPieceType(type) {
    switch (type) {
        case 'p': return 'pawn';
        case 'r': return 'rook';
        case 'n': return 'knight';
        case 'b': return 'bishop';
        case 'q': return 'queen';
        case 'k': return 'king';
        default: return '';
    }
}

// Set up basic event listeners
function setupEventListeners() {
    // New Game button
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            // Reset the chess instance with black to move first
            chess = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
            
            // Reset game state
            gameOver = false;
            selectedSquare = null;
            
            // Update the board
            updateBoard();
            
            // Update player displays
            const whitePlayerEl = document.getElementById('white-player');
            const blackPlayerEl = document.getElementById('black-player');
            
            if (whitePlayerEl) {
                const nameEl = whitePlayerEl.querySelector('.player-name');
                if (nameEl) nameEl.textContent = 'White';
            }
            
            if (blackPlayerEl) {
                const nameEl = blackPlayerEl.querySelector('.player-name');
                if (nameEl) nameEl.textContent = 'You (Black)';
            }
            
            // Show notification
            showMessage('New game started with Black moving first', 'info');
        });
    }
    
    // Resign button
    const resignBtn = document.getElementById('resign-btn');
    if (resignBtn) {
        resignBtn.addEventListener('click', () => {
            if (gameOver) return;
            
            gameOver = true;
            const winner = playerColor === 'white' ? 'Black' : 'White';
            
            // Update status
            const statusElement = document.getElementById('game-status');
            if (statusElement) {
                statusElement.textContent = `${winner} wins by resignation`;
            }
            
            // Show notification
            showMessage(`You resigned. ${winner} wins.`, 'info');
        });
    }
}

// Simple notification function
function showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Use existing error function if available
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