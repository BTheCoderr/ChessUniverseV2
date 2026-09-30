export const ACADEMY_REVIEW_KEY = "chess-universe-adaptive-review-v1";

export type ReviewRecord = {
  lessonId: string;
  misses: number;
  correct: number;
  lastAttemptAt: number;
  nextReviewAt: number;
  lastMove?: string;
};

export type ReviewState = Record<string, ReviewRecord>;

export function loadReviewState(): ReviewState {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACADEMY_REVIEW_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as ReviewState;
  } catch {
    return {};
  }
}

export function saveReviewState(state: ReviewState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACADEMY_REVIEW_KEY, JSON.stringify(state));
  } catch {
    // Review stays usable for this session if browser storage is unavailable.
  }
}

function intervalFor(correct: number, misses: number) {
  if (correct <= 0) return 0;
  if (misses >= correct * 2) return 6 * 60 * 60 * 1000;
  if (misses >= correct) return 24 * 60 * 60 * 1000;
  if (correct < 3) return 2 * 24 * 60 * 60 * 1000;
  return 5 * 24 * 60 * 60 * 1000;
}

export function recordReviewAttempt(
  lessonId: string,
  correctAttempt: boolean,
  move?: string,
  now = Date.now()
) {
  const state = loadReviewState();
  const previous = state[lessonId] ?? {
    lessonId,
    misses: 0,
    correct: 0,
    lastAttemptAt: 0,
    nextReviewAt: 0,
  };

  const next: ReviewRecord = {
    ...previous,
    misses: previous.misses + (correctAttempt ? 0 : 1),
    correct: previous.correct + (correctAttempt ? 1 : 0),
    lastAttemptAt: now,
    lastMove: move ?? previous.lastMove,
    nextReviewAt: correctAttempt
      ? now + intervalFor(previous.correct + 1, previous.misses)
      : now,
  };

  state[lessonId] = next;
  saveReviewState(state);
  return next;
}

export function reviewPriority(record: ReviewRecord, now = Date.now()) {
  const overdueHours = Math.max(0, now - record.nextReviewAt) / 3_600_000;
  return record.misses * 5 - record.correct * 1.5 + overdueHours / 24;
}
