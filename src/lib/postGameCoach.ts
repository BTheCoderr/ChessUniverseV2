export type CoachGrade = "Best" | "Good" | "Inaccuracy" | "Mistake" | "Blunder";

export type CoachReview = {
  index: number;
  san: string;
  color: "w" | "b";
  grade: CoachGrade;
  cpLoss: number;
  bestMove: string;
  bestSan: string;
  bestLineSan: string[];
  explanation: string;
  reviewCue: string;
  scoreBefore: number;
  scoreAfter: number;
};

export type TrainingMoment = {
  gameId: string;
  review: CoachReview;
};

export type PostGameCoachSummary = {
  turningPoint: CoachReview | null;
  reviewedMoves: number;
  bestMoves: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  firstSeriousMistake: CoachReview | null;
};

const GRADE_WEIGHT: Record<CoachGrade, number> = {
  Best: 0,
  Good: 1,
  Inaccuracy: 2,
  Mistake: 3,
  Blunder: 4,
};

function worseReview(left: CoachReview, right: CoachReview) {
  const gradeDelta = GRADE_WEIGHT[right.grade] - GRADE_WEIGHT[left.grade];
  if (gradeDelta !== 0) return gradeDelta > 0 ? right : left;
  if (right.cpLoss !== left.cpLoss) return right.cpLoss > left.cpLoss ? right : left;
  // If two moves are equally damaging, teach the earlier turning point.
  return right.index < left.index ? right : left;
}

export function summarizeCoachReviews(
  reviews: CoachReview[],
  focusColor: "w" | "b" | null = null
): PostGameCoachSummary {
  const scoped = focusColor ? reviews.filter((review) => review.color === focusColor) : reviews;

  const turningPoint = scoped.reduce<CoachReview | null>(
    (current, review) => current ? worseReview(current, review) : review,
    null
  );

  const firstSeriousMistake = scoped.find(
    (review) => review.grade === "Mistake" || review.grade === "Blunder"
  ) ?? null;

  return {
    turningPoint,
    reviewedMoves: scoped.length,
    bestMoves: scoped.filter((review) => review.grade === "Best").length,
    inaccuracies: scoped.filter((review) => review.grade === "Inaccuracy").length,
    mistakes: scoped.filter((review) => review.grade === "Mistake").length,
    blunders: scoped.filter((review) => review.grade === "Blunder").length,
    firstSeriousMistake,
  };
}

export function coachHeadline(summary: PostGameCoachSummary) {
  if (!summary.turningPoint) return "No turning point found yet.";
  if (summary.turningPoint.grade === "Blunder") return "This was the biggest swing in the game.";
  if (summary.turningPoint.grade === "Mistake") return "This was the clearest moment to improve.";
  if (summary.turningPoint.grade === "Inaccuracy") return "This was the move worth revisiting.";
  return "Your game stayed relatively steady here.";
}
