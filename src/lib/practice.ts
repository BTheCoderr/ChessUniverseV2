export type PracticeMode = "local" | "ai";
export type PracticeColor = "w" | "b";

export const PRACTICE_TIME_OPTIONS = [
  { minutes: 0, label: "No timer" },
  { minutes: 5, label: "5 min" },
  { minutes: 10, label: "10 min" },
  { minutes: 15, label: "15 min" },
] as const;

export function initialClocks(minutes: number) {
  const seconds = Math.max(0, Math.floor(minutes * 60));
  return { w: seconds, b: seconds };
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function practiceMoveLabel(index: number, color: PracticeColor) {
  return color === "b"
    ? `${Math.floor(index / 2) + 1}...`
    : `${Math.floor(index / 2) + 2}.`;
}

export function practiceUndoPlies(
  mode: PracticeMode,
  thinking: boolean,
  turn: PracticeColor,
  moveCount: number
) {
  if (moveCount <= 0) return 0;
  if (mode === "local") return 1;

  // If Stockfish has not answered yet, only undo the player's move.
  if (thinking || turn === "w") return 1;

  // Once Stockfish has replied, undo the full player + computer round.
  return Math.min(2, moveCount);
}
