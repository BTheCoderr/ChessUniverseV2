// Chess Universe - Custom Chess Rules
// This file extends the chess.js library to handle custom queen movements for different levels
(function () {
  let chessRulesCurrentLevel = 1;

  function setGameLevel(level) {
    chessRulesCurrentLevel = level;
    console.log(`Game level set to ${level}`);
  }

  function getGameLevel() {
    return chessRulesCurrentLevel;
  }

  function isValidQueenMove(chess, from, to) {
    const piece = chess.get(from);

    if (piece.type !== 'q' || chessRulesCurrentLevel === 1) {
      return null;
    }

    const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRank = parseInt(from.charAt(1)) - 1;
    const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRank = parseInt(to.charAt(1)) - 1;

    const fileDiff = Math.abs(toFile - fromFile);
    const rankDiff = Math.abs(toRank - fromRank);

    switch (chessRulesCurrentLevel) {
      case 2: {
        const isDiagonal = fileDiff === rankDiff;
        const isKingMove = fileDiff <= 1 && rankDiff <= 1;
        const isKnightMove = (fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1);
        const isRookMove = (fileDiff === 0 && rankDiff > 0) || (rankDiff === 0 && fileDiff > 0);

        if (isRookMove && !isDiagonal && !isKingMove && !isKnightMove) {
          return false;
        }

        if (isDiagonal && fileDiff > 1) {
          const fileDir = toFile > fromFile ? 1 : -1;
          const rankDir = toRank > fromRank ? 1 : -1;

          for (let i = 1; i < fileDiff; i++) {
            const file = String.fromCharCode(fromFile + fileDir * i + 'a'.charCodeAt(0));
            const rank = fromRank + rankDir * i + 1;
            const square = file + rank;

            if (chess.get(square)) {
              return false;
            }
          }
        }

        return isDiagonal || isKingMove || isKnightMove;
      }

      case 3: {
        const isHorizontal = rankDiff === 0 && fileDiff > 0;
        const isVertical = fileDiff === 0 && rankDiff > 0;
        const isKingMove3 = fileDiff <= 1 && rankDiff <= 1;
        const isKnightMove3 = (fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1);
        const isBishopMove = fileDiff === rankDiff && fileDiff > 0;

        if (isBishopMove && !isHorizontal && !isVertical && !isKingMove3 && !isKnightMove3) {
          return false;
        }

        if (isHorizontal) {
          const dir = toFile > fromFile ? 1 : -1;
          for (let i = 1; i < fileDiff; i++) {
            const file = String.fromCharCode(fromFile + dir * i + 'a'.charCodeAt(0));
            const square = file + (fromRank + 1);

            if (chess.get(square)) {
              return false;
            }
          }
        } else if (isVertical) {
          const dir = toRank > fromRank ? 1 : -1;
          for (let i = 1; i < rankDiff; i++) {
            const file = String.fromCharCode(fromFile + 'a'.charCodeAt(0));
            const rank = fromRank + dir * i + 1;
            const square = file + rank;

            if (chess.get(square)) {
              return false;
            }
          }
        }

        return isHorizontal || isVertical || isKingMove3 || isKnightMove3;
      }

      case 4: {
        const isQueenMove = fileDiff === rankDiff || fileDiff === 0 || rankDiff === 0;
        const isKnightMove4 = (fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1);

        if (fileDiff === rankDiff && fileDiff > 1) {
          const fileDir = toFile > fromFile ? 1 : -1;
          const rankDir = toRank > fromRank ? 1 : -1;

          for (let i = 1; i < fileDiff; i++) {
            const file = String.fromCharCode(fromFile + fileDir * i + 'a'.charCodeAt(0));
            const rank = fromRank + rankDir * i + 1;
            const square = file + rank;

            if (chess.get(square)) {
              return false;
            }
          }
        } else if (fileDiff > 0 && rankDiff === 0) {
          const dir = toFile > fromFile ? 1 : -1;
          for (let i = 1; i < fileDiff; i++) {
            const file = String.fromCharCode(fromFile + dir * i + 'a'.charCodeAt(0));
            const square = file + (fromRank + 1);

            if (chess.get(square)) {
              return false;
            }
          }
        } else if (fileDiff === 0 && rankDiff > 0) {
          const dir = toRank > fromRank ? 1 : -1;
          for (let i = 1; i < rankDiff; i++) {
            const file = String.fromCharCode(fromFile + 'a'.charCodeAt(0));
            const rank = fromRank + dir * i + 1;
            const square = file + rank;

            if (chess.get(square)) {
              return false;
            }
          }
        }

        return isQueenMove || isKnightMove4;
      }

      default:
        return null;
    }
  }

  function overrideChessJsMoves(chess) {
    const originalMove = chess.move;

    chess.move = function(move, options) {
      if (typeof move === 'string') {
        move = {
          from: move.substring(0, 2),
          to: move.substring(2, 4),
          promotion: move.substring(4, 5)
        };
      }

      if (move.from && move.to) {
        const piece = this.get(move.from);

        if (piece && piece.type === 'q') {
          const isValid = isValidQueenMove(this, move.from, move.to);

          if (isValid === false) {
            return null;
          }
        }
      }

      return originalMove.call(this, move, options);
    };

    return chess;
  }

  window.ChessRules = {
    setGameLevel,
    getGameLevel,
    overrideChessJsMoves
  };
})();
