import test from "node:test";
import assert from "node:assert/strict";
import {
  firstTryRate,
  masteryStatus,
  normalizePuzzleMastery,
  recordPuzzleSolve,
  updatePuzzleSession,
  updatePuzzleStreak,
} from "../src/lib/puzzleMastery.ts";

test("clean solves build mastery while repeated misses keep a puzzle in review", () => {
  const now = new Date("2026-10-01T12:00:00-04:00");
  let state = recordPuzzleSolve({}, "fork", { wrongAttempts: 0, hintUsed: false, now });
  assert.equal(state.fork.mastery, 1);
  state = recordPuzzleSolve(state, "fork", { wrongAttempts: 0, hintUsed: false, now });
  state = recordPuzzleSolve(state, "fork", { wrongAttempts: 0, hintUsed: false, now });
  assert.equal(state.fork.mastery, 3);
  assert.equal(masteryStatus(state.fork, now.getTime()), "mastered");

  state = recordPuzzleSolve(state, "fork", { wrongAttempts: 3, hintUsed: true, now });
  assert.equal(state.fork.mastery, 2);
});

test("streak advances once per local day and resets after a missed day", () => {
  let streak = { current: 0, best: 0, lastSolveDate: null };
  streak = updatePuzzleStreak(streak, new Date(2026, 9, 1, 9));
  assert.equal(streak.current, 1);
  streak = updatePuzzleStreak(streak, new Date(2026, 9, 1, 20));
  assert.equal(streak.current, 1);
  streak = updatePuzzleStreak(streak, new Date(2026, 9, 2, 8));
  assert.equal(streak.current, 2);
  streak = updatePuzzleStreak(streak, new Date(2026, 9, 4, 8));
  assert.equal(streak.current, 1);
  assert.equal(streak.best, 2);
});

test("session recap tracks first-try rate, hints, and misses", () => {
  let session = { solved: 0, firstTry: 0, hints: 0, misses: 0 };
  session = updatePuzzleSession(session, { wrongAttempts: 0, hintUsed: false });
  session = updatePuzzleSession(session, { wrongAttempts: 2, hintUsed: true });
  assert.deepEqual(session, { solved: 2, firstTry: 1, hints: 1, misses: 2 });
  assert.equal(firstTryRate(session), 50);
});

test("mastery normalization rejects junk without losing valid records", () => {
  const normalized = normalizePuzzleMastery({
    good: { solves: 2, cleanSolves: 1, misses: 3, hints: 1, mastery: 2, lastPlayedAt: null, nextReviewAt: null },
    bad: "nope",
  });
  assert.equal(normalized.good.solves, 2);
  assert.equal(normalized.bad, undefined);
});
