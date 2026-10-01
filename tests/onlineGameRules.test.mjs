import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  BLACK_FIRST_FEN,
  isThreefoldPosition,
  isUntimed,
  validateMoveTurn,
} from "../supabase/functions/online-game/rules.mjs";

test("online traditional chess starts with Black to move", () => {
  const chess = new Chess(BLACK_FIRST_FEN);
  assert.equal(chess.turn(), "b");
});

test("chess.js rejects an illegal server-side move", () => {
  const chess = new Chess(BLACK_FIRST_FEN);
  assert.throws(() => chess.move({ from: "e7", to: "e4" }));
});

test("online turn gate rejects the wrong player", () => {
  const game = {
    white_id: "white-player",
    black_id: "black-player",
    current_turn: "b",
  };
  assert.equal(validateMoveTurn(game, "white-player"), "Not your turn");
  assert.equal(validateMoveTurn(game, "black-player"), null);
});

test("zero-minute games are explicitly untimed", () => {
  assert.equal(isUntimed({ time_control_minutes: 0 }), true);
  assert.equal(isUntimed({ time_control_minutes: 10 }), false);
});


test("threefold detection uses persisted position history instead of the latest FEN alone", () => {
  const chess = new Chess(BLACK_FIRST_FEN);
  const positions = [chess.fen()];
  const cycle = [
    ["g8", "f6"],
    ["g1", "f3"],
    ["f6", "g8"],
    ["f3", "g1"],
  ];

  for (const [from, to] of cycle) {
    chess.move({ from, to });
    positions.push(chess.fen());
  }
  assert.equal(isThreefoldPosition(positions), false);

  for (const [from, to] of cycle) {
    chess.move({ from, to });
    positions.push(chess.fen());
  }
  assert.equal(isThreefoldPosition(positions), true);
});
