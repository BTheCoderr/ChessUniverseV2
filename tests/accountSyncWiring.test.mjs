import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("signed-in identity is passed only to sync-capable local surfaces", async () => {
  const app = await source("src/App.tsx");
  assert.match(app, /<LocalGame[\s\S]*userId=\{session\?\.user\.id\}/);
  assert.match(app, /<GameLibrary[\s\S]*userId=\{session\?\.user\.id\}/);
  assert.match(app, /<PuzzleMode[\s\S]*userId=\{session\?\.user\.id\}/);
  assert.match(app, /<HistoryMode[\s\S]*userId=\{session\?\.user\.id\}/);
});

test("Puzzles and Legends merge remote progress before writing it back", async () => {
  const puzzles = await source("src/components/PuzzleMode.tsx");
  assert.match(puzzles, /from\("player_progress"\)/);
  assert.match(puzzles, /mergePuzzleProgress/);
  assert.match(puzzles, /puzzle_progress:/);
  assert.match(puzzles, /if \(!cloudReady \|\| !userId \|\| !supabase\) return/);

  const history = await source("src/components/HistoryMode.tsx");
  assert.match(history, /from\("player_progress"\)/);
  assert.match(history, /mergeHistoryProgress/);
  assert.match(history, /legends_progress:/);
  assert.match(history, /if \(!cloudReady \|\| !userId \|\| !supabase\) return/);
});

test("finished Practice games sync and My Games reconciles offline deletions", async () => {
  const practice = await source("src/components/LocalGame.tsx");
  assert.match(practice, /from\("saved_practice_games"\)/);
  assert.match(practice, /onConflict: "user_id,local_id"/);
  assert.match(practice, /if \(userId && supabase\)/);

  const library = await source("src/components/GameLibrary.tsx");
  assert.match(library, /loadGameLibraryTombstones/);
  assert.match(library, /replaceGameLibraryTombstones/);
  assert.match(library, /from\("saved_practice_games"\)/);
  assert.match(library, /\.delete\(\)/);
  assert.match(library, /\.limit\(50\)/);
});

test("sound and haptic preference sync remains optional and signed-in only", async () => {
  const practice = await source("src/components/LocalGame.tsx");
  assert.match(practice, /select\("preferences"\)/);
  assert.match(practice, /normalizeFeedbackSettings/);
  assert.match(practice, /preferences: \{ feedback: next \}/);
});
