import type { Square } from "chess.js";

export const HORSE_START: Square = "e4";
export const QUEEN_TARGETS = [4, 2, 1, 0] as const;

export function initialQueens(): Square[] {
  return [6, 7, 8].flatMap((rank) =>
    Array.from({ length: 8 }, (_, file) => `${String.fromCharCode(97 + file)}${rank}` as Square)
  );
}

export function legalHorseCaptures(horse: Square, queens: readonly Square[]): Square[] {
  const file = horse.charCodeAt(0) - 97;
  const rank = Number(horse[1]);
  return queens.filter((square) => {
    const dx = Math.abs(square.charCodeAt(0) - 97 - file);
    const dy = Math.abs(Number(square[1]) - rank);
    return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
  });
}
