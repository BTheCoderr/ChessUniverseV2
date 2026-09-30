import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("head-to-head rivalry is computed server-side and service-only", async () => {
  const migration = await source("supabase/migrations/021_head_to_head_rivals.sql");

  assert.match(migration, /get_head_to_head_service/);
  assert.match(migration, /relationship_label/);
  assert.match(migration, /total_games >= 3 then 'Rival'/);
  assert.match(migration, /total_games >= 10 then 'Nemesis'/);
  assert.match(migration, /favoriteBattleFormation/);
  assert.match(migration, /streakResult/);
  assert.match(migration, /revoke all on function public\.get_head_to_head_service/);
  assert.match(migration, /grant execute on function public\.get_head_to_head_service/);
  assert.match(migration, /to service_role/);
});

test("direct player challenges are targeted, private, and trusted", async () => {
  const migration = await source("supabase/migrations/021_head_to_head_rivals.sql");

  assert.match(migration, /create_targeted_challenge_service/);
  assert.match(migration, /target_user_id=actor_id/);
  assert.match(migration, /perform private\.assert_battle_access\(actor_id,formation_key\)/);
  assert.match(migration, /perform private\.assert_battle_access\(target_user_id,'classic'\)/);
  assert.match(migration, /true,target_user_id,formation_key/);
  assert.match(migration, /revoke all on function public\.create_targeted_challenge_service/);
  assert.match(migration, /to service_role/);
});

test("profile showcase includes only the viewer's rivalry with the selected player", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");
  const showcase = edge.slice(
    edge.indexOf('if (action === "profile_showcase")'),
    edge.indexOf('if (action === "challenge_rival")')
  );

  assert.match(showcase, /targetUserId !== userId/);
  assert.match(showcase, /get_head_to_head_service/);
  assert.match(showcase, /actor_id: userId/);
  assert.match(showcase, /target_user_id: targetUserId/);
  assert.match(showcase, /rivalry/);
});

test("rival challenge action cannot impersonate another actor", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");
  const challenge = edge.slice(
    edge.indexOf('if (action === "challenge_rival")'),
    edge.indexOf('if (action === "equip_title")')
  );

  assert.match(challenge, /create_targeted_challenge_service/);
  assert.match(challenge, /actor_id: userId/);
  assert.match(challenge, /target_user_id: targetUserId/);
  assert.doesNotMatch(challenge, /actor_id: body/);
});

test("Trophy Case renders rivalry records and a direct challenge loop", async () => {
  const trophy = await source("src/components/ProfileTrophyCase.tsx");
  const lobby = await source("src/components/OnlineLobby.tsx");

  assert.match(trophy, /HEAD-TO-HEAD/);
  assert.match(trophy, /Classic series/);
  assert.match(trophy, /Battle series/);
  assert.match(trophy, /Current series streak/);
  assert.match(trophy, /Shared Battle formation/);
  assert.match(trophy, /Challenge again/);
  assert.match(trophy, /action: "challenge_rival"/);
  assert.match(trophy, /onOpenGame\?\.\(String\(data\.gameId\)\)/);
  assert.match(lobby, /ProfileTrophyCase userId=\{spotlightProfile\.id\} compact onOpenGame=\{onOpenGame\}/);
});
