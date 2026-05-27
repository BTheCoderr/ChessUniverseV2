const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../node_modules/stockfish/src');
const publicDir = path.join(__dirname, '../public');

const files = [
  ['stockfish-nnue-16-single.js', 'stockfish.js'],
  ['stockfish-nnue-16-single.wasm', 'stockfish-nnue-16-single.wasm'],
];

for (const [src, dest] of files) {
  fs.copyFileSync(path.join(srcDir, src), path.join(publicDir, dest));
}

console.log('Stockfish engine files copied to public/');
