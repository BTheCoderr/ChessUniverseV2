import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("profile hardening removes anonymous profile reads and the obsolete move RPC", async () => {
  const migration = await source("supabase/migrations/010_profile_and_legacy_rpc_hardening.sql");
  assert.match(migration, /revoke select on table public\.profiles from anon/);
  assert.match(migration, /to authenticated/);
  assert.match(migration, /drop function if exists public\.submit_game_move/);
});

test("game state migration enforces live online invariants", async () => {
  const migration = await source("supabase/migrations/011_game_state_integrity_constraints.sql");
  assert.match(migration, /games_draw_offer_active_check/);
  assert.match(migration, /games_completed_result_check/);
  assert.match(migration, /games_active_has_opponent_check/);
  assert.match(migration, /games_waiting_has_no_opponent_check/);
  assert.match(migration, /games_fen_turn_matches_check/);
  assert.match(migration, /drop index if exists public\.game_moves_game_ply_idx/);
});
