import { Chess } from "chess.js";
import { ACADEMY_POSITIONS } from "./academyLessons";
import { ENDGAME_LESSONS } from "./endgameLessons";
import { OPPONENT_RESPONSE_LESSONS } from "./opponentResponseLessons";
import { PIECE_SCHOOLS } from "./pieceSchools";
import { MULTI_MOVE_PUZZLES, multiMoveParts } from "./multiMovePuzzles";

export {
  ACADEMY_REVIEW_KEY,
  loadReviewState,
  recordReviewAttempt,
  reviewPriority,
  saveReviewState,
} from "./academyReviewState";
import {
  loadReviewState,
  reviewPriority,
  type ReviewRecord,
} from "./academyReviewState";

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

  const multiMoveReviews: ReviewLesson[] = MULTI_MOVE_PUZZLES.flatMap((puzzle) => {
    const game = new Chess(puzzle.fen);
    const reviews: ReviewLesson[] = [];

    puzzle.steps.forEach((step, stepIndex) => {
      if (step.actor === "player") {
        reviews.push({
          id: `multi-${puzzle.id}-${stepIndex}`,
          source: "Piece Decision",
          title: `${puzzle.title}: ${step.label}`,
          concept: puzzle.theme,
          fen: game.fen(),
          expectedMove: step.uci,
          prompt: `${puzzle.goal} Current decision: ${step.label}.`,
          why: step.explanation,
          mistakeLesson: `The move is legal, but it breaks the sequence's plan. Reconnect to this step: ${step.label.toLowerCase()}.`,
          takeaway: puzzle.takeaway,
          orientation: puzzle.orientation,
        });
      }

      const parts = multiMoveParts(step.uci);
      game.move({
        from: parts.from,
        to: parts.to,
        ...(parts.promotion ? { promotion: parts.promotion } : {}),
      });
    });

    return reviews;
  });

  return [...pieceSchoolLessons, ...responses, ...endgames, ...decisions, ...multiMoveReviews];
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
