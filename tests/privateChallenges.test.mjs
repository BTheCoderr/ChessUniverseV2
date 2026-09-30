import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("challenge links survive sign-in and route back to the online lobby", async () => {
  const app = await source("src/App.tsx");
  assert.match(app, /CHALLENGE_PARAM = "challenge"/);
  assert.match(app, /challengeFromUrl/);
  assert.match(app, /pendingChallengeId/);
  assert.match(app, /challengeGameId=\{pendingChallengeId\}/);
  assert.match(app, /onChallengeHandled=\{clearChallengeLink\}/);
});

test("private challenges stay out of public open tables and support sharing", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  assert.match(lobby, /action: "create_private_challenge"/);
  assert.match(lobby, /game\.status === "waiting" && !game\.is_private/);
  assert.match(lobby, /navigator\.share/);
  assert.match(lobby, /navigator\.clipboard\.writeText/);
  assert.match(lobby, /url\.searchParams\.set\("challenge", gameId\)/);
  assert.match(lobby, /Challenges for you/);
  assert.match(lobby, /My private invites/);
});

test("rematches are created and accepted through the trusted online service", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  assert.match(game, /action = gameRow\.rematch_game_id \? "accept_rematch" : "create_rematch"/);
  assert.match(game, /Opponent wants a rematch/);
  assert.match(game, /Accept rematch/);
  assert.match(game, /Open rematch/);

  const edge = await source("supabase/functions/online-game/index.ts");
  assert.match(edge, /create_private_challenge_service/);
  assert.match(edge, /create_rematch_game_service/);
  assert.match(edge, /action === "accept_rematch"/);
  assert.match(edge, /join_waiting_game_service/);
});

test("private challenge migration protects discovery and targeted rematches", async () => {
  const migration = await source("supabase/migrations/014_private_challenges_and_rematches.sql");
  assert.match(migration, /add column if not exists is_private boolean not null default false/);
  assert.match(migration, /add column if not exists invited_user_id uuid/);
  assert.match(migration, /status = 'waiting' and is_private = false/);
  assert.match(migration, /or invited_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /create_private_challenge_service/);
  assert.match(migration, /create_rematch_game_service/);
  assert.match(migration, /invited_user_id is null or invited_user_id = actor_id/);
  assert.match(migration, /grant execute on function public\.create_private_challenge_service[\s\S]*to service_role/);
  assert.match(migration, /grant execute on function public\.create_rematch_game_service[\s\S]*to service_role/);
});
