import { ACADEMY_PLACEMENT_KEY } from "./academyPlacement";
import { ACADEMY_PROGRESS_KEY } from "./academyProgress";
import { ACADEMY_ACTIVITY_KEY, ACADEMY_REVIEW_KEY } from "./academyReviewState";
import { PIECE_SCHOOL_PROGRESS_KEY } from "./pieceSchools";
import { RESPONSE_PROGRESS_KEY } from "./opponentResponseLessons";
import { ENDGAME_PROGRESS_KEY } from "./endgameLessons";
import { PUZZLE_PROGRESS_KEY } from "./puzzles";
import { MULTI_MOVE_PROGRESS_KEY } from "./multiMovePuzzles";

export const ACADEMY_EXPORT_VERSION = 1;

export const ACADEMY_STORAGE_KEYS = [
  ACADEMY_PLACEMENT_KEY,
  ACADEMY_PROGRESS_KEY,
  ACADEMY_REVIEW_KEY,
  ACADEMY_ACTIVITY_KEY,
  PIECE_SCHOOL_PROGRESS_KEY,
  RESPONSE_PROGRESS_KEY,
  ENDGAME_PROGRESS_KEY,
  PUZZLE_PROGRESS_KEY,
  MULTI_MOVE_PROGRESS_KEY,
] as const;

export type AcademyExport = {
  version: number;
  exportedAt: string;
  entries: Record<string, unknown>;
};

export function buildAcademyExport(): AcademyExport {
  const entries: Record<string, unknown> = {};

  if (typeof window !== "undefined") {
    for (const key of ACADEMY_STORAGE_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;
      try {
        entries[key] = JSON.parse(raw);
      } catch {
        entries[key] = raw;
      }
    }
  }

  return {
    version: ACADEMY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

export function parseAcademyImport(value: unknown): AcademyExport {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("That file is not a Chess Universe Academy export.");
  }

  const candidate = value as Partial<AcademyExport>;
  if (candidate.version !== ACADEMY_EXPORT_VERSION) {
    throw new Error("This Academy export version is not supported.");
  }
  if (!candidate.entries || typeof candidate.entries !== "object" || Array.isArray(candidate.entries)) {
    throw new Error("The Academy export is missing its progress data.");
  }

  const allowed = new Set<string>(ACADEMY_STORAGE_KEYS);
  const entries: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(candidate.entries)) {
    if (allowed.has(key)) entries[key] = entry;
  }

  return {
    version: ACADEMY_EXPORT_VERSION,
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(),
    entries,
  };
}

export function importAcademyExport(data: AcademyExport) {
  if (typeof window === "undefined") return;
  for (const key of ACADEMY_STORAGE_KEYS) {
    if (!(key in data.entries)) continue;
    window.localStorage.setItem(key, JSON.stringify(data.entries[key]));
  }
}

export function resetAcademyProgress() {
  if (typeof window === "undefined") return;
  for (const key of ACADEMY_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}
