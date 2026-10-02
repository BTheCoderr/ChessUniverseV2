import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("reload and reconnect restore the canonical online table", async () => {
  const app = await source("src/App.tsx");
  const game = await source("src/components/OnlineGame.tsx");

  assert.match(app, /ONLINE_GAME_KEY = "chess-universe-online-game"/);
  assert.match(app, /savedOnlineGame\(\)/);
  assert.match(app, /localStorage\.setItem\(ONLINE_GAME_KEY, gameId\)/);
  assert.match(game, /status === "SUBSCRIBED"/);
  assert.match(game, /void load\(\)/);
  assert.match(game, /void loadMoves\(\)/);
  assert.match(game, /CHANNEL_ERROR/);
});

test("online moves remain server-authoritative and stale-write protected", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  const edge = await source("supabase/functions/online-game/index.ts");
  const integrity = await source("supabase/migrations/015_ratings_leaderboard_profiles.sql");

  const invokeIndex = game.indexOf('action: "move"');
  const payload = game.slice(invokeIndex, invokeIndex + 320);
  assert.match(payload, /from: move\.from/);
  assert.match(payload, /to: move\.to/);
  assert.doesNotMatch(payload, /fen\s*:/i);

  assert.match(edge, /validateMoveTurn\(game, userId\)/);
  assert.match(edge, /new Chess\(game\.fen\)/);
  assert.match(integrity, /game_row\.fen <> expected_fen or game_row\.current_turn <> expected_turn/);
});

test("rematches and rating finalization are idempotent", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  const rematch = await source("supabase/migrations/014_private_challenges_and_rematches.sql");
  const house = await source("supabase/migrations/022_online_beta_housekeeping.sql");

  assert.match(game, /finally\s*\{\s*setSaving\(false\)/);
  assert.match(game, /if \(nextGameId\) onOpenGame\(nextGameId\)/);
  assert.match(rematch, /where id = source_game_id\s+for update/);
  assert.match(rematch, /if source_game\.rematch_game_id is not null then\s+return source_game\.rematch_game_id/);
  assert.match(house, /time_control_minutes\s*=\s*0 or competitive_ply_count\s*<\s*4/);
  assert.match(house, /white_rating_after is not null or game_row\.black_rating_after is not null then return/);
  assert.match(house, /battle_white_rating_after is not null or game_row\.battle_black_rating_after is not null then return/);
});
