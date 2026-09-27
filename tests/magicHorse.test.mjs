import test from "node:test";
import assert from "node:assert/strict";
import { HORSE_START, QUEEN_TARGETS, initialQueens, legalHorseCaptures } from "../src/lib/magicHorse.ts";

// A complete knight route through the old 24-queen layout. This guards against
// presenting an unwinnable final challenge as a playable level.
const clearRoute = [
  "d6", "b7", "d8", "e6", "g7", "e8", "c7", "a6",
  "b8", "c6", "a7", "c8", "e7", "g6", "h8", "f7",
  "h6", "g8", "f6", "h7", "f8", "d7", "b6", "a8",
];

test("Magic Horse can reach every target, including a full clear", () => {
  let horse = HORSE_START;
  let queens = initialQueens();
  assert.equal(queens.length, 24);
  assert.deepEqual(legalHorseCaptures(horse, queens).sort(), ["d6", "f6"]);

  for (const square of clearRoute) {
    assert.ok(legalHorseCaptures(horse, queens).includes(square), `${horse} cannot capture ${square}`);
    queens = queens.filter((queen) => queen !== square);
    horse = square;
  }

  assert.equal(queens.length, 0);
  assert.deepEqual([...QUEEN_TARGETS], [4, 2, 1, 0]);
});
