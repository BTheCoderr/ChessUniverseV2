const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const publicDir = path.join(__dirname, 'public');

// Serve static files from the public directory
app.use(express.static(publicDir));

const routes = {
  '/': 'chess-standalone.html',
  '/standalone': 'chess-standalone.html',
  '/simple': 'simple-chess.html',
  '/start': 'start-game.html',
  '/launcher': 'index-launcher.html',
  '/full': 'index.html',
};

Object.entries(routes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(publicDir, file));
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Chess Universe test server running at http://localhost:${port}`);
  console.log('Routes:');
  console.log(`  http://localhost:${port}/          - Standalone chess (default)`);
  console.log(`  http://localhost:${port}/standalone - Standalone chess`);
  console.log(`  http://localhost:${port}/simple     - Simple chess`);
  console.log(`  http://localhost:${port}/start      - Game starter`);
  console.log(`  http://localhost:${port}/launcher   - Game launcher`);
  console.log(`  http://localhost:${port}/full       - Full app (needs MongoDB)`);
});
