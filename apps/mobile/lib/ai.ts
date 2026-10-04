import { Chess, type Move } from "chess.js";

export type AiLevel = "beginner" | "easy" | "medium" | "hard";
export const aiLevels: { id: AiLevel; label: string; description: string; delay: number }[] = [
  { id: "beginner", label: "Beginner", description: "Learning pace · occasional mistakes", delay: 1200 },
  { id: "easy", label: "Easy", description: "Casual opponent", delay: 900 },
  { id: "medium", label: "Medium", description: "Looks for captures and checks", delay: 700 },
  { id: "hard", label: "Hard", description: "Stronger tactical choices", delay: 550 },
];

const values: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function score(move: Move) {
  let total = move.captured ? values[move.captured] ?? 0 : 0;
  if (move.san.includes("+")) total += 80;
  if (move.san.includes("#")) total += 100000;
  if (move.promotion) total += values[move.promotion] ?? 0;
  return total;
}

export function chooseAiMove(game: Chess, level: AiLevel): Move | null {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  if (level === "beginner") return moves[Math.floor(Math.random() * moves.length)] ?? null;
  const ranked = [...moves].sort((a, b) => score(b) - score(a));
  if (level === "easy") return Math.random() < 0.55 ? ranked[0] : moves[Math.floor(Math.random() * moves.length)];
  if (level === "medium") return ranked[Math.floor(Math.random() * Math.min(3, ranked.length))] ?? ranked[0];
  return ranked[0];
}
