import assert from "node:assert/strict";
import test from "node:test";
import { createUniverseGame, replayUniverseMoves } from "../lib/chess.ts";

test("Chess Universe starts with Black (not standard White-first)", () => {
  const game = createUniverseGame();
  assert.equal(game.turn(), "b");
  assert.equal(game.history().length, 0);
  assert.ok(game.moves({ square: "e7" }).includes("e5"));
  assert.deepEqual(game.moves({ square: "e2" }), []);
});

test("Black-first games can be replayed without resetting to White-first", () => {
  const game = createUniverseGame();
  game.move({ from: "e7", to: "e5" });
  game.move({ from: "e2", to: "e4" });
  game.move({ from: "g8", to: "f6" });
  const replayed = replayUniverseMoves(game.history({ verbose: true }));
  assert.equal(replayed.fen(), game.fen());
  assert.deepEqual(replayed.history(), game.history());
  assert.equal(replayed.turn(), "w");
});

test("Undoing one local move or a two-ply computer round keeps Black-first rules", () => {
  const game = createUniverseGame();
  game.move({ from: "d7", to: "d5" });
  game.move({ from: "d2", to: "d4" });
  const moves = game.history({ verbose: true });
  const localUndo = replayUniverseMoves(moves.slice(0, -1));
  assert.equal(localUndo.turn(), "w");
  assert.deepEqual(localUndo.history(), ["d5"]);
  const roundUndo = replayUniverseMoves(moves.slice(0, -2));
  assert.equal(roundUndo.turn(), "b");
  assert.deepEqual(roundUndo.history(), []);
});
