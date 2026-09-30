import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Universe rewards cannot be self-granted from the browser", async () => {
  const migration = await source("supabase/migrations/018_universe_rewards_battle_chess.sql");
  assert.match(migration, /alter table public\.player_unlocks enable row level security/);
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /revoke all on public\.player_unlocks from anon, authenticated/);
  assert.match(migration, /grant select on public\.player_unlocks to authenticated/);
  assert.match(migration, /refresh_universe_unlocks_service/);
  assert.match(migration, /to service_role/);
});

test("three rated wins unlock Battle Chess and Back Rank Lab", async () => {
  const migration = await source("supabase/migrations/018_universe_rewards_battle_chess.sql");
  assert.match(migration, /if profile_row\.wins >= 3/);
  assert.match(migration, /'battle_chess'/);
  assert.match(migration, /'back_rank_lab'/);
});

test("Season and Championship achievements grant permanent rewards", async () => {
  const migration = await source("supabase/migrations/018_universe_rewards_battle_chess.sql");
  assert.match(migration, /best_season_points >= 6/);
  assert.match(migration, /best_season_points >= 15/);
  assert.match(migration, /'championship_crest'/);
  assert.match(migration, /te\.status='champion'/);
  assert.match(migration, /'champion_crown'/);
  assert.match(migration, /profile_row\.rating >= 1900/);
});

test("Battle Chess formations are achievement-gated", async () => {
  const battle = await source("src/lib/battleChess.ts");
  assert.match(battle, /Cavalry Wing/);
  assert.match(battle, /requires: "back_rank_lab"/);
  assert.match(battle, /Crest Guard/);
  assert.match(battle, /requires: "championship_crest"/);
  assert.match(battle, /Crown Wall/);
  assert.match(battle, /requires: "champion_crown"/);
  assert.match(battle, /Master Grid/);
  assert.match(battle, /requires: "universe_master_title"/);
  assert.match(battle, / b - - 0 1/);
});

test("Universe hub gates Battle Chess and exposes reward progression", async () => {
  const hub = await source("src/components/UniverseHub.tsx");
  const app = await source("src/App.tsx");
  assert.match(hub, /Reward Vault/);
  assert.match(hub, /3 rated wins/);
  assert.match(hub, /Battle formations/);
  assert.match(hub, /Battle locally/);
  assert.match(hub, /Battle online/);
  assert.match(app, /"universe"/);
  assert.match(app, /"battle"/);
  assert.match(app, /battleUnlockKeys\.includes\("battle_chess"\)/);
  assert.match(app, /<BattleChessGame/);
});

test("Battle Chess uses normal chess legality from alternate FEN formations", async () => {
  const game = await source("src/components/BattleChessGame.tsx");
  assert.match(game, /Formation Clash/);
  assert.match(game, /new Chess\(game\.fen\(\)\)/);
  assert.match(game, /getComputerMove/);
  assert.match(game, /Black moves first/);
  assert.match(game, /castling disabled/);
});
