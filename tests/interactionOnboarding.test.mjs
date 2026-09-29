import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("board supports touch and mouse drag attempts without removing tap controls", async () => {
  const board = await source("src/components/ChessBoard.tsx");
  assert.match(board, /onMoveAttempt\?:/);
  assert.match(board, /data-square=/);
  assert.match(board, /onPointerDown=/);
  assert.match(board, /onPointerMove=/);
  assert.match(board, /onPointerUp=/);
  assert.match(board, /onSquareClick\(square\)/);
});

test("Practice wires dragging plus local sound and haptics", async () => {
  const practice = await source("src/components/LocalGame.tsx");
  assert.match(practice, /onMoveAttempt=\{attemptMove\}/);
  assert.match(practice, /playChessFeedback/);
  assert.match(practice, /Sound & Haptics/);
  assert.match(practice, /saveFeedbackSettings/);
});

test("Puzzles, install prompt, and first-run onboarding are connected without Supabase", async () => {
  const app = await source("src/App.tsx");
  assert.match(app, /"puzzles"/);
  assert.match(app, /<PuzzleMode/);
  assert.match(app, /<InstallApp/);
  assert.match(app, /<FirstRunOnboarding/);
  assert.match(app, />Puzzles</);
  assert.match(app, /Offline mode — Learn, Practice, Puzzles/);
});
