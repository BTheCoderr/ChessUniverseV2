import { Chess, type Color, type Square } from "chess.js";

export const PUZZLE_PROGRESS_KEY = "chess-universe-puzzles-v1";

export type Puzzle = {
  id: string;
  title: string;
  level: "Starter" | "Easy";
  fen: string;
  solution: string;
  goal: string;
  hint: string;
  explanation: string;
  expectsMate?: boolean;
};

export const OFFLINE_PUZZLES: Puzzle[] = [
  {
    id: "queen-mate-white",
    title: "Close the Net",
    level: "Starter",
    fen: "6k1/8/6KQ/8/8/8/8/8 w - - 0 1",
    solution: "h6g7",
    goal: "White to move. Find checkmate in one.",
    hint: "Bring the queen next to the king where your own king protects her.",
    explanation: "Qg7# covers every escape square while the king on g6 protects the queen.",
    expectsMate: true,
  },
  {
    id: "queen-mate-black",
    title: "Black Strikes",
    level: "Starter",
    fen: "8/8/8/8/8/6kq/8/6K1 b - - 0 1",
    solution: "h3g2",
    goal: "Black to move. Find checkmate in one.",
    hint: "The black king can protect the queen on the second rank.",
    explanation: "Qg2# checks the king on g1 and the black king on g3 protects the queen.",
    expectsMate: true,
  },
  {
    id: "win-the-queen",
    title: "Take the Gift",
    level: "Starter",
    fen: "4k3/8/8/3q4/2B5/8/8/4K3 w - - 0 1",
    solution: "c4d5",
    goal: "White to move. Win the hanging queen.",
    hint: "Look at the bishop on c4.",
    explanation: "Bxd5 simply captures the undefended queen.",
  },
  {
    id: "block-the-rook",
    title: "Stop the Check",
    level: "Easy",
    fen: "k3r3/8/8/8/8/3B4/8/4K3 w - - 0 1",
    solution: "d3e2",
    goal: "White is in check. Block the rook with the bishop.",
    hint: "The e-file needs one defender between the rook and your king.",
    explanation: "Be2 blocks the rook's line from e8 to e1.",
  },
  {
    id: "promotion",
    title: "New Queen",
    level: "Starter",
    fen: "7k/P7/8/8/8/8/8/4K3 w - - 0 1",
    solution: "a7a8q",
    goal: "White to move. Promote the pawn to a queen.",
    hint: "Push the pawn one more square.",
    explanation: "a8=Q turns the pawn into a queen.",
  },
];

export function puzzlePosition(puzzle: Puzzle) {
  return new Chess(puzzle.fen);
}

export function puzzleOrientation(puzzle: Puzzle): Color {
  return puzzlePosition(puzzle).turn();
}

export function puzzleMoveUci(from: Square, to: Square, promotion?: string) {
  return `${from}${to}${promotion ?? ""}`;
}

export function normalizePuzzleProgress(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const known = new Set(OFFLINE_PUZZLES.map((puzzle) => puzzle.id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
}
