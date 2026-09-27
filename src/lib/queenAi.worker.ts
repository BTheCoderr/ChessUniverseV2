import { chooseQueenMove, type QueenDifficulty } from "./queenAi.ts";
import type { Position, QueenLevel } from "./evolvingQueens";

self.onmessage = (event: MessageEvent<{ position: Position; level: QueenLevel; difficulty: QueenDifficulty }>) => {
  try {
    const { position, level, difficulty } = event.data;
    self.postMessage({ move: chooseQueenMove(position, level, difficulty) });
  } catch {
    self.postMessage({ error: "The queen opponent could not find a move. Try again." });
  }
};
