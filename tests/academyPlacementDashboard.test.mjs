import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PLACEMENT_QUESTIONS,
  clearPlacement,
  loadPlacement,
  placementLevel,
  recommendedStart,
  savePlacement,
  scorePlacement,
} from "../src/lib/academyPlacement.ts";
import {
  loadAcademyCoreProgress,
  markOpeningComplete,
  markPieceBasicsComplete,
  markPieceDecisionComplete,
  markStrategyVisited,
  markUniverseIntroComplete,
} from "../src/lib/academyProgress.ts";
import { ACADEMY_COURSE_PATHS } from "../src/lib/academyCourses.ts";

function installLocalStorage() {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); },
      clear() { store.clear(); },
    },
  };
  return store;
}

function answersWithCorrectCount(correctCount) {
  return PLACEMENT_QUESTIONS.map((question, index) => {
    const answer = question.answers.find((item) =>
      index < correctCount ? item.correct : !item.correct
    );
    return { questionId: question.id, answerId: answer.id };
  });
}

test("placement maps knowledge scores into three useful starting levels", () => {
  assert.equal(placementLevel(0, 6), "Beginner");
  assert.equal(placementLevel(2, 6), "Beginner");
  assert.equal(placementLevel(3, 6), "Developing");
  assert.equal(placementLevel(4, 6), "Developing");
  assert.equal(placementLevel(5, 6), "Intermediate");
  assert.equal(placementLevel(6, 6), "Intermediate");

  assert.equal(scorePlacement(answersWithCorrectCount(2)).level, "Beginner");
  assert.equal(scorePlacement(answersWithCorrectCount(4)).level, "Developing");
  assert.equal(scorePlacement(answersWithCorrectCount(6)).level, "Intermediate");
});

test("placement saves locally and recommends a matching Academy entry point", () => {
  installLocalStorage();

  const result = scorePlacement(answersWithCorrectCount(6));
  savePlacement(result);

  assert.deepEqual(loadPlacement()?.level, "Intermediate");
  assert.equal(recommendedStart("Beginner"), "pieces");
  assert.equal(recommendedStart("Developing"), "schools");
  assert.equal(recommendedStart("Intermediate"), "responses");

  clearPlacement();
  assert.equal(loadPlacement(), null);
});

test("core Academy progress persists and deduplicates completed lessons", () => {
  installLocalStorage();

  markPieceBasicsComplete();
  markPieceDecisionComplete("queen-joins-attack");
  markPieceDecisionComplete("queen-joins-attack");
  markOpeningComplete("italian-game");
  markOpeningComplete("italian-game");
  markStrategyVisited();
  markUniverseIntroComplete();

  const progress = loadAcademyCoreProgress();

  assert.equal(progress.pieceBasicsComplete, true);
  assert.deepEqual(progress.pieceDecisionIds, ["queen-joins-attack"]);
  assert.deepEqual(progress.openingIds, ["italian-game"]);
  assert.equal(progress.strategyVisited, true);
  assert.equal(progress.universeIntroComplete, true);
});

test("course paths change meaningfully by placement level", () => {
  assert.equal(ACADEMY_COURSE_PATHS.Beginner[0].section, "pieces");
  assert.equal(ACADEMY_COURSE_PATHS.Developing[0].section, "schools");
  assert.equal(ACADEMY_COURSE_PATHS.Intermediate[0].section, "responses");

  assert.ok(ACADEMY_COURSE_PATHS.Beginner.some((step) => step.section === "puzzles"));
  assert.ok(ACADEMY_COURSE_PATHS.Developing.some((step) => step.section === "endgames"));
  assert.ok(ACADEMY_COURSE_PATHS.Intermediate.some((step) => step.section === "review"));
});

test("Academy dashboard reads real local progress and weak concepts", async () => {
  const dashboard = await readFile(new URL("../src/components/AcademyDashboard.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /ACADEMY DASHBOARD/);
  assert.match(dashboard, /loadAcademyCoreProgress/);
  assert.match(dashboard, /PIECE_SCHOOL_PROGRESS_KEY/);
  assert.match(dashboard, /RESPONSE_PROGRESS_KEY/);
  assert.match(dashboard, /ENDGAME_PROGRESS_KEY/);
  assert.match(dashboard, /PUZZLE_PROGRESS_KEY/);
  assert.match(dashboard, /MULTI_MOVE_PROGRESS_KEY/);
  assert.match(dashboard, /loadReviewState/);
  assert.match(dashboard, /What needs attention/);
  assert.match(dashboard, /Next:/);
});

test("Learn opens on the dashboard and reports course completion", async () => {
  const learn = await readFile(new URL("../src/components/LearnChess.tsx", import.meta.url), "utf8");

  assert.match(learn, /useState<AcademyLesson>\("dashboard"\)/);
  assert.match(learn, /AcademyDashboard/);
  assert.match(learn, /AcademyPlacement/);
  assert.match(learn, /markPieceBasicsComplete/);
  assert.match(learn, /markPieceDecisionComplete/);
  assert.match(learn, /markOpeningComplete/);
  assert.match(learn, /markStrategyVisited/);
  assert.match(learn, /markUniverseIntroComplete/);
});
