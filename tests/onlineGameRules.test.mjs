import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  BLACK_FIRST_FEN,
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
