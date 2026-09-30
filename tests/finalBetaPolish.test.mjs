import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { readFile } from "node:fs/promises";
import { OPENING_BRANCHES, OPENING_LESSONS, openingMoveParts } from "../src/lib/openingLessons.ts";
import { OFFLINE_PUZZLES } from "../src/lib/puzzles.ts";
import {
  ACADEMY_ACTIVITY_KEY,
  loadReviewActivity,
  recordReviewAttempt,
} from "../src/lib/academyReviewState.ts";

function installLocalStorage() {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); },
      clear() { store.clear(); },
    },
  };
  return store;
}

test("new opening lessons remain fully legal", () => {
  assert.ok(OPENING_LESSONS.length >= 6);
  const names = new Set(OPENING_LESSONS.map((lesson) => lesson.id));
  assert.ok(names.has("caro-kann"));
  assert.ok(names.has("kings-indian"));

  for (const opening of OPENING_LESSONS) {
    const game = new Chess();
    for (const step of opening.steps) {
      const move = openingMoveParts(step.uci);
      assert.doesNotThrow(() => {
        game.move({
          from: move.from,
          to: move.to,
          ...(move.promotion ? { promotion: move.promotion } : {}),
        });
      }, `${opening.name}: ${step.uci} should be legal`);
    }
  }
});

test("every opening branch is a legal line from the starting position", () => {
  for (const [openingId, branches] of Object.entries(OPENING_BRANCHES)) {
    assert.ok(branches.length > 0, `${openingId} has a branch`);

    for (const branch of branches) {
      const game = new Chess();
      for (const uci of branch.line) {
        const move = openingMoveParts(uci);
        assert.doesNotThrow(() => {
          game.move({
            from: move.from,
            to: move.to,
            ...(move.promotion ? { promotion: move.promotion } : {}),
          });
        }, `${openingId} / ${branch.name}: ${uci} should be legal`);
      }

      assert.ok(branch.idea.length > 30);
      assert.ok(branch.responsePlan.length > 30);
    }
  }
});

test("every offline puzzle answer is legal and mate-tagged puzzles really mate", () => {
  assert.ok(OFFLINE_PUZZLES.length >= 15);

  for (const puzzle of OFFLINE_PUZZLES) {
    const game = new Chess(puzzle.fen);
    const uci = puzzle.solution;
    const move = game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      ...(uci[4] ? { promotion: uci[4] } : {}),
    });

    assert.ok(move, `${puzzle.title}: solution is legal`);
    if (puzzle.expectsMate) {
      assert.equal(game.isCheckmate(), true, `${puzzle.title}: tagged mate is checkmate`);
    }
  }
});

test("Academy learning activity is capped and records correct/incorrect attempts", () => {
  const store = installLocalStorage();

  for (let index = 0; index < 205; index += 1) {
    recordReviewAttempt(
      `lesson-${index % 3}`,
      index % 2 === 0,
      index % 2 === 0 ? "e2e4" : "d2d3",
      1_000_000 + index
    );
  }

  const activity = loadReviewActivity();
  assert.equal(activity.length, 200);
  assert.equal(activity.at(-1)?.attemptedAt, 1_000_204);
  assert.ok(store.has(ACADEMY_ACTIVITY_KEY));
  assert.ok(activity.some((item) => item.correct));
  assert.ok(activity.some((item) => !item.correct));
});

test("Academy transfer is scoped to learning keys and exposes export/import/reset", async () => {
  const transfer = await readFile(new URL("../src/lib/academyTransfer.ts", import.meta.url), "utf8");

  assert.match(transfer, /ACADEMY_STORAGE_KEYS/);
  assert.match(transfer, /ACADEMY_PLACEMENT_KEY/);
  assert.match(transfer, /ACADEMY_PROGRESS_KEY/);
  assert.match(transfer, /ACADEMY_REVIEW_KEY/);
  assert.match(transfer, /ACADEMY_ACTIVITY_KEY/);
  assert.match(transfer, /PIECE_SCHOOL_PROGRESS_KEY/);
  assert.match(transfer, /RESPONSE_PROGRESS_KEY/);
  assert.match(transfer, /ENDGAME_PROGRESS_KEY/);
  assert.match(transfer, /PUZZLE_PROGRESS_KEY/);
  assert.match(transfer, /MULTI_MOVE_PROGRESS_KEY/);
  assert.match(transfer, /buildAcademyExport/);
  assert.match(transfer, /importAcademyExport/);
  assert.match(transfer, /resetAcademyProgress/);
  assert.doesNotMatch(transfer, /saved_practice_games|games|profile/);
});

test("ChessBoard exposes keyboard navigation and reduced-motion styling", async () => {
  const board = await readFile(new URL("../src/components/ChessBoard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(board, /ArrowLeft/);
  assert.match(board, /ArrowRight/);
  assert.match(board, /ArrowUp/);
  assert.match(board, /ArrowDown/);
  assert.match(board, /aria-pressed/);
  assert.match(board, /Use arrow keys to move between squares/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /focus-visible/);
});

test("Stockfish review exposes principal variation and teaching context", async () => {
  const stockfish = await readFile(new URL("../src/lib/stockfish.ts", import.meta.url), "utf8");
  const review = await readFile(new URL("../src/lib/gameReview.ts", import.meta.url), "utf8");
  const library = await readFile(new URL("../src/components/GameLibrary.tsx", import.meta.url), "utf8");

  assert.match(stockfish, /pv: string\[\]/);
  assert.match(stockfish, /pvMatch/);
  assert.match(review, /bestLineSan/);
  assert.match(review, /explanation/);
  assert.match(review, /reviewCue/);
  assert.match(library, /What to inspect/);
  assert.match(library, /Engine line/);
});

test("player identity polish is deterministic and database-free", async () => {
  const profile = await readFile(new URL("../src/components/ProfileTrophyCase.tsx", import.meta.url), "utf8");

  assert.match(profile, /identityPiece/);
  assert.match(profile, /player-identity-card/);
  assert.match(profile, /PLAYER IDENTITY/);
  assert.doesNotMatch(profile, /avatar_url|uploadAvatar|storage\.from/);
});
