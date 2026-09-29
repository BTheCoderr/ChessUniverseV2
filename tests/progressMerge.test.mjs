import test from "node:test";
import assert from "node:assert/strict";
import { mergeHistoryProgress, mergePuzzleProgress } from "../src/lib/progressMerge.ts";

test("Legends progress keeps medals earned on either device and the higher attempt count", () => {
  const local = {
    opera: { replay: true, historical: false, rewrite: false, attempts: 2 },
    immortal: { replay: false, historical: false, rewrite: false, attempts: 0 },
    century: { replay: false, historical: false, rewrite: false, attempts: 1 },
  };
  const remote = {
    opera: { replay: false, historical: true, rewrite: false, attempts: 5 },
    immortal: { replay: true, historical: false, rewrite: true, attempts: 3 },
    century: { replay: false, historical: false, rewrite: false, attempts: 0 },
  };

  const merged = mergeHistoryProgress(local, remote);
  assert.equal(merged.opera.replay, true);
  assert.equal(merged.opera.historical, true);
  assert.equal(merged.opera.attempts, 5);
  assert.equal(merged.immortal.replay, true);
  assert.equal(merged.immortal.rewrite, true);
  assert.equal(merged.century.attempts, 1);
});

test("Puzzle progress becomes the unique union of known solved puzzles", () => {
  const merged = mergePuzzleProgress(
    ["queen-mate-white", "promotion"],
    ["promotion", "win-the-queen", "unknown-id"]
  );
  assert.deepEqual(merged, ["queen-mate-white", "promotion", "win-the-queen"]);
});
