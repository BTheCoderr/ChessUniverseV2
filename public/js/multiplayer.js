class MultiplayerManager {
    constructor(gameId = null) {
        this.socket = io();
        this.gameId = gameId;
        this.playerColor = null;
        this.opponent = null;
        this.isMyTurn = false;
        this.gameState = 'waiting'; // waiting, playing, ended
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 5;
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Connection events
        this.socket.on('connect', () => this.handleConnect());
        this.socket.on('disconnect', () => this.handleDisconnect());
        this.socket.on('reconnect', () => this.handleReconnect());
        this.socket.on('reconnect_error', () => this.handleReconnectError());

        // Game events
        this.socket.on('gameStart', (data) => this.handleGameStart(data));
        this.socket.on('gameMove', (data) => this.handleOpponentMove(data));
        this.socket.on('gameEnd', (data) => this.handleGameEnd(data));
        this.socket.on('drawOffer', () => this.handleDrawOffer());
        this.socket.on('drawResponse', (accepted) => this.handleDrawResponse(accepted));
        this.socket.on('opponentResigned', () => this.handleOpponentResigned());
        this.socket.on('opponentDisconnected', () => this.handleOpponentDisconnected());
        this.socket.on('opponentReconnected', () => this.handleOpponentReconnected());
        
        // Chat events
        this.socket.on('chatMessage', (data) => this.handleChatMessage(data));
        
        // Error events
        this.socket.on('error', (error) => this.handleError(error));
    }

    // Connection handling
    handleConnect() {
        console.log('Connected to server');
        if (this.gameId) {
            this.rejoinGame(this.gameId);
        }
        this.emit('connectionEvent', { type: 'connected' });
    }

    handleDisconnect() {
        console.log('Disconnected from server');
        this.gameState = 'waiting';
        this.emit('connectionEvent', { type: 'disconnected' });
    }

    handleReconnect() {
        console.log('Reconnected to server');
        this.reconnectionAttempts = 0;
        if (this.gameId) {
            this.rejoinGame(this.gameId);
        }
        this.emit('connectionEvent', { type: 'reconnected' });
    }

    handleReconnectError() {
        this.reconnectionAttempts++;
        console.log(`Reconnection attempt ${this.reconnectionAttempts} failed`);
        if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
            this.emit('connectionEvent', { type: 'reconnectFailed' });
        }
    }

    // Game management
    async joinQueue(options = {}) {
        const { ratingRange, timeControl, rated = true } = options;
        this.socket.emit('joinQueue', { ratingRange, timeControl, rated });
    }

    async createPrivateGame(options = {}) {
        const { timeControl, rated = false } = options;
        this.socket.emit('createPrivateGame', { timeControl, rated });
    }

    async joinPrivateGame(gameId) {
        this.socket.emit('joinPrivateGame', { gameId });
    }

    async rejoinGame(gameId) {
        this.socket.emit('rejoinGame', { gameId });
    }

    async makeMove(move) {
        if (!this.isMyTurn || this.gameState !== 'playing') {
            throw new Error('Not your turn or game not in progress');
        }
        this.socket.emit('makeMove', { 
            gameId: this.gameId, 
            move: move 
        });
        this.isMyTurn = false;
    }

    async offerDraw() {
        if (this.gameState !== 'playing') {
            throw new Error('Game not in progress');
        }
        this.socket.emit('offerDraw', { gameId: this.gameId });
    }

    async respondToDraw(accept) {
        this.socket.emit('respondToDraw', { 
            gameId: this.gameId, 
            accept 
        });
    }

    async resign() {
        if (this.gameState !== 'playing') {
            throw new Error('Game not in progress');
        }
        this.socket.emit('resign', { gameId: this.gameId });
        this.gameState = 'ended';
    }

    // Event handlers
    handleGameStart(data) {
        this.gameId = data.gameId;
        this.playerColor = data.color;
        this.opponent = data.opponent;
        this.isMyTurn = data.color === 'white';
        this.gameState = 'playing';
        this.emit('gameEvent', { 
            type: 'gameStart',
            data: {
                gameId: this.gameId,
                color: this.playerColor,
                opponent: this.opponent,
                timeControl: data.timeControl
            }
        });
    }

    handleOpponentMove(data) {
        this.isMyTurn = true;
        this.emit('gameEvent', { 
            type: 'move',
            data: {
                move: data.move,
                remainingTime: data.remainingTime
            }
        });
    }

    handleGameEnd(data) {
        this.gameState = 'ended';
        this.isMyTurn = false;
        this.emit('gameEvent', { 
            type: 'gameEnd',
            data: {
                result: data.result,
                reason: data.reason,
                ratingChange: data.ratingChange
            }
        });
    }

    handleDrawOffer() {
        this.emit('gameEvent', { 
            type: 'drawOffer'
        });
    }

    handleDrawResponse(accepted) {
        this.emit('gameEvent', { 
            type: 'drawResponse',
            data: { accepted }
        });
    }

    handleOpponentResigned() {
        this.gameState = 'ended';
        this.emit('gameEvent', { 
            type: 'opponentResigned'
        });
    }

    handleOpponentDisconnected() {
        this.emit('gameEvent', { 
            type: 'opponentDisconnected'
        });
    }

    handleOpponentReconnected() {
        this.emit('gameEvent', { 
            type: 'opponentReconnected'
        });
    }

    handleChatMessage(data) {
        this.emit('chatEvent', {
            type: 'message',
            data: {
                sender: data.sender,
                message: data.message,
                timestamp: data.timestamp
            }
        });
    }

    handleError(error) {
        this.emit('error', {
            message: error.message,
            code: error.code
        });
    }

    // Helper methods
    sendChatMessage(message) {
        if (!this.gameId) return;
        this.socket.emit('chatMessage', {
            gameId: this.gameId,
            message: message
        });
    }

    emit(eventName, data) {
        // Override this method to handle events in the main application
        console.log(`Event: ${eventName}`, data);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Export the MultiplayerManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerManager;
} else {
    window.MultiplayerManager = MultiplayerManager;
} 