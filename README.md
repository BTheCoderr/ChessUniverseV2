# Chess Universe - The Ultimate Chess Evolution

Chess Universe isn't just another chess app—it's a complete chess evolution. Starting with traditional chess (Black moves first), players progress through unique level-based challenges, unlocking new queen abilities and competing for massive bets and high-stakes tournaments.

![Chess Universe Logo](https://i.imgur.com/XYZ123.png)

## 🎮 Core Features

### 🏆 Progressive Chess Experience
- **Level 1 - Traditional Chess (Black Moves First)**: Regular chess rules with Black moving first, introducing a fresh twist on the classic game.
- **Level 2 - Queen's First Transformation**: Queens lose their Rook-like vertical/horizontal moves, but gain the ability to move like a Bishop, King, and Horse. This transformation forces players to rethink their queen-based strategies.
- **Level 3 - Queen's Second Transformation**: Queens lose their Bishop-like diagonal movement, but can move like a Rook, King, and Horse. Another strategic shift that challenges players to adapt.
- **Level 4 - The Ultimate Evolution**: Queens regain all normal chess abilities and also move like a Horse (Knight), becoming the most powerful pieces in chess history. This final form creates exciting new tactical possibilities.

### 🐴 Magic Horse Challenge
- **Innovative Mini-Game**: A special puzzle challenge that serves as the gateway to unlocking new levels
- **Unique Board Setup**: Three rows filled with 24 Queens and a single Horse (Knight)
- **Challenging Objective**: Move the Horse to land on and remove Queens, with the restriction that you cannot land on an empty square
- **Progressive Difficulty**: 
  - **Level 1 Challenge**: Leave exactly 4 queens to win and unlock Level 2
  - **Level 2 Challenge**: Leave exactly 2 queens to win and unlock Level 3
  - **Level 3 Challenge**: Leave exactly 1 queen to win and unlock Level 4
  - **Final Challenge**: Clear all queens to unlock Battle Chess Mode
- **Strategic Depth**: Requires careful planning and visualization of future moves
- **Hint System**: Provides guidance for players who get stuck
- **Visual Feedback**: Highlights valid moves and shows capture animations

### ⚔️ Battle Chess Mode
- **Face-to-Face Combat**: All pieces are pushed to the center of the board, creating immediate confrontation
- **Intense Action**: Eliminates slow openings and creates tactical battles from move one
- **Flexible Rules**: Players can choose to play any unlocked level in this new formation
- **Strategic Variety**: Different queen abilities dramatically change the dynamics of center-board battles
- **Progression System**: Win 3 Battle Chess games to unlock Custom Chess Setup

### 🎭 Custom Chess Setup
- **Ultimate Customization**: Players set up their pieces behind the Pawns however they want
- **Queen Versatility**: Choose any unlocked queen type (Level 1-4) for your setup
- **Balanced Restrictions**: Pawns stay in traditional formation to maintain game balance
- **Piece Counting System**: Visual interface shows available pieces for placement
- **Strategic Depth**: Create formations that complement your playing style
- **Endless Variety**: Thousands of possible starting positions

### 💰 Betting System
- **Virtual Currency**: Players start with 1,000 coins and can earn more through gameplay
- **Player vs Player Bets**: Wager on your own games with adjustable bet amounts
- **House Fee**: The app collects 10% of all bets, creating a sustainable economy
- **Escrow System**: Funds are held securely and winners are paid instantly
- **Spectator Betting**: Bet on live matches between other players
- **Odds System**: Spectator bets offer 1.8x returns on correct predictions
- **Betting History**: Comprehensive tracking of all your betting activity
- **Leaderboards**: Compete to be the top earner in the betting ecosystem

### 🏆 Tournament System
- **Poker-Style Buy-ins**: Different entry fees create tournaments for all budget levels
- **Flexible Formats**: Choose from 4, 8, 16, or 32 player brackets
- **Game Variants**: Tournaments can use traditional chess, Battle Chess, or any Level 2+ ruleset
- **Prize Pools**: Entry fees fund the prize pool, with payouts to the top 3 finishers
- **Automated Advancement**: System automatically advances winners to the next round
- **Visual Bracket**: Interactive tournament bracket shows progress and results
- **Registration Period**: Set custom registration windows for your tournaments
- **Tournament Status**: Track active, completed, and registration-open tournaments

### 👥 Multiplayer Features
- **Real-time Gameplay**: Instant move synchronization between players
- **Matchmaking System**: Find opponents of similar skill level
- **Challenge System**: Send direct challenges to specific players
- **Reconnection Handling**: Seamlessly rejoin games if you disconnect
- **Game Chat**: Communicate with your opponent during matches
- **Lobby Chat**: Discuss chess and find opponents in the global lobby
- **ELO Rating System**: Track your skill level with a competitive rating
- **Spectator Mode**: Watch live games between other players

### 🎲 AI Opponents
- **Adjustable Difficulty**: 20 levels of AI difficulty to match your skill
- **AI vs AI Mode**: Watch computer opponents battle each other
- **Adjustable Speed**: Control how quickly AI makes moves
- **Different Playstyles**: AI adapts to the different chess level rules

## 🌟 User Experience Features

### 🎓 Tutorial System
- **Interactive Onboarding**: Step-by-step tutorial introduces new players to Chess Universe
- **Visual Guides**: Illustrated explanations of game mechanics
- **Progressive Learning**: Covers basic chess, level progression, special modes, and betting
- **Skip Option**: Experienced players can bypass the tutorial

### 🏅 Level Progression System
- **Achievement-Based Unlocks**: New levels and features are unlocked through gameplay
- **Visual Notifications**: Celebratory modal appears when you unlock new content
- **Persistent Progress**: Your unlocked levels are saved to your account
- **Clear Guidance**: The system shows what you need to do to unlock the next feature

### 📱 Mobile Responsiveness
- **Adaptive Layout**: Interface adjusts to screen size, from desktop to mobile
- **Touch Controls**: Optimized piece movement for touchscreens
- **Responsive Board**: Chessboard scales to fit any device
- **Simplified Mobile Menus**: Navigation adapts for smaller screens
- **Portrait and Landscape Support**: Play comfortably in any orientation

### 🔊 Sound Effects
- **Move Sounds**: Auditory feedback for piece movement
- **Capture Effects**: Special sounds for piece captures
- **Check Alert**: Warning sound when your king is in check
- **Game End Notification**: Sound effects for game completion
- **Sound Toggle**: Option to mute all game sounds

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose ODM
- **Real-time Communication**: Socket.io for instant multiplayer
- **Authentication**: Passport.js with JWT tokens
- **Chess Logic**: Modified Chess.js for custom rules
- **Session Management**: Express-session with MongoDB store
- **Security**: bcrypt for password hashing, CSRF protection

## 📋 Installation

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
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
PORT=3001
```

4. Start the server:
```
npm start
```

5. Open your browser and navigate to `http://localhost:3001`

## 🎯 Game Progression

1. **Start at Level 1**: Play traditional chess with Black moving first
2. **Win a Level 1 game**: Unlock the Magic Horse challenge
3. **Complete Magic Horse challenge (leave 4 queens)**: Unlock Level 2
4. **Win a Level 2 game**: Unlock the next Magic Horse challenge
5. **Complete Magic Horse challenge (leave 2 queens)**: Unlock Level 3
6. **Win a Level 3 game**: Unlock the final Magic Horse challenge
7. **Complete final Magic Horse challenge (leave 1 queen)**: Unlock Level 4
8. **Win a Level 4 game**: Unlock the special Magic Horse challenge
9. **Complete special Magic Horse challenge (clear all queens)**: Unlock Battle Chess mode
10. **Win 3 Battle Chess games**: Unlock Custom Chess Setup

## 🔮 Future Enhancements

- **Mobile App**: Native iOS and Android applications
- **Advanced AI**: Neural network-based chess AI that adapts to custom rules
- **Team Tournaments**: Form teams and compete in group tournaments
- **Puzzle Mode**: Daily chess puzzles with rewards
- **Social Features**: Friends list, direct messaging, and social sharing
- **Achievements System**: Unlock badges and titles for accomplishments
- **Theme Customization**: Custom board and piece designs

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgements

- [Chess.js](https://github.com/jhlywa/chess.js) for the core chess logic
- [Socket.io](https://socket.io/) for real-time communication
- [MongoDB](https://www.mongodb.com/) for database services
- All contributors and testers who helped make Chess Universe a reality 