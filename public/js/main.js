// Import dependencies - these are loaded as separate scripts in the HTML
// Defined globally: gameConfig, ChessAI, BettingSystem, GameAnalytics, MultiplayerManager

class ChessApp {
    constructor() {
        // Initialize core components
        this.ai = new ChessAI(gameConfig.game.analysis.depth);
        this.bettingSystem = new BettingSystem();
        this.gameAnalytics = new GameAnalytics(this.ai);
        this.multiplayerManager = new MultiplayerManager();
        
        // Game state
        this.game = new Chess(); // From chess.js library
        this.board = null; // Chessboard instance
        this.currentPosition = 'start';
        this.selectedSquare = null;
        this.playerColor = 'white';
        this.playerTurn = true;
        this.gameStarted = false;
        this.gameOver = false;
        this.aiDifficulty = 10;
        this.gameMode = 'ai'; // 'ai', 'pvp', 'custom'
        
        // Timers
        this.whiteTime = 600; // seconds
        this.blackTime = 600; // seconds
        this.increment = 5; // seconds
        this.timerEnabled = true;
        this.timerInterval = null;
        
        // UI elements
        this.boardContainer = document.getElementById('board-container');
        this.gameStatus = document.getElementById('game-status');
        this.moveHistory = document.getElementById('move-history');
        this.whiteTimer = document.getElementById('white-timer');
        this.blackTimer = document.getElementById('black-timer');
        
        // Initialize
        this.init();
    }

    init() {
        // Initialize the chessboard
        this.initChessboard();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Apply board size
        this.resizeBoard();
        
        // Update game status
        this.updateStatus();
        
        // Start the game if 'ai' mode
        if (this.gameMode === 'ai') {
            this.startGame();
        }
        
        // Set up multiplayer handlers if in PvP mode
        if (this.gameMode === 'pvp') {
            this.setupMultiplayerHandlers();
        }
    }

    initChessboard() {
        // Configure the chessboard
        const config = {
            draggable: true,
            position: this.currentPosition,
            pieceTheme: '/img/chesspieces/wikipedia/{piece}.png',
            onDragStart: this.handleDragStart.bind(this),
            onDrop: this.handleDrop.bind(this),
            onSnapEnd: this.handleSnapEnd.bind(this),
            onMouseoverSquare: this.highlightLegalMoves.bind(this),
            onMouseoutSquare: this.clearHighlights.bind(this)
        };
        
        // Create the chessboard
        this.board = Chessboard('chessboard', config);
        
        // Handle window resize for responsive chess board
        window.addEventListener('resize', () => {
            this.resizeBoard();
        });
    }

    setupEventListeners() {
        // New game button
        document.getElementById('new-game-btn')?.addEventListener('click', () => {
            this.resetGame();
        });
        
        // Resign button
        document.getElementById('resign-btn')?.addEventListener('click', () => {
            this.resignGame();
        });
        
        // Offer draw button
        document.getElementById('draw-btn')?.addEventListener('click', () => {
            this.offerDraw();
        });
        
        // Flip board button
        document.getElementById('flip-board-btn')?.addEventListener('click', () => {
            this.flipBoard();
        });
        
        // Difficulty slider
        document.getElementById('difficulty-slider')?.addEventListener('input', (e) => {
            this.aiDifficulty = parseInt(e.target.value);
            document.getElementById('difficulty-value').textContent = this.aiDifficulty;
            this.ai.setDifficulty(this.aiDifficulty);
        });
    }

    setupMultiplayerHandlers() {
        // Game start handler
        this.multiplayerManager.on('gameStart', (data) => {
            this.handleGameEvent({ type: 'gameStart', data });
        });
        
        // Move handler
        this.multiplayerManager.on('opponentMove', (data) => {
            this.handleGameEvent({ type: 'opponentMove', data });
        });
        
        // Game end handler
        this.multiplayerManager.on('gameEnd', (data) => {
            this.handleGameEvent({ type: 'gameEnd', data });
        });
        
        // Draw offer handler
        this.multiplayerManager.on('drawOffer', () => {
            this.handleGameEvent({ type: 'drawOffer' });
        });
        
        // Opponent resign handler
        this.multiplayerManager.on('opponentResigned', () => {
            this.handleGameEvent({ type: 'opponentResigned' });
        });
    }

    handleGameEvent(event) {
        switch (event.type) {
            case 'gameStart':
                this.playerColor = event.data.color;
                this.board.orientation(this.playerColor);
                this.playerTurn = this.playerColor === 'white';
                this.gameStarted = true;
                this.updateStatus();
                break;
                
            case 'opponentMove':
                this.makeMove(event.data.from, event.data.to, event.data.promotion);
                break;
                
            case 'gameEnd':
                this.handleGameEnd(event.data.reason, event.data.winner);
                break;
                
            case 'drawOffer':
                if (confirm('Your opponent has offered a draw. Do you accept?')) {
                    this.multiplayerManager.respondToDraw(true);
                    this.handleGameEnd('draw');
                } else {
                    this.multiplayerManager.respondToDraw(false);
                }
                break;
                
            case 'opponentResigned':
                this.handleGameEnd('resignation', this.playerColor);
                break;
        }
    }

