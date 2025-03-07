# Chess Universe - The Ultimate Chess Evolution

Chess Universe isn't just another chess app—it's a complete chess evolution. Starting with traditional chess (Black moves first), players progress through unique level-based challenges, unlocking new queen abilities and competing for massive bets and high-stakes tournaments.

## Features

### Progressive Chess Experience
- **Level 1 - Traditional Chess (Black Moves First)**: Regular chess rules with Black moving first.
- **Level 2 - Queen's First Transformation**: Queens lose their Rook-like vertical/horizontal moves, but can move like a Bishop, King, and Horse.
- **Level 3 - Queen's Second Transformation**: Queens lose their Bishop-like diagonal movement, but can move like a Rook, King, and Horse.
- **Level 4 - The Ultimate Evolution**: Queens regain all normal chess abilities and also move like a Horse (Knight).

### Magic Horse Challenge
- Special mini-game that unlocks new levels
- Board Setup: Three rows filled with 24 Queens and a single Horse (Knight)
- Objective: Move the Horse to land on and remove Queens
- Cannot land on an empty square
- Must leave only a specific number of Queens to win (4, 2, or 1 depending on the challenge level)

### Battle Chess Mode
- All pieces are pushed to the center of the board (face-to-face)
- Black still goes first
- Players can choose to play any unlocked level in this new formation

### Custom Chess Setup
- Players set up their pieces behind the Pawns however they want
- Queens can be in Level 1, 2, 3, or 4 form (player's choice)
- Pawns stay in traditional formation

### Betting System
- Players can bet against each other in any game
- The app collects 10% of all bets, holds funds in escrow, and pays winners instantly
- Spectators can bet on live matches

### Tournaments
- Poker-style buy-ins with different entry fees & prize pools
- Players can choose traditional, Battle Chess, or Level 2+ tournaments
- App makes profit from tournament fees while paying the top 3 finishers

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Real-time Communication**: Socket.io
- **Authentication**: Passport.js
- **Chess Logic**: Chess.js (modified for custom rules)

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
MONGODB_URI=mongodb://localhost:27017/chess-universe
SESSION_SECRET=your_session_secret
PORT=3001
```

4. Start the server:
```
npm start
```

5. Open your browser and navigate to `http://localhost:3001`

## Game Progression

1. **Start at Level 1**: Play traditional chess with Black moving first
2. **Win a Level 1 game**: Unlock the Magic Horse challenge
3. **Complete Magic Horse challenge**: Unlock Level 2
4. **Win a Level 2 game**: Unlock the next Magic Horse challenge
5. **Complete Magic Horse challenge again**: Unlock Level 3
6. **Win a Level 3 game**: Unlock the final Magic Horse challenge
7. **Complete final Magic Horse challenge**: Unlock Level 4 and Battle Chess mode
8. **Win 3 Battle Chess games**: Unlock Custom Chess Setup

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. 