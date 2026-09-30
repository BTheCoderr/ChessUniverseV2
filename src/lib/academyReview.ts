import { ACADEMY_POSITIONS } from "./academyLessons";
import { ENDGAME_LESSONS } from "./endgameLessons";
import { OPPONENT_RESPONSE_LESSONS } from "./opponentResponseLessons";
import { PIECE_SCHOOLS } from "./pieceSchools";

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

export type ReviewLesson = {
  id: string;
  source: "Piece School" | "Opponent Response" | "Endgame" | "Piece Decision";
  title: string;
  concept: string;
  fen: string;
  expectedMove: string;
  prompt: string;
  why: string;
  mistakeLesson: string;
  takeaway: string;
  orientation: "w" | "b";
};

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

export function reviewCatalog(): ReviewLesson[] {
  const pieceSchoolLessons: ReviewLesson[] = PIECE_SCHOOLS.flatMap((school) =>
    school.lessons.map((lesson) => ({
      id: lesson.id,
      source: "Piece School",
      title: `${school.name}: ${lesson.title}`,
      concept: lesson.concept,
      fen: lesson.fen,
      expectedMove: lesson.expectedMove,
      prompt: lesson.prompt,
      why: lesson.why,
      mistakeLesson: `A different legal move may improve something, but it misses this lesson's core job: ${lesson.concept.toLowerCase()}. ${lesson.opponentPlan}`,
      takeaway: lesson.takeaway,
      orientation: lesson.orientation,
    }))
  );

  const responses: ReviewLesson[] = OPPONENT_RESPONSE_LESSONS.map((lesson) => ({
    id: lesson.id,
    source: "Opponent Response",
    title: lesson.title,
    concept: lesson.theme,
    fen: lesson.fen,
    expectedMove: lesson.expectedMove,
    prompt: lesson.prompt,
    why: lesson.why,
    mistakeLesson: `The move is legal, but it does not answer the change created by the opponent's last move. ${lesson.threat}`,
    takeaway: lesson.takeaway,
    orientation: lesson.orientation,
  }));

  const endgames: ReviewLesson[] = ENDGAME_LESSONS.map((lesson) => ({
    id: lesson.id,
    source: "Endgame",
    title: lesson.title,
    concept: lesson.principle,
    fen: lesson.fen,
    expectedMove: lesson.expectedMove,
    prompt: lesson.prompt,
    why: lesson.why,
    mistakeLesson: lesson.mistakeLesson,
    takeaway: lesson.takeaway,
    orientation: lesson.orientation,
  }));

  const decisions: ReviewLesson[] = ACADEMY_POSITIONS.map((lesson) => ({
    id: `decision-${lesson.id}`,
    source: "Piece Decision",
    title: lesson.title,
    concept: lesson.concept,
    fen: lesson.fen,
    expectedMove: lesson.expectedMove,
    prompt: lesson.question,
    why: lesson.why,
    mistakeLesson: `That legal move does not solve the positional job in front of you. Focus on: ${lesson.concept.toLowerCase()}.`,
    takeaway: lesson.takeaway,
    orientation: lesson.orientation,
  }));

  return [...pieceSchoolLessons, ...responses, ...endgames, ...decisions];
}

export function adaptiveQueue(now = Date.now()) {
  const state = loadReviewState();
  const catalog = new Map(reviewCatalog().map((lesson) => [lesson.id, lesson]));

  return Object.values(state)
    .filter((record) => record.misses > 0 && record.nextReviewAt <= now && catalog.has(record.lessonId))
    .sort((a, b) => reviewPriority(b, now) - reviewPriority(a, now))
    .map((record) => ({
      record,
      lesson: catalog.get(record.lessonId)!,
    }));
}

export function dueReviewCount(now = Date.now()) {
  return adaptiveQueue(now).length;
}