    handleDragStart(source, piece, position, orientation) {
        // Do not allow piece movement if game is over
        if (this.gameOver) return false;
        
        // Only allow the current player to move pieces
        const pieceColor = piece.charAt(0) === 'w' ? 'white' : 'black';
        
        if (this.gameMode === 'pvp') {
            // In multiplayer, only allow moving your own pieces on your turn
            if (pieceColor !== this.playerColor || !this.playerTurn) return false;
        } else {
            // In AI mode, only allow moving pieces of the player's color
            if ((this.playerTurn && pieceColor !== this.playerColor) || 
                (!this.playerTurn && pieceColor === this.playerColor)) {
                return false;
            }
        }
        
        // Check if the piece has any legal moves
        const moves = this.game.moves({ square: source, verbose: true });
        if (moves.length === 0) return false;
        
        // Store the selected square for highlighting
        this.selectedSquare = source;
        
        return true;
    }

    handleDrop(source, target) {
        // Clear highlights
        this.clearHighlights();
        
        // Check if it's a legal move
        let move = null;
        try {
            // Check for promotion
            const sourceSquare = this.game.get(source);
            const isPawn = sourceSquare && sourceSquare.type === 'p';
            const isPromotion = isPawn && (target.charAt(1) === '8' || target.charAt(1) === '1');
            
            if (isPromotion) {
                // Show promotion dialog
                const pieceColor = sourceSquare.color === 'w' ? 'white' : 'black';
                move = { from: source, to: target, promotion: 'q' }; // Default to queen
            } else {
                move = this.game.move({
                    from: source,
                    to: target,
                    promotion: 'q' // Default to queen for auto promotion
                });
            }
        } catch (e) {
            // Invalid move
            return 'snapback';
        }
        
        // If the move is illegal, return 'snapback'
        if (move === null) return 'snapback';
        
        // Valid move, update the board
        this.board.position(this.game.fen());
        
        // Highlight the move
        this.highlightLastMove(source, target);
        
        // Play move sound
        this.playMoveSound(move);
        
        // Record move for analytics
        this.gameAnalytics.recordMove(move.san, this.game.fen(), this.playerColor);
        
        // Update game status
        this.updateStatus();
        
        // Switch turns
        this.playerTurn = !this.playerTurn;
        
        // If in multiplayer mode, send the move
        if (this.gameMode === 'pvp') {
            this.multiplayerManager.makeMove({ from: source, to: target, promotion: move.promotion });
        }
        
        // If playing against AI and it's AI's turn
        if (this.gameMode === 'ai' && !this.playerTurn && !this.gameOver) {
            // Make AI move after a small delay
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        }
    }

    handleSnapEnd() {
        // Update the board position after piece snap
        this.board.position(this.game.fen());
    }

    async makeAIMove() {
        if (this.gameOver) return;
        
        try {
            // Get best move from AI
            const aiMove = await this.ai.getBestMove(this.game.fen(), {
                depth: this.aiDifficulty
            });
            
            if (!aiMove) {
                console.error('AI could not find a move');
                return;
            }
            
            // Extract from and to squares
            const from = aiMove.substring(0, 2);
            const to = aiMove.substring(2, 4);
            const promotion = aiMove.length > 4 ? aiMove.substring(4, 5) : undefined;
            
            // Make the move
            const move = this.game.move({
                from: from,
                to: to,
                promotion: promotion || 'q'
            });
            
            if (move) {
                // Update board
                this.board.position(this.game.fen());
                
                // Highlight the move
                this.highlightLastMove(from, to);
                
                // Play move sound
                this.playMoveSound(move);
                
                // Record move for analytics
                this.gameAnalytics.recordMove(move.san, this.game.fen(), 'black');
                
                // Update game status
                this.updateStatus();
                
                // Switch back to player's turn
                this.playerTurn = true;
            }
        } catch (error) {
            console.error('Error making AI move:', error);
            this.showError('Error making AI move. Please try again.');
        }
    }

    updateStatus() {
        let status = '';
        
        // Check if the game is over
        if (this.game.isGameOver()) {
            this.gameOver = true;
            
            if (this.game.isCheckmate()) {
                const winner = this.game.turn() === 'w' ? 'black' : 'white';
                status = `Checkmate! ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins.`;
                this.handleGameEnd('checkmate', winner);
            } else if (this.game.isDraw()) {
                if (this.game.isStalemate()) {
                    status = 'Draw by stalemate.';
                } else if (this.game.isThreefoldRepetition()) {
                    status = 'Draw by threefold repetition.';
                } else if (this.game.isInsufficientMaterial()) {
                    status = 'Draw by insufficient material.';
                } else {
                    status = 'Draw.';
                }
                this.handleGameEnd('draw');
            }
        } else {
            // Game is still in progress
            const turn = this.game.turn() === 'w' ? 'White' : 'Black';
            if (this.game.isCheck()) {
                status = `${turn}'s turn. Check!`;
            } else {
                status = `${turn}'s turn.`;
            }
        }
        
        // Update the status element
        if (this.gameStatus) {
            this.gameStatus.textContent = status;
        }
    }

