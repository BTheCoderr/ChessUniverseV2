import test from "node:test";
import assert from "node:assert/strict";
import { newPosition, legalMoves, playMove, inCheck, gameStatus, pieceAt } from "../src/lib/evolvingQueens.ts";

function sparse(pieces, turn = "b") {
  const state = newPosition();
  state.board = Array(64).fill(null);
  state.turn = turn;
  state.castling = "";
  for (const [square, type, color] of pieces) state.board[(8 - Number(square[1])) * 8 + "abcdefgh".indexOf(square[0])] = { type, color };
  return state;
}
const kings = [["e1", "k", "w"], ["e8", "k", "b"]];
const targets = (p, l, from) => legalMoves(p, l, from).map((m) => m.to);

test("Black opens from the normal setup and can make a legal pawn move", () => {
  const p = newPosition();
  assert.equal(p.turn, "b");
  assert.ok(targets(p, 1, "e7").includes("e5"));
  const next = playMove(p, 1, "e7", "e5");
  assert.equal(next.turn, "w");
  assert.equal(next.enPassant, "e6");
  assert.equal(pieceAt(next, "e5").type, "p");
});

test("queen lines and leaps differ at each level", () => {
  const p = sparse([...kings, ["d4", "q", "b"]]);
  assert.equal(targets(p, 1, "d4").includes("e6"), false);
  for (const l of [2, 3, 4]) assert.ok(targets(p, l, "d4").includes("e6"), `level ${l} knight`);
  assert.ok(targets(p, 2, "d4").includes("g7"));
  assert.equal(targets(p, 2, "d4").includes("d7"), false);
  assert.ok(targets(p, 2, "d4").includes("d5"));
  assert.ok(targets(p, 3, "d4").includes("d7"));
  assert.equal(targets(p, 3, "d4").includes("g7"), false);
  assert.ok(targets(p, 3, "d4").includes("e5"));
  assert.ok(targets(p, 4, "d4").includes("g7"));
  assert.ok(targets(p, 4, "d4").includes("d7"));
});

test("queen knight leap clears a blocker and can capture", () => {
  const p = sparse([...kings, ["d4", "q", "b"], ["d5", "p", "b"], ["e6", "n", "w"]]);
  assert.ok(targets(p, 2, "d4").includes("e6"));
  const next = playMove(p, 2, "d4", "e6");
  assert.equal(pieceAt(next, "e6").type, "q");
  assert.equal(pieceAt(next, "d4"), null);
});

test("custom queen attacks count as check and pinned moves are illegal", () => {
  const p = sparse([["e1", "k", "w"], ["h8", "k", "b"], ["f3", "q", "b"]], "w");
  assert.equal(inCheck(p, "w", 1), false);
  assert.equal(inCheck(p, "w", 2), true);
  assert.ok(gameStatus(p, 2).includes("check"));
  const pinned = sparse([["e1", "k", "w"], ["h8", "k", "b"], ["e8", "r", "b"], ["e2", "r", "w"]], "w");
  assert.equal(targets(pinned, 1, "e2").includes("d2"), false);
});

test("castling, en passant, and promotion work", () => {
  const p = sparse([["e1", "k", "w"], ["h1", "r", "w"], ["a8", "k", "b"]], "w");
  p.castling = "K";
  assert.equal(targets(p, 1, "e1").includes("g1"), true);
  const castled = playMove(p, 2, "e1", "g1");
  assert.equal(pieceAt(castled, "f1").type, "r");
  const ep = sparse([["e1", "k", "w"], ["e8", "k", "b"], ["e5", "p", "w"], ["d7", "p", "b"]]);
  const step = playMove(ep, 1, "d7", "d5");
  const capture = playMove(step, 1, "e5", "d6");
  assert.equal(pieceAt(capture, "d5"), null);
  assert.equal(pieceAt(capture, "d6").type, "p");
  const promo = sparse([["e1", "k", "w"], ["h8", "k", "b"], ["a7", "p", "w"]], "w");
  assert.equal(pieceAt(playMove(promo, 3, "a7", "a8"), "a8").type, "q");
});
