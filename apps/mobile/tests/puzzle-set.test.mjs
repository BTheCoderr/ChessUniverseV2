import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Chess } from "chess.js";
import { WEB_PUZZLES } from "../lib/puzzleData.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("every native puzzle is a legal position whose solution is legal (and mates when promised)", () => {
  assert.ok(WEB_PUZZLES.length >= 15, "native app should ship the full curated set");
  const ids = new Set();
  for (const p of WEB_PUZZLES) {
    assert.ok(!ids.has(p.id), `duplicate puzzle id ${p.id}`);
    ids.add(p.id);
    const game = new Chess(p.fen);
    const move = game.move({ from: p.solution.slice(0, 2), to: p.solution.slice(2, 4), promotion: p.solution[4] ?? "q" });
    assert.ok(move, `${p.id}: solution ${p.solution} is illegal`);
    if (p.expectsMate) assert.ok(game.isCheckmate(), `${p.id}: expected checkmate`);
  }
  const backRank = new Chess("6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1");
  backRank.move("Rd8#");
  assert.ok(backRank.isCheckmate());
  assert.doesNotMatch(read("lib/puzzles.ts"), /queen-defense/, "misleading 'defend the queen' puzzle was removed");
});