    handleGameEnd(reason, winner = null) {
        this.gameOver = true;
        
        // Stop timers
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Resolve bets if any
        if (this.bettingSystem && this.bettingSystem.betPlaced) {
            const playerWon = winner === this.playerColor;
            this.bettingSystem.resolveBet(playerWon);
        }
        
        // Generate game summary
        const summary = this.gameAnalytics.endGame({
            result: winner || 'draw',
            reason: reason
        });
        
        // Show game end modal
        this.showGameEndModal(reason, winner, summary);
    }

    showGameEndModal(reason, winner, summary) {
        let title = '';
        let message = '';
        
        // Set title and message based on the reason and winner
        if (reason === 'checkmate') {
            title = 'Checkmate!';
            message = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins by checkmate.`;
        } else if (reason === 'resignation') {
            title = 'Resignation';
            message = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins by resignation.`;
        } else if (reason === 'timeout') {
            title = 'Timeout';
            message = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins on time.`;
        } else if (reason === 'draw') {
            title = 'Draw';
            message = 'The game ended in a draw.';
        } else {
            title = 'Game Over';
            message = 'The game has ended.';
        }
        
        // Display betting results if applicable
        if (this.bettingSystem && this.bettingSystem.betPlaced) {
            const betResult = document.getElementById('betting-result');
            if (betResult) {
                const playerWon = winner === this.playerColor;
                if (playerWon) {
                    betResult.textContent = `You won ${this.bettingSystem.currentBet * 2} coins!`;
                    betResult.className = 'text-green-500 font-bold';
                } else {
                    betResult.textContent = `You lost ${this.bettingSystem.currentBet} coins.`;
                    betResult.className = 'text-red-500 font-bold';
                }
            }
        }
        
        // Display game summary
        if (summary) {
            const summaryElem = document.getElementById('game-summary');
            if (summaryElem) {
                summaryElem.innerHTML = `
                    <p>Total Moves: ${summary.totalMoves}</p>
                    <p>Average Position Evaluation: ${summary.averageEvaluation}</p>
                    <p>Game Duration: ${this.formatDuration(Date.now() - this.gameStartTime)}</p>
                `;
            }
        }
        
        // Show the modal
        const gameEndModal = document.getElementById('game-end-modal');
        if (gameEndModal) {
            document.getElementById('result-title').textContent = title;
            document.getElementById('result-message').textContent = message;
            
            // Show the modal
            gameEndModal.classList.remove('hidden');
        }
    }

    highlightLegalMoves(square) {
        // Get legal moves for the square
        const moves = this.game.moves({
            square: square,
            verbose: true
        });
        
        // Highlight the square itself
        if (moves.length > 0) {
            document.querySelector(`.square-${square}`).classList.add('highlight');
        }
        
        // Highlight the target squares
        moves.forEach(move => {
            document.querySelector(`.square-${move.to}`).classList.add('highlight');
        });
    }

    clearHighlights() {
        // Remove all highlights
        document.querySelectorAll('.highlight').forEach(el => {
            el.classList.remove('highlight');
        });
    }

    highlightLastMove(from, to) {
        // Highlight the last move
        document.querySelector(`.square-${from}`).classList.add('last-move');
        document.querySelector(`.square-${to}`).classList.add('last-move');
    }

    playMoveSound(move) {
        if (window.soundManager) {
            // Play appropriate sound based on move type
            if (move.san.includes('#')) {
                window.soundManager.play('checkmate');
            } else if (move.san.includes('+')) {
                window.soundManager.play('check');
            } else if (move.captured) {
                window.soundManager.play('capture');
            } else {
                window.soundManager.play('move');
            }
        }
    }

    playSound(type) {
        if (window.soundManager) {
            window.soundManager.play(type);
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours > 0 ? `${hours}h ` : ''}${minutes % 60}m ${seconds % 60}s`;
    }

    showError(message) {
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 p-4 bg-red-500 text-white rounded-lg shadow-lg z-50';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    resizeBoard() {
        // Get container width
        const containerWidth = this.boardContainer ? this.boardContainer.offsetWidth : 400;
        
        // Calculate board size (min 300px, max 600px)
        const boardSize = Math.max(300, Math.min(containerWidth, 600));
        
        // Resize the board
        if (this.board) {
            this.board.resize(boardSize);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chessApp = new ChessApp();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessApp;
} 