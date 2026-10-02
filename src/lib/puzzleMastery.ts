export const PUZZLE_MASTERY_KEY = "chess-universe-puzzle-mastery-v1";
export const PUZZLE_STREAK_KEY = "chess-universe-puzzle-streak-v1";

export type PuzzleMasteryRecord = {
  puzzleId: string;
  solves: number;
  cleanSolves: number;
  misses: number;
  hints: number;
  mastery: 0 | 1 | 2 | 3;
  lastPlayedAt: string | null;
  nextReviewAt: string | null;
};

export type PuzzleMasteryState = Record<string, PuzzleMasteryRecord>;

export type PuzzleStreak = {
  current: number;
  best: number;
  lastSolveDate: string | null;
};

export type PuzzleSessionStats = {
  solved: number;
  firstTry: number;
  hints: number;
  misses: number;
};

export type PuzzleMasteryStatus = "new" | "learning" | "needs-review" | "mastered";

const DAY_MS = 86_400_000;

function boundedMastery(value: number): 0 | 1 | 2 | 3 {
  return Math.max(0, Math.min(3, Math.round(value))) as 0 | 1 | 2 | 3;
}

function isoDay(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextReviewIso(mastery: number, now: Date) {
  const delayDays = mastery >= 3 ? 7 : mastery === 2 ? 3 : mastery === 1 ? 1 : 0;
  return new Date(now.getTime() + delayDays * DAY_MS).toISOString();
}

export function normalizePuzzleMastery(value: unknown): PuzzleMasteryState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: PuzzleMasteryState = {};

  for (const [puzzleId, raw] of Object.entries(source)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const record = raw as Record<string, unknown>;
    const solves = typeof record.solves === "number" ? Math.max(0, Math.floor(record.solves)) : 0;
    const cleanSolves = typeof record.cleanSolves === "number" ? Math.max(0, Math.floor(record.cleanSolves)) : 0;
    const misses = typeof record.misses === "number" ? Math.max(0, Math.floor(record.misses)) : 0;
    const hints = typeof record.hints === "number" ? Math.max(0, Math.floor(record.hints)) : 0;
    const mastery = boundedMastery(typeof record.mastery === "number" ? record.mastery : 0);
    result[puzzleId] = {
      puzzleId,
      solves,
      cleanSolves: Math.min(cleanSolves, solves),
      misses,
      hints,
      mastery,
      lastPlayedAt: typeof record.lastPlayedAt === "string" ? record.lastPlayedAt : null,
      nextReviewAt: typeof record.nextReviewAt === "string" ? record.nextReviewAt : null,
    };
  }

  return result;
}

export function normalizePuzzleStreak(value: unknown): PuzzleStreak {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { current: 0, best: 0, lastSolveDate: null };
  }
  const raw = value as Record<string, unknown>;
  const current = typeof raw.current === "number" ? Math.max(0, Math.floor(raw.current)) : 0;
  const best = typeof raw.best === "number" ? Math.max(current, Math.floor(raw.best)) : current;
  return {
    current,
    best,
    lastSolveDate: typeof raw.lastSolveDate === "string" ? raw.lastSolveDate : null,
  };
}

export function recordPuzzleSolve(
  state: PuzzleMasteryState,
  puzzleId: string,
  options: { wrongAttempts: number; hintUsed: boolean; now?: Date }
): PuzzleMasteryState {
  const now = options.now ?? new Date();
  const current = state[puzzleId] ?? {
    puzzleId,
    solves: 0,
    cleanSolves: 0,
    misses: 0,
    hints: 0,
    mastery: 0 as const,
    lastPlayedAt: null,
    nextReviewAt: null,
  };
  const clean = options.wrongAttempts === 0 && !options.hintUsed;
  const nextMastery = boundedMastery(
    clean ? current.mastery + 1 : Math.max(0, current.mastery - (options.wrongAttempts >= 2 ? 1 : 0))
  );

  return {
    ...state,
    [puzzleId]: {
      ...current,
      solves: current.solves + 1,
      cleanSolves: current.cleanSolves + (clean ? 1 : 0),
      misses: current.misses + Math.max(0, Math.floor(options.wrongAttempts)),
      hints: current.hints + (options.hintUsed ? 1 : 0),
      mastery: nextMastery,
      lastPlayedAt: now.toISOString(),
      nextReviewAt: nextReviewIso(nextMastery, now),
    },
  };
}

export function masteryStatus(record: PuzzleMasteryRecord | undefined, now = Date.now()): PuzzleMasteryStatus {
  if (!record || record.solves === 0) return "new";
  if (record.mastery >= 3) return "mastered";
  if (record.nextReviewAt && Date.parse(record.nextReviewAt) <= now) return "needs-review";
  if (record.misses > record.cleanSolves && record.mastery <= 1) return "needs-review";
  return "learning";
}

export function updatePuzzleStreak(streak: PuzzleStreak, now = new Date()): PuzzleStreak {
  const today = isoDay(now);
  if (streak.lastSolveDate === today) return streak;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const continued = streak.lastSolveDate === isoDay(yesterday);
  const current = continued ? streak.current + 1 : 1;

  return {
    current,
    best: Math.max(streak.best, current),
    lastSolveDate: today,
  };
}

export function updatePuzzleSession(
  session: PuzzleSessionStats,
  options: { wrongAttempts: number; hintUsed: boolean }
): PuzzleSessionStats {
  return {
    solved: session.solved + 1,
    firstTry: session.firstTry + (options.wrongAttempts === 0 && !options.hintUsed ? 1 : 0),
    hints: session.hints + (options.hintUsed ? 1 : 0),
    misses: session.misses + Math.max(0, Math.floor(options.wrongAttempts)),
  };
}

export function firstTryRate(session: PuzzleSessionStats) {
  if (session.solved === 0) return 0;
  return Math.round((session.firstTry / session.solved) * 100);
}
