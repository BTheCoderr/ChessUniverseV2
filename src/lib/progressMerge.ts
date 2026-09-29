import {
  emptyHistoryProgress,
  normalizeHistoryProgress,
  type HistoryProgress,
} from "./historyProgress.ts";
import { normalizePuzzleProgress } from "./puzzles.ts";

export function mergeHistoryProgress(local: unknown, remote: unknown): HistoryProgress {
  const left = normalizeHistoryProgress(local);
  const right = normalizeHistoryProgress(remote);
  const merged = emptyHistoryProgress();

  for (const id of Object.keys(merged) as Array<keyof HistoryProgress>) {
    merged[id] = {
      replay: left[id].replay || right[id].replay,
      historical: left[id].historical || right[id].historical,
      rewrite: left[id].rewrite || right[id].rewrite,
      attempts: Math.max(left[id].attempts, right[id].attempts),
    };
  }

  return merged;
}

export function mergePuzzleProgress(local: unknown, remote: unknown) {
  return normalizePuzzleProgress([
    ...normalizePuzzleProgress(local),
    ...normalizePuzzleProgress(remote),
  ]);
}
