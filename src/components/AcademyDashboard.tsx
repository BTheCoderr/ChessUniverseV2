import { useMemo } from "react";
import { ACADEMY_POSITIONS } from "../lib/academyLessons";
import { loadAcademyCoreProgress } from "../lib/academyProgress";
import { loadPlacement, recommendedStart, type AcademyLevel } from "../lib/academyPlacement";
import { loadReviewState, reviewPriority } from "../lib/academyReviewState";
import { ENDGAME_LESSONS, ENDGAME_PROGRESS_KEY, normalizeEndgameProgress } from "../lib/endgameLessons";
import { MULTI_MOVE_PROGRESS_KEY, MULTI_MOVE_PUZZLES, normalizeMultiMoveProgress } from "../lib/multiMovePuzzles";
import { OPENING_LESSONS } from "../lib/openingLessons";
import {
  OPPONENT_RESPONSE_LESSONS,
  RESPONSE_PROGRESS_KEY,
  normalizeResponseProgress,
} from "../lib/opponentResponseLessons";
import {
  PIECE_SCHOOLS,
  PIECE_SCHOOL_PROGRESS_KEY,
  normalizePieceSchoolProgress,
} from "../lib/pieceSchools";
import {
  OFFLINE_PUZZLES,
  PUZZLE_PROGRESS_KEY,
  normalizePuzzleProgress,
} from "../lib/puzzles";

type AcademySection =
  | "pieces"
  | "decisions"
  | "schools"
  | "responses"
  | "endgames"
  | "review"
  | "openings"
  | "strategy"
  | "universe";

type Props = {
  onNavigate: (section: AcademySection) => void;
  onPuzzles: () => void;
  onPlacement: () => void;
};

function readArray(key: string, normalize: (value: unknown) => string[]) {
  if (typeof window === "undefined") return [] as string[];
  try {
    return normalize(JSON.parse(window.localStorage.getItem(key) ?? "[]"));
  } catch {
    return [];
  }
}

const LEVEL_PATHS: Record<AcademyLevel, Array<{ label: string; section: AcademySection | "puzzles"; why: string }>> = {
  Beginner: [
    { label: "Piece Basics", section: "pieces", why: "Build reliable movement patterns first." },
    { label: "Piece Decisions", section: "decisions", why: "Learn what each piece is trying to accomplish." },
    { label: "Piece Schools", section: "schools", why: "Turn piece movement into piece strategy." },
    { label: "Daily Puzzles", section: "puzzles", why: "Practice short tactical decisions." },
    { label: "Opponent Response", section: "responses", why: "Read the opponent before making your own plan." },
    { label: "Opening Lab", section: "openings", why: "Learn opening ideas after the pieces make sense." },
    { label: "Endgame School", section: "endgames", why: "Learn how advantages become wins." },
    { label: "Adaptive Review", section: "review", why: "Revisit concepts you actually miss." },
  ],
  Developing: [
    { label: "Piece Schools", section: "schools", why: "Improve piece quality and positional decisions." },
    { label: "Opponent Response", section: "responses", why: "Strengthen threat recognition." },
    { label: "Opening Lab", section: "openings", why: "Connect development to real plans." },
    { label: "Daily Puzzles", section: "puzzles", why: "Build tactical pattern recognition." },
    { label: "Strategy & Tactics", section: "strategy", why: "Organize candidate moves and plans." },
    { label: "Endgame School", section: "endgames", why: "Convert cleaner positions." },
    { label: "Adaptive Review", section: "review", why: "Attack recurring weaknesses." },
  ],
  Intermediate: [
    { label: "Opponent Response", section: "responses", why: "Make opponent-first calculation automatic." },
    { label: "Daily + Multi-Move Puzzles", section: "puzzles", why: "Calculate beyond the first move." },
    { label: "Opening Lab", section: "openings", why: "Review ideas, not memorized notation." },
    { label: "Strategy & Tactics", section: "strategy", why: "Improve plans between tactical moments." },
    { label: "Endgame School", section: "endgames", why: "Sharpen technical conversion." },
    { label: "Adaptive Review", section: "review", why: "Use your own misses as the syllabus." },
  ],
};

