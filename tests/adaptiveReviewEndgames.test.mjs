import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { readFile } from "node:fs/promises";
import { ENDGAME_LESSONS, endgameMoveParts } from "../src/lib/endgameLessons.ts";
import {
  adaptiveQueue,
  loadReviewState,
  recordReviewAttempt,
  reviewCatalog,
} from "../src/lib/academyReview.ts";

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

test("every Endgame School lesson has a legal answer and explicit mistake teaching", () => {
  assert.ok(ENDGAME_LESSONS.length >= 8);

  for (const lesson of ENDGAME_LESSONS) {
    const game = new Chess(lesson.fen);
    const parts = endgameMoveParts(lesson.expectedMove);
    const move = game.move({
      from: parts.from,
      to: parts.to,
      ...(parts.promotion ? { promotion: parts.promotion } : {}),
    });

    assert.ok(move, `${lesson.title}: expected move is legal`);
    assert.ok(lesson.principle.length > 5);
    assert.ok(lesson.why.length > 35);
    assert.ok(lesson.mistakeLesson.length > 35);
    assert.ok(lesson.opponentPlan.length > 30);
    assert.ok(lesson.takeaway.length > 25);
  }
});

test("adaptive review records misses immediately and spaces successful reviews", () => {
  installLocalStorage();
  const now = 1_000_000;

  recordReviewAttempt("queen-coordinate", false, "d1e2", now);
  let state = loadReviewState();

  assert.equal(state["queen-coordinate"].misses, 1);
  assert.equal(state["queen-coordinate"].correct, 0);
  assert.equal(state["queen-coordinate"].nextReviewAt, now);

  recordReviewAttempt("queen-coordinate", true, "d1h5", now + 100);
  state = loadReviewState();

  assert.equal(state["queen-coordinate"].misses, 1);
  assert.equal(state["queen-coordinate"].correct, 1);
  assert.ok(state["queen-coordinate"].nextReviewAt > now + 100);
});

test("adaptive queue prioritizes repeated and overdue mistakes", () => {
  installLocalStorage();
  const now = 10_000_000;

  recordReviewAttempt("queen-coordinate", false, "d1e2", now - 5000);
  recordReviewAttempt("queen-coordinate", false, "d1f3", now - 4000);
  recordReviewAttempt("rook-open-file", false, "a1a2", now - 3000);

  const queue = adaptiveQueue(now);
  assert.ok(queue.length >= 2);
  assert.equal(queue[0].lesson.id, "queen-coordinate");
  assert.equal(queue[0].record.misses, 2);
});

test("review catalog includes piece decisions, endgames and multi-move decisions", () => {
  const catalog = reviewCatalog();
  const ids = new Set(catalog.map((lesson) => lesson.id));

  assert.ok(ids.has("queen-coordinate"));
  assert.ok(ids.has("endgame-opposition"));
  assert.ok([...ids].some((id) => id.startsWith("decision-")));
  assert.ok([...ids].some((id) => id.startsWith("multi-")));
});

test("mistake feedback and adaptive review are wired into playable Academy surfaces", async () => {
  const learn = await readFile(new URL("../src/components/LearnChess.tsx", import.meta.url), "utf8");
  const pieceSchools = await readFile(new URL("../src/components/PieceSchools.tsx", import.meta.url), "utf8");
  const responses = await readFile(new URL("../src/components/OpponentResponseTrainer.tsx", import.meta.url), "utf8");
  const multi = await readFile(new URL("../src/components/MultiMovePuzzleMode.tsx", import.meta.url), "utf8");
  const endgames = await readFile(new URL("../src/components/EndgameSchool.tsx", import.meta.url), "utf8");
  const review = await readFile(new URL("../src/components/AdaptiveReview.tsx", import.meta.url), "utf8");

  assert.match(learn, /EndgameSchool/);
  assert.match(learn, /AdaptiveReview/);
  assert.match(learn, /recordReviewAttempt/);
  assert.match(pieceSchools, /recordReviewAttempt/);
  assert.match(responses, /recordReviewAttempt/);
  assert.match(multi, /recordReviewAttempt/);
  assert.match(endgames, /Why that move is weaker/);
  assert.match(review, /Practice what you actually miss/);
  assert.match(review, /Correct reviews get spaced farther apart/);
});
