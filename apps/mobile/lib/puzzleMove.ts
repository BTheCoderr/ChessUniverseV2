export type PromotionPiece = "q" | "r" | "b" | "n";

/**
 * Puzzle solutions are UCI strings. A promotion solution carries a fifth
 * character ("a7a8q"), while a tapped move is only from + to squares.
 * Compare the squares and return the promotion piece the solution expects.
 */
export function matchExpectedMove(from: string, to: string, expected: string): { ok: boolean; promotion: PromotionPiece } {
  const normalized = expected.trim().toLowerCase();
  const suffix = normalized.slice(4, 5);
  const promotion: PromotionPiece = suffix === "r" || suffix === "b" || suffix === "n" ? suffix : "q";
  return { ok: normalized.slice(0, 4) === `${from}${to}`.toLowerCase(), promotion };
}
