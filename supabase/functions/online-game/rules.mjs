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
