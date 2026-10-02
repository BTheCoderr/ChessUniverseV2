import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("practice game-over coach finds a turning point and exposes direct retraining", async () => {
  const local = await source("src/components/LocalGame.tsx");
  assert.match(local, /reviewStoredMove/);
  assert.match(local, /summarizeCoachReviews/);
  assert.match(local, /postGameSummary/);
  assert.match(local, /Train this mistake/);
  assert.match(local, /onTrainMoment/);
});

test("training handoff opens the exact saved game and pre-move position", async () => {
  const app = await source("src/App.tsx");
  const library = await source("src/components/GameLibrary.tsx");
  assert.match(app, /trainingMoment/);
  assert.match(app, /libraryGameId/);
  assert.match(library, /initialGameId/);
  assert.match(library, /trainingMoment/);
  assert.match(library, /buildUniversePosition\([^,]+\.moves,\s*[^)]+\.index\)/);
  assert.match(library, /Stockfish preferred/);
});
