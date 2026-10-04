export type Puzzle = {
  id: string;
  title: string;
  prompt: string;
  fen: string;
  solution: string[];
  wrongMove: string;
  success: string;
};

export const puzzles: Puzzle[] = [
  {
    id: "back-rank",
    title: "Back-rank finish",
    prompt: "White to move. Find the forcing finish.",
    fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    solution: ["d1d8"],
    wrongMove: "Look for a forcing rook move. The king has very little room, so checks should be calculated first.",
    success: "Correct. Rd8+ uses the trapped king and forces the issue on the back rank.",
  },
  {
    id: "queen-defense",
    title: "Defend the queen threat",
    prompt: "Black to move. Do not chase the queen blindly — find the defensive move that keeps your rook safe.",
    fen: "3r2k1/5ppp/8/8/3Q4/8/5PPP/6K1 b - - 0 1",
    solution: ["d8d4"],
    wrongMove: "That line gives White the tactical response. Before attacking the queen, check whether your rook remains protected after White replies.",
    success: "Correct. You solved the defensive idea instead of assuming the rook should simply attack the queen.",
  },
];
