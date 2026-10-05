import { Chess, type Move, type Square } from "chess.js";

export type MobileMove = {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
};

export function createGame(fen?: string) {
  return fen ? new Chess(fen) : new Chess();
}

export function legalMoves(game: Chess, square: Square): Move[] {
  return game.moves({ square, verbose: true });
}

export function playMove(game: Chess, move: MobileMove) {
  try {
    return game.move({ ...move, promotion: move.promotion ?? "q" });
  } catch {
    return null;
  }
}

export function gameStatus(game: Chess) {
  if (game.isCheckmate()) return "checkmate" as const;
  if (game.isDraw()) return "draw" as const;
  if (game.inCheck()) return "check" as const;
  return "playing" as const;
}
