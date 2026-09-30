import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("lobby creates and joins games through the authenticated Edge Function", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  assert.match(lobby, /functions\.invoke\("online-game"/);
  assert.match(lobby, /createTraditionalGame/);\n  assert.match(lobby, /isPrivate \? "create_private_challenge" : "create_game"/);
  assert.match(lobby, /action: "join_game"/);
  assert.doesNotMatch(lobby, /rpc\("create_waiting_game"/);
  assert.doesNotMatch(lobby, /rpc\("join_waiting_game"/);
});

test("online game service routes create and join through service-only RPCs", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");
  assert.match(edge, /create_waiting_game_service/);
  assert.match(edge, /join_waiting_game_service/);
  assert.match(edge, /const userId = authData\.user\.id/);
});

test("hardening migration limits browser grants and service RPC execution", async () => {
  const migration = await source("supabase/migrations/008_online_service_hardening.sql");
  assert.match(migration, /revoke all on table public\.games from anon, authenticated/);
  assert.match(migration, /grant select on table public\.games to authenticated/);
  assert.match(migration, /create index if not exists games_draw_offer_by_idx/);
  assert.match(migration, /create_waiting_game_service/);
  assert.match(migration, /join_waiting_game_service/);
  assert.match(migration, /grant execute on function public\.create_waiting_game_service[\s\S]*to service_role/);
  assert.match(migration, /grant execute on function public\.join_waiting_game_service[\s\S]*to service_role/);
});
