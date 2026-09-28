import test from "node:test";
import assert from "node:assert/strict";
import {
  PRACTICE_TIME_OPTIONS,
  formatClock,
  initialClocks,
  practiceMoveLabel,
  practiceUndoPlies,
} from "../src/lib/practice.ts";
import { STOCKFISH_LEVELS } from "../src/lib/stockfish.ts";

test("practice defaults support no clock plus common beginner time controls", () => {
  assert.deepEqual(PRACTICE_TIME_OPTIONS.map((option) => option.minutes), [0, 5, 10, 15]);
  assert.deepEqual(initialClocks(0), { w: 0, b: 0 });
  assert.deepEqual(initialClocks(5), { w: 300, b: 300 });
});

test("practice clock formatting is stable at zero and minute boundaries", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(59), "0:59");
  assert.equal(formatClock(60), "1:00");
  assert.equal(formatClock(605), "10:05");
});

test("Black-first move labels follow the Chess Universe turn order", () => {
  assert.equal(practiceMoveLabel(0, "b"), "1...");
  assert.equal(practiceMoveLabel(1, "w"), "2.");
  assert.equal(practiceMoveLabel(2, "b"), "2...");
  assert.equal(practiceMoveLabel(3, "w"), "3.");
});

test("undo rewinds one local ply but a full completed AI round", () => {
  assert.equal(practiceUndoPlies("local", false, "w", 4), 1);
  assert.equal(practiceUndoPlies("ai", true, "w", 1), 1);
  assert.equal(practiceUndoPlies("ai", false, "w", 1), 1);
  assert.equal(practiceUndoPlies("ai", false, "b", 2), 2);
  assert.equal(practiceUndoPlies("ai", false, "b", 1), 1);
  assert.equal(practiceUndoPlies("ai", false, "b", 0), 0);
});

test("Stockfish difficulty increases from beginner through hard", () => {
  const order = ["beginner", "easy", "medium", "hard"];
  for (let index = 1; index < order.length; index += 1) {
    assert.ok(STOCKFISH_LEVELS[order[index]].depth > STOCKFISH_LEVELS[order[index - 1]].depth);
    assert.ok(STOCKFISH_LEVELS[order[index]].skill >= STOCKFISH_LEVELS[order[index - 1]].skill);
  }
  assert.equal(STOCKFISH_LEVELS.beginner.skill, 0);
  assert.equal(STOCKFISH_LEVELS.hard.skill, 20);
});
