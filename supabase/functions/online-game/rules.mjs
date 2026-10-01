export const BLACK_FIRST_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";

export function participantColor(game, userId) {
  if (game.white_id === userId) return "w";
  if (game.black_id === userId) return "b";
  return null;
}

export function validateMoveTurn(game, userId) {
  const color = participantColor(game, userId);
  if (!color) return "Not a participant";
  if (game.current_turn !== color) return "Not your turn";
  return null;
}

export function isUntimed(game) {
  return Number(game.time_control_minutes) === 0;
}


export const BATTLE_START_FENS = Object.freeze({
  classic: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b - - 0 1",
  cavalry: "rnnqkbbr/pppppppp/8/8/8/8/PPPPPPPP/RNNQKBBR b - - 0 1",
  fortress: "rbnqknbr/pppppppp/8/8/8/8/PPPPPPPP/RBNQKNBR b - - 0 1",
  crest_guard: "nrbqkbrn/pppppppp/8/8/8/8/PPPPPPPP/NRBQKBRN b - - 0 1",
  crown_wall: "qrbnknbr/pppppppp/8/8/8/8/PPPPPPPP/QRBNKNBR b - - 0 1",
  master_grid: "bnrqkrnb/pppppppp/8/8/8/8/PPPPPPPP/BNRQKRNB b - - 0 1",
});

export function startingFen(game) {
  if (game.variant !== "battle") return BLACK_FIRST_FEN;
  return BATTLE_START_FENS[game.battle_formation_key ?? ""] ?? game.fen;
}

export function positionKey(fen) {
  return String(fen).trim().split(/\s+/).slice(0, 4).join(" ");
}

export function isThreefoldPosition(fens) {
  if (!Array.isArray(fens) || fens.length === 0) return false;
  const target = positionKey(fens[fens.length - 1]);
  return fens.filter((fen) => positionKey(fen) === target).length >= 3;
}
