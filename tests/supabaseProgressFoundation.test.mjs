import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("account sync migration keeps all user data owner-scoped", async () => {
  const migration = await source("supabase/migrations/012_account_progress_sync_foundation.sql");
  assert.match(migration, /create table if not exists public\.player_progress/);
  assert.match(migration, /create table if not exists public\.saved_practice_games/);
  assert.match(migration, /alter table public\.player_progress enable row level security/);
  assert.match(migration, /alter table public\.saved_practice_games enable row level security/);
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(migration, /grant .* to anon/i);
});

test("Supabase client is generated-schema typed", async () => {
  const client = await source("src/lib/supabase.ts");
  const types = await source("src/lib/database.types.ts");
  assert.match(client, /import type \{ Database \}/);
  assert.match(client, /createClient<Database>/);
  assert.match(client, /SupabaseClient<Database>/);
  assert.match(types, /player_progress:/);
  assert.match(types, /saved_practice_games:/);
  assert.match(types, /create_waiting_game_service:/);
  assert.match(types, /join_waiting_game_service:/);
});
