import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import {
  OFFLINE_PUZZLES,
  explainWrongPuzzleMove,
  normalizePuzzleProgress,
  puzzleMoveUci,
  puzzlePosition,
} from "../src/lib/puzzles.ts";
import { normalizeFeedbackSettings } from "../src/lib/feedback.ts";
import { MULTI_MOVE_PUZZLES, multiMoveParts } from "../src/lib/multiMovePuzzles.ts";

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

test("every legal wrong one-move puzzle attempt gets coaching", () => {
  for (const puzzle of OFFLINE_PUZZLES) {
    const before = puzzlePosition(puzzle);
    const legalMoves = before.moves({ verbose: true });

    for (const candidate of legalMoves) {
      const uci = puzzleMoveUci(candidate.from, candidate.to, candidate.promotion);
      if (uci === puzzle.solution) continue;

      const after = new Chess(before.fen());
      const made = after.move({
        from: candidate.from,
        to: candidate.to,
        ...(candidate.promotion ? { promotion: candidate.promotion } : {}),
      });

      const feedback = explainWrongPuzzleMove(puzzle, before, after, made);
      assert.ok(
        feedback.length > 55,
        `${puzzle.title}: ${uci} should explain why the move misses`
      );
      assert.match(feedback, /legal, but|does not|misses|gives up|loses|take|mate/i);
    }
  }
});

test("every player step in Multi-Move Lab has its own wrong-move lesson", () => {
  for (const puzzle of MULTI_MOVE_PUZZLES) {
    const game = new Chess(puzzle.fen);

    for (const [index, step] of puzzle.steps.entries()) {
      if (step.actor === "player") {
        assert.ok(
          step.mistakeLesson.length > 35,
          `${puzzle.title} step ${index + 1} needs specific wrong-move coaching`
        );
      }

      const parts = multiMoveParts(step.uci);
      assert.doesNotThrow(() => {
        game.move({
          from: parts.from,
          to: parts.to,
          ...(parts.promotion ? { promotion: parts.promotion } : {}),
        });
      }, `${puzzle.title} step ${index + 1} remains legal`);
    }
  }
});

test("puzzle UI presents wrong-move coaching as a dedicated card", () => {
  const single = readFileSync(new URL("../src/components/PuzzleMode.tsx", import.meta.url), "utf8");
  const multi = readFileSync(new URL("../src/components/MultiMovePuzzleMode.tsx", import.meta.url), "utf8");

  for (const source of [single, multi]) {
    assert.match(source, /puzzle-mistake-card/);
    assert.match(source, /Why that move does not work/);
    assert.match(source, /role="alert"/);
  }
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


test("feedback is routed only through the Netlify form", () => {
  const panel = readFileSync(new URL("../src/components/FeedbackPanel.tsx", import.meta.url), "utf8");
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(panel, /submitNetlifyFeedback/);
  assert.doesNotMatch(panel, /beta_feedback/);
  assert.doesNotMatch(panel, /from\s+["']\.\.\/lib\/supabase["']/);
  assert.match(index, /name="chess-universe-feedback"/);
  assert.match(index, /data-netlify="true"/);
  assert.match(index, /netlify-honeypot="bot-field"/);
});


test("mobile feedback control stays in document flow instead of covering puzzle coaching", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const mobileStart = css.indexOf("@media (max-width: 680px)");
  assert.notEqual(mobileStart, -1);
  const mobileCss = css.slice(mobileStart, mobileStart + 700);
  assert.match(mobileCss, /\.beta-feedback-fab\s*\{[\s\S]*?position:\s*static/);
  assert.match(mobileCss, /safe-area-inset-bottom/);
});
