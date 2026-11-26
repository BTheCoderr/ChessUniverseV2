import { WEB_PUZZLES } from "@/lib/puzzleData";

export type Puzzle = {
  id: string;
  title: string;
  level: string;
  theme: string;
  prompt: string;
  hint: string;
  fen: string;
  /** UCI moves; the first entry is the move the player must find. */
  solution: string[];
  wrongMove: string;
  success: string;
};

/**
 * The native set uses the website's curated offline puzzles (same ids, so
 * synced puzzle progress is shared with chessuniverse.netlify.app) plus the
 * original native back-rank exercise.
 */
export const puzzles: Puzzle[] = [
  ...WEB_PUZZLES.map((p) => ({
    id: p.id,
    title: p.title,
    level: p.level,
    theme: p.theme,
    prompt: p.goal,
    hint: p.hint,
    fen: p.fen,
    solution: [p.solution],
    wrongMove: p.mistakeLesson,
    success: `${p.explanation} ${p.takeaway}`,
  })),
  {
    id: "back-rank",
    title: "Back-rank finish",
    level: "Easy",
    theme: "Checkmate",
    prompt: "White to move. Find the forcing finish.",
    hint: "The black king is boxed in by its own pawns. Which rook move gives check on the back rank?",
    fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    solution: ["d1d8"],
    wrongMove: "Look for a forcing rook move. The king has very little room, so checks should be calculated first.",
    success: "Correct. Rd8# uses the king's own pawns as the cage — a classic back-rank mate.",
  },
];
