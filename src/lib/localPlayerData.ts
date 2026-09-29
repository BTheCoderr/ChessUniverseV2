import { FEEDBACK_SETTINGS_KEY } from "./feedback";
import { GAME_LIBRARY_KEY, GAME_LIBRARY_TOMBSTONES_KEY } from "./gameLibrary";
import { HISTORY_PROGRESS_KEY } from "./historyProgress";
import { PUZZLE_PROGRESS_KEY } from "./puzzles";

export const LOCAL_PLAYER_OWNER_KEY = "chess-universe-local-player-owner-v1";

const PLAYER_SCOPED_KEYS = [
  GAME_LIBRARY_KEY,
  GAME_LIBRARY_TOMBSTONES_KEY,
  HISTORY_PROGRESS_KEY,
  PUZZLE_PROGRESS_KEY,
  FEEDBACK_SETTINGS_KEY,
  "chess-universe-practice-v2",
  "chess-universe-online-game",
  "chess-universe-learning-help",
];

export function prepareLocalDataForUser(userId: string) {
  if (typeof window === "undefined" || !userId) return false;

  try {
    const owner = window.localStorage.getItem(LOCAL_PLAYER_OWNER_KEY);
    const switched = Boolean(owner && owner !== userId);

    if (switched) {
      for (const key of PLAYER_SCOPED_KEYS) {
        window.localStorage.removeItem(key);
      }
    }

    window.localStorage.setItem(LOCAL_PLAYER_OWNER_KEY, userId);
    return switched;
  } catch {
    // Private browsing may block localStorage; account data still remains protected by RLS.
    return false;
  }
}

export function clearLocalPlayerData() {
  if (typeof window === "undefined") return;

  try {
    for (const key of PLAYER_SCOPED_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.localStorage.removeItem(LOCAL_PLAYER_OWNER_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}
