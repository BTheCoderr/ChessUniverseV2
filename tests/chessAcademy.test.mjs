import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { OPENING_LESSONS, openingMoveParts } from "../src/lib/openingLessons.ts";
import { ACADEMY_POSITIONS, academyMoveParts } from "../src/lib/academyLessons.ts";
import { OFFLINE_PUZZLES, dailyPuzzleIndex } from "../src/lib/puzzles.ts";
import { readFile } from "node:fs/promises";

test("every guided opening is a legal move-by-move line", () => {
  assert.ok(OPENING_LESSONS.length >= 4);

  for (const opening of OPENING_LESSONS) {
    const game = new Chess();
    assert.ok(opening.bigIdea.length > 40);
    assert.ok(opening.steps.length >= 6);

    for (const step of opening.steps) {
      const move = openingMoveParts(step.uci);
      const made = game.move({
        from: move.from,
        to: move.to,
        ...(move.promotion ? { promotion: move.promotion } : {}),
      });

      assert.ok(made, `${opening.name}: ${step.uci} is legal`);
      assert.ok(step.purpose.length > 20);
      assert.ok(step.opponentIdea.length > 20);
    }
  }
});

test("every piece-decision lesson has a legal target move and strategic explanation", () => {
  assert.ok(ACADEMY_POSITIONS.length >= 6);

  for (const lesson of ACADEMY_POSITIONS) {
    const game = new Chess(lesson.fen);
    const move = academyMoveParts(lesson.expectedMove);
    const made = game.move({
      from: move.from,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
    });

    assert.ok(made, `${lesson.title}: ${lesson.expectedMove} is legal`);
    assert.ok(lesson.why.length > 40);
    assert.ok(lesson.opponentPlan.length > 40);
    assert.ok(lesson.takeaway.length > 30);
  }
});

test("daily puzzle selection is deterministic and rotates across the local calendar", () => {
  const one = dailyPuzzleIndex(new Date(2026, 8, 30));
  const same = dailyPuzzleIndex(new Date(2026, 8, 30, 23, 59));
  const next = dailyPuzzleIndex(new Date(2026, 9, 1));

  assert.equal(one, same);
  assert.notEqual(one, next);
  assert.ok(one >= 0 && one < OFFLINE_PUZZLES.length);
  assert.ok(next >= 0 && next < OFFLINE_PUZZLES.length);
});

test("puzzle pack includes piece, defense, strategy and both-color teaching", () => {
  assert.ok(OFFLINE_PUZZLES.length >= 12);
  const themes = new Set(OFFLINE_PUZZLES.map((puzzle) => puzzle.theme));

  for (const theme of ["Queen", "Rook", "Bishop", "Knight", "Defense", "Strategy", "Checkmate"]) {
    assert.ok(themes.has(theme), `contains ${theme} puzzles`);
  }

  assert.ok(OFFLINE_PUZZLES.some((puzzle) => new Chess(puzzle.fen).turn() === "w"));
  assert.ok(OFFLINE_PUZZLES.some((puzzle) => new Chess(puzzle.fen).turn() === "b"));

  for (const puzzle of OFFLINE_PUZZLES) {
    assert.ok(puzzle.opponentIdea.length > 25);
    assert.ok(puzzle.takeaway.length > 25);
  }
});

test("Chess Academy UI teaches ideas, opponent plans and daily puzzles", async () => {
  const learn = await readFile(new URL("../src/components/LearnChess.tsx", import.meta.url), "utf8");
  const puzzles = await readFile(new URL("../src/components/PuzzleMode.tsx", import.meta.url), "utf8");

  assert.match(learn, /CHESS ACADEMY/);
  assert.match(learn, /DECISION/);
  assert.match(learn, /OPENING LAB/);
  assert.match(learn, /What the opponent wants/);
  assert.match(learn, /STRATEGY SCHOOL/);
  assert.match(learn, /checks, captures, and threats/i);
  assert.match(learn, /Puzzle of the Day/);

  assert.match(puzzles, /PUZZLE OF THE DAY/);
  assert.match(puzzles, /What is the opponent trying to do/);
  assert.match(puzzles, /Pattern to remember/);
  assert.match(puzzles, /Queen/);
  assert.match(puzzles, /Rook/);
});
