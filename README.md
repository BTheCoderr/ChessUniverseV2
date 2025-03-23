# Chess App

A feature-rich chess application with betting, tournaments, and a unique "Magic Horse" challenge.

## Features

- **Traditional Chess:** Play standard chess against opponents online
- **Betting System:** Place bets on your games or as a spectator
- **Tournament System:** Create and join tournaments with various formats
- **Magic Horse Challenge:** Unique chess puzzle mode with special rules
- **User Profiles:** Track your stats, rating, and achievements
- **Real-time Play:** Powered by Socket.IO for seamless gameplay

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** MongoDB (with Mongoose)
- **Real-time Communication:** Socket.IO
- **Authentication:** Passport.js

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/chess-app.git
cd chess-app
```

2. Install dependencies
```
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
PORT=3000
```

4. Start the development server
```
npm run dev
```

### Running with Docker

```
docker-compose up
```

## Game Modes

### Traditional Chess
Standard chess rules apply. Players can bet coins on the outcome.

### Magic Horse Challenge
A unique puzzle mode where you control only knights ("horses") and must capture all opponent queens within a certain number of moves.

## API Documentation

The API documentation is available at `/api-docs` when running the server.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details. 