export function AcademyDashboard({ onNavigate, onPuzzles, onPlacement }: Props) {
  const snapshot = useMemo(() => {
    const placement = loadPlacement();
    const core = loadAcademyCoreProgress();
    const pieceProgress = readArray(PIECE_SCHOOL_PROGRESS_KEY, normalizePieceSchoolProgress);
    const responseProgress = readArray(RESPONSE_PROGRESS_KEY, normalizeResponseProgress);
    const endgameProgress = readArray(ENDGAME_PROGRESS_KEY, normalizeEndgameProgress);
    const puzzleProgress = readArray(PUZZLE_PROGRESS_KEY, normalizePuzzleProgress);
    const multiProgress = readArray(MULTI_MOVE_PROGRESS_KEY, normalizeMultiMoveProgress);
    const reviewState = loadReviewState();
    const now = Date.now();
    const reviewRecords = Object.values(reviewState);
    const due = reviewRecords.filter((record) => record.misses > 0 && record.nextReviewAt <= now).length;
    const weakest = [...reviewRecords]
      .filter((record) => record.misses > 0)
      .sort((a, b) => reviewPriority(b, now) - reviewPriority(a, now))
      .slice(0, 3);

    const totals = {
      basics: 1,
      decisions: ACADEMY_POSITIONS.length,
      schools: PIECE_SCHOOLS.reduce((sum, school) => sum + school.lessons.length, 0),
      responses: OPPONENT_RESPONSE_LESSONS.length,
      openings: OPENING_LESSONS.length,
      strategy: 1,
      endgames: ENDGAME_LESSONS.length,
      puzzles: OFFLINE_PUZZLES.length,
      multi: MULTI_MOVE_PUZZLES.length,
      universe: 1,
    };

    const completed =
      (core.pieceBasicsComplete ? 1 : 0) +
      core.pieceDecisionIds.length +
      pieceProgress.length +
      responseProgress.length +
      core.openingIds.length +
      (core.strategyVisited ? 1 : 0) +
      endgameProgress.length +
      puzzleProgress.length +
      multiProgress.length +
      (core.universeIntroComplete ? 1 : 0);

    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      placement,
      core,
      pieceProgress,
      responseProgress,
      endgameProgress,
      puzzleProgress,
      multiProgress,
      reviewRecords,
      due,
      weakest,
      totals,
      completed,
      total,
      percent,
    };
  }, []);

  const level = snapshot.placement?.level ?? null;
  const path = LEVEL_PATHS[level ?? "Beginner"];
  const fallbackStart = level ? recommendedStart(level) : "pieces";

  const categoryCards = [
    {
      label: "Piece Decisions",
      done: snapshot.core.pieceDecisionIds.length,
      total: snapshot.totals.decisions,
      section: "decisions" as AcademySection,
    },
    {
      label: "Piece Schools",
      done: snapshot.pieceProgress.length,
      total: snapshot.totals.schools,
      section: "schools" as AcademySection,
    },
    {
      label: "Opponent Response",
      done: snapshot.responseProgress.length,
      total: snapshot.totals.responses,
      section: "responses" as AcademySection,
    },
    {
      label: "Opening Lab",
      done: snapshot.core.openingIds.length,
      total: snapshot.totals.openings,
      section: "openings" as AcademySection,
    },
    {
      label: "Endgame School",
      done: snapshot.endgameProgress.length,
      total: snapshot.totals.endgames,
      section: "endgames" as AcademySection,
    },
    {
      label: "Puzzles",
      done: snapshot.puzzleProgress.length + snapshot.multiProgress.length,
      total: snapshot.totals.puzzles + snapshot.totals.multi,
      section: "puzzles" as const,
    },
  ];

  const nextPathItem = path.find((item) => {
    if (item.section === "puzzles") {
      return snapshot.puzzleProgress.length + snapshot.multiProgress.length <
        snapshot.totals.puzzles + snapshot.totals.multi;
    }
    if (item.section === "pieces") return !snapshot.core.pieceBasicsComplete;
    if (item.section === "decisions") return snapshot.core.pieceDecisionIds.length < snapshot.totals.decisions;
    if (item.section === "schools") return snapshot.pieceProgress.length < snapshot.totals.schools;
    if (item.section === "responses") return snapshot.responseProgress.length < snapshot.totals.responses;
    if (item.section === "openings") return snapshot.core.openingIds.length < snapshot.totals.openings;
    if (item.section === "strategy") return !snapshot.core.strategyVisited;
    if (item.section === "endgames") return snapshot.endgameProgress.length < snapshot.totals.endgames;
    if (item.section === "review") return snapshot.due > 0;
    return true;
  }) ?? path[path.length - 1];

  const openPathItem = (section: AcademySection | "puzzles") => {
    if (section === "puzzles") onPuzzles();
    else onNavigate(section);
  };

  return (
    <section className="academy-dashboard">
      <div className="academy-dashboard-hero">
        <div>
          <div className="eyebrow">ACADEMY DASHBOARD</div>
          <h2>{level ? `${level} learning path` : "Build your learning path"}</h2>
          <p>
            {level
              ? "Your course path combines placement, completed lessons, puzzles, and the concepts your own mistakes say need more work."
              : "Take the six-question placement first, or start from Piece Basics and let the Academy learn from your mistakes."}
          </p>
        </div>
        <div className="academy-overall-progress">
          <strong>{snapshot.percent}%</strong>
          <span>{snapshot.completed}/{snapshot.total} tracked lessons complete</span>
        </div>
      </div>

      <div className="academy-dashboard-actions">
        <button className="primary-action" onClick={() => openPathItem(nextPathItem?.section ?? fallbackStart)}>
          Next: {nextPathItem?.label ?? "Continue Academy"}
        </button>
        <button className="secondary-action" onClick={onPlacement}>
          {level ? "View / retake placement" : "Take placement"}
        </button>
        {snapshot.due > 0 ? (
          <button className="secondary-action review-due-action" onClick={() => onNavigate("review")}>
            {snapshot.due} review{snapshot.due === 1 ? "" : "s"} due
          </button>
        ) : null}
      </div>

      <div className="academy-progress-grid">
        {categoryCards.map((card) => {
          const pct = card.total > 0 ? Math.round((card.done / card.total) * 100) : 0;
          return (
            <button
              type="button"
              key={card.label}
              className="academy-progress-card"
              onClick={() => openPathItem(card.section)}
            >
              <div>
                <strong>{card.label}</strong>
                <span>{card.done}/{card.total}</span>
              </div>
              <div className="academy-mini-track"><span style={{ width: `${pct}%` }} /></div>
              <small>{pct}% complete</small>
            </button>
          );
        })}
      </div>

      <div className="academy-dashboard-columns">
        <div className="academy-path-card">
          <div className="section-heading">
            <div>
              <strong>Your recommended path</strong>
              <span>{level ? `Based on your ${level.toLowerCase()} placement.` : "Beginner order until placement is complete."}</span>
            </div>
          </div>
          <ol className="academy-path-list">
            {path.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                <button type="button" onClick={() => openPathItem(item.section)}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.why}</small>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="academy-weakness-card">
          <div className="section-heading">
            <div>
              <strong>What needs attention</strong>
              <span>Based on your actual missed Academy positions.</span>
            </div>
          </div>

          {snapshot.weakest.length === 0 ? (
            <div className="review-empty compact">
              <span>✓</span>
              <div>
                <strong>No weak concepts recorded yet</strong>
                <p>Make a few Academy attempts and this section will start learning what to bring back.</p>
              </div>
            </div>
          ) : (
            <div className="academy-weakness-list">
              {snapshot.weakest.map((record) => (
                <div key={record.lessonId}>
                  <strong>{record.lessonId.replaceAll("-", " ")}</strong>
                  <span>{record.misses} miss{record.misses === 1 ? "" : "es"} · {record.correct} correct</span>
                </div>
              ))}
            </div>
          )}

          <button className="secondary-action" onClick={() => onNavigate("review")}>
            Open Adaptive Review
          </button>
        </div>
      </div>
    </section>
  );
}
