import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("finished Practice games are archived and expose Review saved game", async () => {
  const local = await source("src/components/LocalGame.tsx");
  assert.match(local, /saveGameToLibrary/);
  assert.match(local, /if \(!resultText \|\| moves\.length === 0\) return/);
  assert.match(local, /Review saved game/);
  assert.match(local, /gameId/);
});

test("My Games remains an offline-capable route", async () => {
  const app = await source("src/App.tsx");
  assert.match(app, /\| "library"/);
  assert.match(app, /<GameLibrary/);
  assert.match(app, />My Games</);
  assert.match(app, /Offline mode — Learn, Practice, .*My Games/);
});
