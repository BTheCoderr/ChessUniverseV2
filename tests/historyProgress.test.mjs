import test from "node:test";
import assert from "node:assert/strict";
import {
  awardHistoryMedal,
  emptyHistoryProgress,
  gameMedalCount,
  medalCount,
  normalizeHistoryProgress,
  recordHistoryAttempt,
  rewriteChallengeComplete,
} from "../src/lib/historyProgress.ts";

test("Legends campaign starts with nine available medals and no progress", () => {
  const progress = emptyHistoryProgress();
  assert.equal(medalCount(progress), 0);
  assert.equal(gameMedalCount(progress, "opera"), 0);
  assert.equal(gameMedalCount(progress, "immortal"), 0);
  assert.equal(gameMedalCount(progress, "century"), 0);
});

test("awarding medals is idempotent and scoped to one legend", () => {
  const start = emptyHistoryProgress();
  const one = awardHistoryMedal(start, "opera", "replay");
  const duplicate = awardHistoryMedal(one, "opera", "replay");
  const two = awardHistoryMedal(duplicate, "opera", "historical");

  assert.equal(medalCount(two), 2);
  assert.equal(gameMedalCount(two, "opera"), 2);
  assert.equal(gameMedalCount(two, "immortal"), 0);
  assert.equal(duplicate, one);
});

test("moment attempts are tracked without changing medal totals", () => {
  const start = emptyHistoryProgress();
  const attempted = recordHistoryAttempt(recordHistoryAttempt(start, "century"), "century");

  assert.equal(attempted.century.attempts, 2);
  assert.equal(medalCount(attempted), 0);
});

test("saved campaign progress is normalized instead of trusted blindly", () => {
  const normalized = normalizeHistoryProgress({
    opera: { replay: true, historical: "yes", rewrite: false, attempts: 2.9 },
    immortal: null,
    century: { replay: true, historical: true, rewrite: true, attempts: -9 },
  });

  assert.equal(normalized.opera.replay, true);
  assert.equal(normalized.opera.historical, false);
  assert.equal(normalized.opera.attempts, 2);
  assert.equal(normalized.immortal.attempts, 0);
  assert.equal(normalized.century.attempts, 0);
  assert.equal(medalCount(normalized), 4);
});

test("Rewrite medal requires an alternate timeline, not the historical move", () => {
  assert.equal(rewriteChallengeComplete(5, true, false), false);
  assert.equal(rewriteChallengeComplete(4, false, false), false);
  assert.equal(rewriteChallengeComplete(5, false, false), true);
  assert.equal(rewriteChallengeComplete(1, false, true), true);
});
