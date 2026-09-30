import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("online Battle schema keeps Battle rating separate from Classic rating", async () => {
  const migration = await source("supabase/migrations/019_online_battle_chess.sql");
  assert.match(migration, /create table if not exists public\.battle_player_stats/);
  assert.match(migration, /create table if not exists public\.battle_formation_stats/);
  assert.match(migration, /battle_white_rating_before integer/);
  assert.match(migration, /battle_black_rating_after integer/);
  assert.match(migration, /if game_row\.variant='battle'/);
  assert.match(migration, /update public\.battle_player_stats/);
  assert.match(migration, /update public\.battle_formation_stats/);
  assert.match(migration, /return;[\s\S]*if game_row\.white_rating_after is not null/);
});

test("Battle tables require server-validated unlocks and formations", async () => {
  const migration = await source("supabase/migrations/019_online_battle_chess.sql");
  assert.match(migration, /private\.assert_battle_access/);
  assert.match(migration, /reward_key='battle_chess'/);
  assert.match(migration, /battle_formation_requirement/);
  assert.match(migration, /That Battle formation is still locked/);
  assert.match(migration, /create_battle_game_service/);
  assert.match(migration, /to service_role/);
  assert.match(migration, /target_game\.variant='battle'/);
});

test("Battle rematches preserve the original formation", async () => {
  const migration = await source("supabase/migrations/019_online_battle_chess.sql");
  assert.match(migration, /source_game\.variant='battle'/);
  assert.match(migration, /private\.battle_formation_fen\(source_game\.battle_formation_key\)/);
  assert.match(migration, /source_game\.battle_formation_key/);
});

test("trusted online service routes Battle creation through Battle RPC", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");
  assert.match(edge, /variant === "battle"/);
  assert.match(edge, /formationKey/);
  assert.match(edge, /create_battle_game_service/);
  assert.match(edge, /game_private: false/);
  assert.match(edge, /game_private: true/);
  assert.match(edge, /challengerBattleStats/);
});

test("online lobby exposes Battle arena, Battle leaderboard, and separate history", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  assert.match(lobby, /BATTLE ONLINE/);
  assert.match(lobby, /Formation Clash Arena/);
  assert.match(lobby, /Open Battle tables/);
  assert.match(lobby, /Battle leaderboard/);
  assert.match(lobby, /Recent Battle games/);
  assert.match(lobby, /Recent Classic games/);
  assert.match(lobby, /battleRatingDeltaForPlayer/);
  assert.match(lobby, /favorite formation/);
});

test("online board shows Battle identity and Battle Elo movement", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  assert.match(game, /BATTLE CHESS ONLINE/);
  assert.match(game, /Formation Clash/);
  assert.match(game, /battle_white_rating_before/);
  assert.match(game, /Battle rating/);
  assert.match(game, /Battle results update only Battle rating and Battle stats/);
});

test("Universe Hub routes unlocked players to online Battle", async () => {
  const hub = await source("src/components/UniverseHub.tsx");
  const app = await source("src/App.tsx");
  assert.match(hub, /Battle online/);
  assert.match(hub, /onOpenOnline/);
  assert.match(app, /onOpenOnline=\{\(\) => navigate\("online"\)\}/);
});
