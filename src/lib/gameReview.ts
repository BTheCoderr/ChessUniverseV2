import { Chess } from "chess.js";
import { analyzePosition } from "./stockfish.ts";
import { buildUniversePosition, type StoredGame } from "./gameLibrary.ts";

export type MoveGrade = "Best" | "Good" | "Inaccuracy" | "Mistake" | "Blunder";

export type ReviewedMove = {
  index: number;
  san: string;
  color: "w" | "b";
  grade: MoveGrade;
  cpLoss: number;
  bestMove: string;
  bestSan: string;
  bestLineSan: string[];
  explanation: string;
  reviewCue: string;
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

function principalVariationSan(position: Chess, pv: string[], maxPlies = 4) {
  const copy = new Chess(position.fen());
  const line: string[] = [];

  for (const uci of pv.slice(0, maxPlies)) {
    try {
      const move = copy.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] ?? "q",
      });
      line.push(move.san);
    } catch {
      break;
    }
  }

  return line;
}

function reviewCueFor(bestSan: string) {
  if (bestSan.includes("#")) {
    return "The engine found a mating move, so every non-mating alternative deserves extra scrutiny.";
  }
  if (bestSan.includes("+")) {
    return "The preferred move gives check, which forces the opponent to respond before continuing their own plan.";
  }
  if (bestSan.includes("x")) {
    return "The preferred move is a capture, so compare the material and tactical consequences before choosing a quieter move.";
  }
  if (bestSan.startsWith("O-O")) {
    return "The engine prefers castling here, pointing to king safety and rook activation as the immediate priority.";
  }
  if (/^[NBRQK]/.test(bestSan)) {
    return "The preferred move improves or repositions a piece. Compare the new square, targets, and opponent replies.";
  }
  return "The preferred move is a pawn move. Look at what it changes permanently: space, structure, files, diagonals, and piece squares.";
}

function explainReview(grade: MoveGrade, cpLoss: number, bestSan: string, line: string[]) {
  const lineText = line.length > 0 ? ` A sample engine line begins ${line.join(" ")}.` : "";

  if (grade === "Best") {
    return `Your move preserved the engine's preferred evaluation. Stockfish's first choice was ${bestSan}.${lineText}`;
  }

  if (cpLoss >= 90000) {
    return `The move changed a mating evaluation. Stockfish preferred ${bestSan}.${lineText}`;
  }

  const pawns = Math.max(0.01, cpLoss / 100).toFixed(cpLoss < 100 ? 2 : 1);
  return `Stockfish preferred ${bestSan}; your move gave up about ${pawns} pawn-equivalents of evaluation at this search depth.${lineText}`;
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
  const grade = gradeMove(cpLoss, matchedBestMove);
  const bestSan = bestMoveSan(before, beforeAnalysis.bestMove);
  const bestLineSan = principalVariationSan(before, beforeAnalysis.pv);

  return {
    index,
    san: move.san,
    color: move.color,
    grade,
    cpLoss,
    bestMove: beforeAnalysis.bestMove,
    bestSan,
    bestLineSan,
    explanation: explainReview(grade, cpLoss, bestSan, bestLineSan),
    reviewCue: reviewCueFor(bestSan),
    scoreBefore: beforeAnalysis.scoreCp,
    scoreAfter: moverScoreAfter,
  };
}
