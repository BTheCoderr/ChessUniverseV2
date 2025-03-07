// Chess Universe - Custom Chess Rules
// This file extends the chess.js library to handle custom queen movements for different levels

// Current game level
let currentLevel = 1;

// Set the current game level
function setGameLevel(level) {
  currentLevel = level;
  console.log(`Game level set to ${level}`);
}

// Get the current game level
function getGameLevel() {
  return currentLevel;
}

// Custom move validation for queens based on level
function isValidQueenMove(chess, from, to) {
  // Get the piece at the 'from' position
  const piece = chess.get(from);
  
  // If it's not a queen or it's level 1, use default chess.js validation
  if (piece.type !== 'q' || currentLevel === 1) {
    return null; // null means use default chess.js validation
  }
  
  // Parse the square notations to get coordinates
  const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
  const fromRank = parseInt(from.charAt(1)) - 1;
  const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
  const toRank = parseInt(to.charAt(1)) - 1;
  
  // Calculate the differences
  const fileDiff = Math.abs(toFile - fromFile);
  const rankDiff = Math.abs(toRank - fromRank);
  
  // Check if the move is valid based on the current level
  switch (currentLevel) {
    case 2:
      // Level 2: Queen moves like Bishop, King, or Knight (not Rook)
      // Bishop-like move: diagonal movement
      const isDiagonal = fileDiff === rankDiff;
      
      // King-like move: one square in any direction
      const isKingMove = fileDiff <= 1 && rankDiff <= 1;
      
      // Knight-like move: L-shape (2 squares in one direction, 1 in the other)
      const isKnightMove = (fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1);
      
      // Not allowed: Rook-like move (horizontal or vertical)
      const isRookMove = (fileDiff === 0 && rankDiff > 0) || (rankDiff === 0 && fileDiff > 0);
      
      if (isRookMove && !isDiagonal && !isKingMove && !isKnightMove) {
        return false; // Invalid move for Level 2
      }
      
      // Check for pieces in the path (for diagonal moves)
      if (isDiagonal && fileDiff > 1) {
        const fileDir = toFile > fromFile ? 1 : -1;
        const rankDir = toRank > fromRank ? 1 : -1;
        
        for (let i = 1; i < fileDiff; i++) {
          const file = String.fromCharCode(fromFile + fileDir * i + 'a'.charCodeAt(0));
          const rank = fromRank + rankDir * i + 1;
          const square = file + rank;
          
          if (chess.get(square)) {
            return false; // Path is blocked
          }
        }
      }
      
      return isDiagonal || isKingMove || isKnightMove;
      
    case 3:
      // Level 3: Queen moves like Rook, King, or Knight (not Bishop)
      // Rook-like move: horizontal or vertical movement
      const isHorizontal = rankDiff === 0 && fileDiff > 0;
      const isVertical = fileDiff === 0 && rankDiff > 0;
      
      // King-like move: one square in any direction
      const isKingMove3 = fileDiff <= 1 && rankDiff <= 1;
      
      // Knight-like move: L-shape
      const isKnightMove3 = (fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1);
      
      // Not allowed: Bishop-like move (diagonal)
      const isBishopMove = fileDiff === rankDiff && fileDiff > 0;
      
      if (isBishopMove && !isHorizontal && !isVertical && !isKingMove3 && !isKnightMove3) {
        return false; // Invalid move for Level 3
      }
      
      // Check for pieces in the path (for horizontal and vertical moves)
      if (isHorizontal) {
        const dir = toFile > fromFile ? 1 : -1;
        for (let i = 1; i < fileDiff; i++) {
          const file = String.fromCharCode(fromFile + dir * i + 'a'.charCodeAt(0));
          const square = file + (fromRank + 1);
          
          if (chess.get(square)) {
            return false; // Path is blocked
          }
        }
      } else if (isVertical) {
        const dir = toRank > fromRank ? 1 : -1;
        for (let i = 1; i < rankDiff; i++) {
          const file = String.fromCharCode(fromFile + 'a'.charCodeAt(0));
          const rank = fromRank + dir * i + 1;
          const square = file + rank;
          
          if (chess.get(square)) {
            return false; // Path is blocked
          }
        }
      }
      
      return isHorizontal || isVertical || isKingMove3 || isKnightMove3;
      
    case 4:
      // Level 4: Queen moves like Rook, Bishop, King, and Knight (all moves)
      // This is a superset of standard queen + knight moves
      
      // Standard queen move: horizontal, vertical, or diagonal
      const isQueenMove = fileDiff === rankDiff || fileDiff === 0 || rankDiff === 0;
      
      // Knight-like move: L-shape
      const isKnightMove4 = (fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1);
      
      // Check for pieces in the path (for horizontal, vertical, and diagonal moves)
      if (fileDiff === rankDiff && fileDiff > 1) {
        // Diagonal path
        const fileDir = toFile > fromFile ? 1 : -1;
        const rankDir = toRank > fromRank ? 1 : -1;
        
        for (let i = 1; i < fileDiff; i++) {
          const file = String.fromCharCode(fromFile + fileDir * i + 'a'.charCodeAt(0));
          const rank = fromRank + rankDir * i + 1;
          const square = file + rank;
          
          if (chess.get(square)) {
            return false; // Path is blocked
          }
        }
      } else if (fileDiff > 0 && rankDiff === 0) {
        // Horizontal path
        const dir = toFile > fromFile ? 1 : -1;
        for (let i = 1; i < fileDiff; i++) {
          const file = String.fromCharCode(fromFile + dir * i + 'a'.charCodeAt(0));
          const square = file + (fromRank + 1);
          
          if (chess.get(square)) {
            return false; // Path is blocked
          }
        }
      } else if (fileDiff === 0 && rankDiff > 0) {
        // Vertical path
        const dir = toRank > fromRank ? 1 : -1;
        for (let i = 1; i < rankDiff; i++) {
          const file = String.fromCharCode(fromFile + 'a'.charCodeAt(0));
          const rank = fromRank + dir * i + 1;
          const square = file + rank;
          
          if (chess.get(square)) {
            return false; // Path is blocked
          }
        }
      }
      
      return isQueenMove || isKnightMove4;
      
    default:
      return null; // Use default chess.js validation for unknown levels
  }
}

// Override the chess.js move validation
function overrideChessJsMoves(chess) {
  // Store the original move function
  const originalMove = chess.move;
  
  // Override the move function
  chess.move = function(move, options) {
    if (typeof move === 'string') {
      // Convert SAN move to move object
      move = {
        from: move.substring(0, 2),
        to: move.substring(2, 4),
        promotion: move.substring(4, 5)
      };
    }
    
    // If from and to are provided, check for custom queen moves
    if (move.from && move.to) {
      const piece = this.get(move.from);
      
      if (piece && piece.type === 'q') {
        const isValid = isValidQueenMove(this, move.from, move.to);
        
        if (isValid === false) {
          return null; // Invalid move according to custom rules
        }
      }
    }
    
    // Call the original move function
    return originalMove.call(this, move, options);
  };
  
  return chess;
}

// Export the functions
window.ChessRules = {
  setGameLevel,
  getGameLevel,
  overrideChessJsMoves
}; 