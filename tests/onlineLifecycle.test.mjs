import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("online game tracks opponent presence and reconnect state", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  assert.match(game, /config: \{ presence: \{ key: myColor \} \}/);
  assert.match(game, /\.on\("presence", \{ event: "sync" \}/);
  assert.match(game, /channel\.track\(\{ side: myColor/);
  assert.match(game, /CHANNEL_ERROR/);
  assert.match(game, /Opponent online/);
  assert.match(game, /Opponent away \/ reconnecting/);
});

test("online game exposes draw offer, accept, and decline actions", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  assert.match(game, /action: "offer_draw"/);
  assert.match(game, /action: "accept_draw"/);
  assert.match(game, /action: "decline_draw"/);
  assert.match(game, /Draw offer sent/);
  assert.match(game, /Draw offered/);

  const edge = await source("supabase/functions/online-game/index.ts");
  assert.match(edge, /handle_online_draw_offer/);
  assert.match(edge, /action === "offer_draw"/);
  assert.match(edge, /action === "accept_draw"/);
  assert.match(edge, /action === "decline_draw"/);
});

test("online lifecycle migration records results exactly when games complete", async () => {
  const migration = await source("supabase/migrations/007_online_lifecycle_v3.sql");
  assert.match(migration, /add column if not exists draw_offer_by uuid/);
  assert.match(migration, /create or replace function public\.handle_online_draw_offer/);
  assert.match(migration, /set wins = wins \+ 1/);
  assert.match(migration, /set losses = losses \+ 1/);
  assert.match(migration, /set draws = draws \+ 1/);
  assert.match(migration, /draw_offer_by = null/);
  assert.match(migration, /grant execute on function public\.handle_online_draw_offer[\s\S]*to service_role/);
});

test("lobby loads profile record and recent completed games", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  assert.match(lobby, /select\("rating,wins,losses,draws"\)/);
  assert.match(lobby, /W-L-D/);
  assert.match(lobby, /Recent online games/);
  assert.match(lobby, /resultForPlayer/);
  assert.match(lobby, /status === "completed"/);
});

test("online board supports drag attempts without sending client-computed state", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  assert.match(game, /onMoveAttempt=\{\(from, to\) => void attemptMove\(from, to\)\}/);

  const invokeIndex = game.indexOf('action: "move"');
  const payload = game.slice(invokeIndex, invokeIndex + 300);
  assert.doesNotMatch(payload, /fen\s*:/i);
  assert.doesNotMatch(payload, /position\s*:/i);
});
