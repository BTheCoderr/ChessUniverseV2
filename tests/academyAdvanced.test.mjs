import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { readFile } from "node:fs/promises";
import { PIECE_SCHOOLS, pieceSchoolMoveParts } from "../src/lib/pieceSchools.ts";
import { OPPONENT_RESPONSE_LESSONS, responseMoveParts } from "../src/lib/opponentResponseLessons.ts";
import { MULTI_MOVE_PUZZLES, multiMoveParts } from "../src/lib/multiMovePuzzles.ts";

test("every Piece School lesson has a legal answer and teaching context", () => {
  assert.equal(PIECE_SCHOOLS.length, 4);
  assert.equal(PIECE_SCHOOLS.reduce((sum, school) => sum + school.lessons.length, 0), 12);

  for (const school of PIECE_SCHOOLS) {
    assert.ok(school.question.length > 25);
    for (const lesson of school.lessons) {
      const game = new Chess(lesson.fen);
      const parts = pieceSchoolMoveParts(lesson.expectedMove);
      const move = game.move({
        from: parts.from,
        to: parts.to,
        ...(parts.promotion ? { promotion: parts.promotion } : {}),
      });

      assert.ok(move, `${school.name} / ${lesson.title}: expected move is legal`);
      assert.ok(lesson.why.length > 35);
      assert.ok(lesson.opponentPlan.length > 30);
      assert.ok(lesson.takeaway.length > 25);
    }
  }
});

test("every opponent-response lesson answers a real legal threat", () => {
  assert.ok(OPPONENT_RESPONSE_LESSONS.length >= 6);

  for (const lesson of OPPONENT_RESPONSE_LESSONS) {
    const game = new Chess(lesson.fen);
    const parts = responseMoveParts(lesson.expectedMove);
    const move = game.move({
      from: parts.from,
      to: parts.to,
      ...(parts.promotion ? { promotion: parts.promotion } : {}),
    });

    assert.ok(move, `${lesson.title}: response move is legal`);
    assert.ok(lesson.lastMove.length > 15);
    assert.ok(lesson.threat.length > 30);
    assert.ok(lesson.nextPlan.length > 30);
  }
});

test("every multi-move puzzle is a fully legal alternating teaching line", () => {
  assert.ok(MULTI_MOVE_PUZZLES.length >= 5);

  for (const puzzle of MULTI_MOVE_PUZZLES) {
    const game = new Chess(puzzle.fen);
    let playerTurns = 0;
    let opponentTurns = 0;

    for (const step of puzzle.steps) {
      const expectedActor = game.turn() === puzzle.playerColor ? "player" : "opponent";
      assert.equal(
        step.actor,
        expectedActor,
        `${puzzle.title}: ${step.uci} actor matches side to move`
      );

      const parts = multiMoveParts(step.uci);
      const move = game.move({
        from: parts.from,
        to: parts.to,
        ...(parts.promotion ? { promotion: parts.promotion } : {}),
      });

      assert.ok(move, `${puzzle.title}: ${step.uci} is legal`);
      if (step.actor === "player") {
        playerTurns += 1;
        assert.ok(step.mistakeLesson?.length > 30, `${puzzle.title}: player step explains wrong moves`);
      } else {
        opponentTurns += 1;
      }
      assert.ok(step.explanation.length > 25);
    }

    assert.ok(playerTurns >= 2, `${puzzle.title}: requires multiple player decisions`);
    assert.ok(opponentTurns >= 1, `${puzzle.title}: includes an opponent response`);
    assert.ok(puzzle.takeaway.length > 30);
  }
});

test("mating multi-move lessons really end in checkmate", () => {
  for (const puzzleId of ["scholars-pattern", "black-punishes-king"]) {
    const puzzle = MULTI_MOVE_PUZZLES.find((item) => item.id === puzzleId);
    assert.ok(puzzle);
    const game = new Chess(puzzle.fen);

    for (const step of puzzle.steps) {
      const parts = multiMoveParts(step.uci);
      game.move({
        from: parts.from,
        to: parts.to,
        ...(parts.promotion ? { promotion: parts.promotion } : {}),
      });
    }

    assert.equal(game.isCheckmate(), true, `${puzzle.title} ends in mate`);
  }
});

test("advanced Academy systems persist locally and are wired into Learn/Puzzles", async () => {
  const learn = await readFile(new URL("../src/components/LearnChess.tsx", import.meta.url), "utf8");
  const pieceSchools = await readFile(new URL("../src/components/PieceSchools.tsx", import.meta.url), "utf8");
  const responses = await readFile(new URL("../src/components/OpponentResponseTrainer.tsx", import.meta.url), "utf8");
  const multi = await readFile(new URL("../src/components/MultiMovePuzzleMode.tsx", import.meta.url), "utf8");
  const puzzles = await readFile(new URL("../src/components/PuzzleMode.tsx", import.meta.url), "utf8");

  assert.match(learn, /PieceSchools/);
  assert.match(learn, /OpponentResponseTrainer/);
  assert.match(learn, /Piece Schools/);
  assert.match(learn, /Opponent response/);

  assert.match(pieceSchools, /localStorage/);
  assert.match(pieceSchools, /lessons mastered/);
  assert.match(responses, /localStorage/);
  assert.match(responses, /Opponent's last move/);

  assert.match(multi, /MULTI-MOVE LAB/);
  assert.match(multi, /opponent/);
  assert.match(multi, /localStorage/);
  assert.match(puzzles, /MultiMovePuzzleMode/);
});
