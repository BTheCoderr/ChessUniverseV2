import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUniversePosition,
  normalizeGameLibrary,
} from "../src/lib/gameLibrary.ts";
import { gradeMove, uciForMove } from "../src/lib/gameReview.ts";

test("saved game normalization rejects malformed rows and keeps newest games first", () => {
  const library = normalizeGameLibrary([
    {
      id: "older",
      completedAt: "2026-09-01T12:00:00.000Z",
      mode: "ai",
      difficulty: "easy",
      timeControlMinutes: 0,
      result: "Black wins",
      moves: [{ from: "e7", to: "e5", san: "e5", color: "b" }],
    },
    { id: 42 },
    {
      id: "newer",
      completedAt: "2026-09-02T12:00:00.000Z",
      mode: "local",
      difficulty: "beginner",
      timeControlMinutes: 10,
      result: "Draw",
      moves: [],
    },
  ]);

  assert.deepEqual(library.map((game) => game.id), ["newer", "older"]);
  assert.equal(library[0].timeControlMinutes, 10);
});

test("saved game replay preserves Chess Universe Black-first positions", () => {
  const start = buildUniversePosition([], 0);
  assert.equal(start.turn(), "b");

  const afterBlack = buildUniversePosition(
    [{ from: "e7", to: "e5", san: "e5", color: "b" }],
    1
  );
  assert.equal(afterBlack.turn(), "w");
  assert.equal(afterBlack.get("e5")?.type, "p");
});

test("game review grades use centipawn loss thresholds", () => {
  assert.equal(gradeMove(999, true), "Best");
  assert.equal(gradeMove(15, false), "Best");
  assert.equal(gradeMove(16, false), "Good");
  assert.equal(gradeMove(51, false), "Inaccuracy");
  assert.equal(gradeMove(101, false), "Mistake");
  assert.equal(gradeMove(221, false), "Blunder");
});

test("review UCI helper includes promotion only when present", () => {
  assert.equal(uciForMove("e7", "e5"), "e7e5");
  assert.equal(uciForMove("a7", "a8", "q"), "a7a8q");
});
