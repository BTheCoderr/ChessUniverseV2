import { Chess, type Move, type Square } from "chess.js";

export type MobileMove = {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
};

export function createGame(fen?: string) {
  return fen ? new Chess(fen) : new Chess();
}

/** Chess Universe's signature ruleset begins with Black, unlike FIDE chess. */
export function createUniverseGame() {
  const game = new Chess();
  game.load(game.fen().replace(" w ", " b "));
  return game;
}

/** Rebuild from the Black-first position to preserve turn order when undoing. */
export function replayUniverseMoves(moves: ReadonlyArray<Pick<Move, "from" | "to" | "promotion">>) {
  const game = createUniverseGame();
  for (const move of moves) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion });
  }
  return game;
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
