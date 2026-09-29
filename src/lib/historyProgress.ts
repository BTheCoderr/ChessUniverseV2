import type { FamousGame } from "./famousGames";

export type HistoryMedal = "replay" | "historical" | "rewrite";

export type LegendProgress = {
  replay: boolean;
  historical: boolean;
  rewrite: boolean;
  attempts: number;
};

export type HistoryProgress = Record<FamousGame["id"], LegendProgress>;

export const HISTORY_PROGRESS_KEY = "chess-universe-legends-progress-v1";

export function emptyHistoryProgress(): HistoryProgress {
  return {
    opera: { replay: false, historical: false, rewrite: false, attempts: 0 },
    immortal: { replay: false, historical: false, rewrite: false, attempts: 0 },
    century: { replay: false, historical: false, rewrite: false, attempts: 0 },
  };
}

export function normalizeHistoryProgress(value: unknown): HistoryProgress {
  const empty = emptyHistoryProgress();
  if (!value || typeof value !== "object") return empty;

  for (const id of Object.keys(empty) as FamousGame["id"][]) {
    const candidate = (value as Record<string, unknown>)[id];
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    empty[id] = {
      replay: record.replay === true,
      historical: record.historical === true,
      rewrite: record.rewrite === true,
      attempts: typeof record.attempts === "number" && Number.isFinite(record.attempts)
        ? Math.max(0, Math.floor(record.attempts))
        : 0,
    };
  }

  return empty;
}

export function awardHistoryMedal(
  progress: HistoryProgress,
  gameId: FamousGame["id"],
  medal: HistoryMedal
): HistoryProgress {
  if (progress[gameId][medal]) return progress;
  return {
    ...progress,
    [gameId]: {
      ...progress[gameId],
      [medal]: true,
    },
  };
}

export function recordHistoryAttempt(
  progress: HistoryProgress,
  gameId: FamousGame["id"]
): HistoryProgress {
  return {
    ...progress,
    [gameId]: {
      ...progress[gameId],
      attempts: progress[gameId].attempts + 1,
    },
  };
}

export function medalCount(progress: HistoryProgress) {
  return Object.values(progress).reduce(
    (total, item) => total + Number(item.replay) + Number(item.historical) + Number(item.rewrite),
    0
  );
}

export function gameMedalCount(progress: HistoryProgress, gameId: FamousGame["id"]) {
  const item = progress[gameId];
  return Number(item.replay) + Number(item.historical) + Number(item.rewrite);
}

export function rewriteChallengeComplete(branchMoveCount: number, firstMoveWasHistorical: boolean, gameOver = false) {
  if (firstMoveWasHistorical) return false;
  // A five-ply branch means the player has made three decisions with two AI replies.
  return gameOver || branchMoveCount >= 5;
}
