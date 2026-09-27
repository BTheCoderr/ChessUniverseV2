import { applyLegalMove, inCheck, legalMoves, pieceAt, type Move, type Position, type QueenLevel } from "./evolvingQueens.ts";

export type QueenDifficulty = "easy" | "medium" | "hard";
export const SEARCH_LIMITS = {
  easy: { depth: 1, nodes: 600, milliseconds: 350 },
  medium: { depth: 2, nodes: 5000, milliseconds: 1000 },
  hard: { depth: 4, nodes: 24000, milliseconds: 2200 },
} as const;
const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluate(position: Position, level: QueenLevel): number {
  let score = 0;
  position.board.forEach((piece, i) => {
    if (!piece) return;
    const x = i % 8, y = Math.floor(i / 8);
    const centrality = 7 - Math.abs(x - 3.5) - Math.abs(y - 3.5);
    const advancement = piece.color === "w" ? 6 - y : y - 1;
    const material = piece.type === "q" && level > 1 ? (level === 4 ? 1200 : 950) : values[piece.type];
    const activity = piece.type === "p" ? advancement * 9 + centrality * 3 : piece.type === "k" ? 0 : centrality * 8;
    score += (piece.color === position.turn ? 1 : -1) * (material + activity);
  });
  return score;
}

function ordered(position: Position, moves: Move[]): Move[] {
  const priority = (move: Move) => (move.promotion ? 1000 : 0) + (move.enPassant ? 100 : 0) + (pieceAt(position, move.to) ? 10 * values[pieceAt(position, move.to)!.type] - values[pieceAt(position, move.from)!.type] : 0);
  return [...moves].sort((a, b) => priority(b) - priority(a));
}

// Iterative deepening keeps the last fully searched result when the budget expires.
export function chooseQueenMove(position: Position, level: QueenLevel, difficulty: QueenDifficulty): Move | null {
  if (position.halfmoves >= 100) return null;
  const roots = ordered(position, legalMoves(position, level));
  if (!roots.length) return null;
  const limits = SEARCH_LIMITS[difficulty];
  const deadline = performance.now() + limits.milliseconds;
  let nodes = 0;
  const exhausted = Symbol("search budget");
  function search(p: Position, depth: number, alpha: number, beta: number, ply: number): number {
    if (++nodes > limits.nodes || performance.now() > deadline) throw exhausted;
    const moves = legalMoves(p, level);
    if (!moves.length) return inCheck(p, p.turn, level) ? -100000 + ply : 0;
    if (p.halfmoves >= 100) return 0;
    if (depth === 0) return evaluate(p, level);
    let best = -Infinity;
    for (const move of ordered(p, moves)) {
      const score = -search(applyLegalMove(p, move), depth - 1, -beta, -alpha, ply + 1);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = roots[0];
  for (let depth = 1; depth <= limits.depth; depth++) {
    let candidate = best, score = -Infinity;
    try {
      for (const move of [best, ...roots.filter((move) => move !== best)]) {
        const result = -search(applyLegalMove(position, move), depth - 1, -Infinity, -score, 1);
        if (result > score) { score = result; candidate = move; }
      }
      best = candidate;
    } catch (error) {
      if (error !== exhausted) throw error;
      break;
    }
  }
  return best;
}
