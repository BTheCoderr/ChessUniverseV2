import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("rated games store immutable before and after rating snapshots", async () => {
  const migration = await source("supabase/migrations/015_ratings_leaderboard_profiles.sql");
  assert.match(migration, /white_rating_before integer/);
  assert.match(migration, /white_rating_after integer/);
  assert.match(migration, /black_rating_before integer/);
  assert.match(migration, /black_rating_after integer/);
  assert.match(migration, /private\.finalize_online_result/);
  assert.match(migration, /rating_delta := round\(32\.0/);
  assert.match(migration, /white_after := greatest\(100/);
  assert.match(migration, /if game_row\.white_rating_after is not null/);
});

test("all online completion paths use the shared rating finalizer", async () => {
  const migration = await source("supabase/migrations/015_ratings_leaderboard_profiles.sql");
  const calls = migration.match(/perform private\.finalize_online_result/g) ?? [];
  assert.equal(calls.length, 3);
  assert.match(migration, /next_status = 'completed'/);
  assert.match(migration, /finish_online_game/);
  assert.match(migration, /draw_action = 'accept'/);
});

test("lobby exposes leaderboard, named opponents and rating deltas", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  assert.match(lobby, /Classic leaderboard/);
  assert.match(lobby, /order\("rating", \{ ascending: false \}\)/);
  assert.match(lobby, /PLAYER PROFILE/);
  assert.match(lobby, /ratingDeltaForPlayer/);
  assert.match(lobby, /challenged you/);
  assert.match(lobby, /Traditional and Battle ratings are tracked separately/);
});

test("online table displays player identity and post-game rating movement", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  assert.match(game, /matchup-profile-strip/);
  assert.match(game, /opponentName/);
  assert.match(game, /white_rating_before/);
  assert.match(game, /post-game-summary/);
  assert.match(game, /myRatingDelta/);
  assert.match(game, /rating-up/);
});

test("private invite inspection returns only safe profile competition fields", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");
  assert.match(edge, /action === "inspect_challenge"/);
  assert.match(edge, /select\("id,username,rating,wins,losses,draws"\)/);
  assert.doesNotMatch(edge, /inspect_challenge[\s\S]{0,1200}email/);
});
