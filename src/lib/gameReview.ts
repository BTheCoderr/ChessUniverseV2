import { Chess } from "chess.js";
import { analyzePosition } from "./stockfish";
import { buildUniversePosition, type StoredGame } from "./gameLibrary";

export type MoveGrade = "Best" | "Good" | "Inaccuracy" | "Mistake" | "Blunder";

export type ReviewedMove = {
  index: number;
  san: string;
  color: "w" | "b";
  grade: MoveGrade;
  cpLoss: number;
  bestMove: string;
  bestSan: string;
  scoreBefore: number;
  scoreAfter: number;
};

export function gradeMove(cpLoss: number, matchedBestMove = false): MoveGrade {
  if (matchedBestMove || cpLoss <= 15) return "Best";
  if (cpLoss <= 50) return "Good";
  if (cpLoss <= 100) return "Inaccuracy";
  if (cpLoss <= 220) return "Mistake";
  return "Blunder";
}

export function uciForMove(from: string, to: string, promotion?: string) {
  return `${from}${to}${promotion ?? ""}`;
}

function bestMoveSan(position: Chess, uci: string) {
  try {
    const copy = new Chess(position.fen());
    return copy.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] ?? "q",
    }).san;
  } catch {
    return uci;
  }
}

export async function reviewStoredMove(game: StoredGame, index: number, depth = 6): Promise<ReviewedMove> {
  const move = game.moves[index];
  if (!move) throw new Error("Move not found.");

  const before = buildUniversePosition(game.moves, index);
  const beforeAnalysis = await analyzePosition(before, depth);
  const actualUci = uciForMove(move.from, move.to, move.promotion);

  const after = new Chess(before.fen());
  after.move({
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
  });

  let moverScoreAfter = 0;
  if (after.isCheckmate()) {
    moverScoreAfter = 100000;
  } else if (after.isDraw()) {
    moverScoreAfter = 0;
  } else {
    const afterAnalysis = await analyzePosition(after, depth);
    moverScoreAfter = -afterAnalysis.scoreCp;
  }

  const rawLoss = beforeAnalysis.scoreCp - moverScoreAfter;
  const cpLoss = Math.max(0, Math.min(100000, Math.round(rawLoss)));
  const matchedBestMove = actualUci === beforeAnalysis.bestMove;

  return {
    index,
    san: move.san,
    color: move.color,
    grade: gradeMove(cpLoss, matchedBestMove),
    cpLoss,
    bestMove: beforeAnalysis.bestMove,
    bestSan: bestMoveSan(before, beforeAnalysis.bestMove),
    scoreBefore: beforeAnalysis.scoreCp,
    scoreAfter: moverScoreAfter,
  };
}
