import test from "node:test";
import assert from "node:assert/strict";
import {
  OFFLINE_PUZZLES,
  explainWrongPuzzleMove,
  normalizePuzzleProgress,
  puzzleMoveUci,
  puzzlePosition,
} from "../src/lib/puzzles.ts";
import { normalizeFeedbackSettings } from "../src/lib/feedback.ts";

test("offline puzzle pack contains valid one-move solutions", () => {
  assert.ok(OFFLINE_PUZZLES.length >= 5);

  for (const puzzle of OFFLINE_PUZZLES) {
    const game = puzzlePosition(puzzle);
    const from = puzzle.solution.slice(0, 2);
    const to = puzzle.solution.slice(2, 4);
    const promotion = puzzle.solution[4];

    const move = game.move({
      from,
      to,
      ...(promotion ? { promotion } : {}),
    });

    assert.ok(move, `${puzzle.title} solution is legal`);
    assert.equal(puzzleMoveUci(move.from, move.to, move.promotion), puzzle.solution);

    assert.ok(puzzle.mistakeLesson.length > 35, `${puzzle.title} explains wrong moves`);

    if (puzzle.expectsMate) {
      assert.equal(game.isCheckmate(), true, `${puzzle.title} ends in mate`);
    }
  }
});


test("rook and queen lesson is Black defense and does not hang the rook", () => {
  const puzzle = OFFLINE_PUZZLES.find((item) => item.id === "rook-wins-queen");
  assert.ok(puzzle);
  assert.equal(puzzle.theme, "Defense");

  const game = puzzlePosition(puzzle);
  assert.equal(game.turn(), "b");

  const correct = game.move({ from: "a8", to: "b8" });
  assert.ok(correct);

  const canCaptureRook = game
    .moves({ verbose: true })
    .some((move) => move.to === "b8" && move.captured === "r");
  assert.equal(canCaptureRook, false);

  const beforeWrong = puzzlePosition(puzzle);
  const afterWrong = puzzlePosition(puzzle);
  const wrong = afterWrong.move({ from: "a8", to: "d8" });
  assert.ok(wrong);

  const feedback = explainWrongPuzzleMove(puzzle, beforeWrong, afterWrong, wrong);
  assert.match(feedback, /immediately take your rook/i);
  assert.match(feedback, /queen/i);
});

test("puzzle progress keeps unique known puzzle ids only", () => {
  const first = OFFLINE_PUZZLES[0].id;
  const second = OFFLINE_PUZZLES[1].id;
  assert.deepEqual(
    normalizePuzzleProgress([first, first, "not-a-puzzle", second, 42]),
    [first, second]
  );
});

test("feedback settings default on and normalize explicit opt-outs", () => {
  assert.deepEqual(normalizeFeedbackSettings(null), { sound: true, haptics: true });
  assert.deepEqual(normalizeFeedbackSettings({ sound: false, haptics: true }), { sound: false, haptics: true });
  assert.deepEqual(normalizeFeedbackSettings({ sound: true, haptics: false }), { sound: true, haptics: false });
});
