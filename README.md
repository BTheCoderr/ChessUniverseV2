# ChessUniverseV2

A fully functional chess application with virtual betting features. Players can compete against each other or AI opponents, place bets with virtual currency, and track their game history.

## Features

### Chess Gameplay
- Interactive chessboard with drag-and-drop functionality
- Legal move validation using Chess.js
- Animated piece movement with visual feedback
- Play against AI opponents with adjustable difficulty levels
- Play against other players in real-time
- Watch AI vs AI matches

### Betting System
- Place bets with virtual currency
- Start with 1000 virtual coins
- Win opponent's bet on victory
- Get refunded on draws
- Transaction handling to prevent race conditions and ensure data consistency

### User Features
- User registration and authentication
- Profile page with game statistics
- Betting history tracking
- Real-time game chat

### Enhanced UI
- Mobile-responsive design
- Sound effects for moves, captures, and game events
- Game replay functionality
- Visual indicators for check, checkmate, and possible moves

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Real-time Communication**: Socket.io
- **Authentication**: Passport.js
- **Chess Logic**: Chess.js
- **AI**: Stockfish.js

## Installation

1. Clone the repository:
```
git clone https://github.com/BTheCoderr/ChessUniverseV2.git
cd ChessUniverseV2
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=mongodb://localhost:27017/chess-app
SESSION_SECRET=your_session_secret
PORT=3001
```

4. Start the server:
```
npm start
```

5. Open your browser and navigate to `http://localhost:3001`

## How to Play

1. Register an account or log in
2. Choose a game mode:
   - Play vs AI: Play against the computer with adjustable difficulty
   - Play vs Player: Find an opponent to play against
   - AI vs AI: Watch two AI players compete
3. Place a bet (optional)
4. Make your moves by clicking or dragging pieces
5. Win by checkmating your opponent

## Future Enhancements

- Tournaments and competitions
- Leaderboards and rankings
- Advanced betting options
- Spectator mode for watching live games

## License

This project is licensed under the MIT License. 