import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("achievement and title tables stay server-managed", async () => {
  const migration = await source("supabase/migrations/020_achievements_mastery_titles.sql");

  assert.match(migration, /create table if not exists public\.achievement_definitions/);
  assert.match(migration, /create table if not exists public\.player_achievements/);
  assert.match(migration, /create table if not exists public\.title_definitions/);
  assert.match(migration, /create table if not exists public\.player_titles/);
  assert.match(migration, /create table if not exists public\.profile_equipment/);
  assert.match(migration, /revoke all on public\.player_achievements from anon, authenticated/);
  assert.match(migration, /revoke all on public\.player_titles from anon, authenticated/);
  assert.match(migration, /revoke all on public\.profile_equipment from anon, authenticated/);
});

test("trusted progress grants Classic, Battle, formation, Season and rating achievements", async () => {
  const migration = await source("supabase/migrations/020_achievements_mastery_titles.sql");

  assert.match(migration, /classic_wins >= 5/);
  assert.match(migration, /classic_wins >= 10/);
  assert.match(migration, /classic_wins >= 25/);
  assert.match(migration, /battle_wins >= 1/);
  assert.match(migration, /battle_wins >= 10/);
  assert.match(migration, /formation_count >= 3/);
  assert.match(migration, /max_formation_games >= 10/);
  assert.match(migration, /has_season_contender/);
  assert.match(migration, /has_champion_crown/);
  assert.match(migration, /classic_rating >= 1900/);
});

test("equipped titles must already be earned", async () => {
  const migration = await source("supabase/migrations/020_achievements_mastery_titles.sql");

  assert.match(migration, /equip_player_title_service/);
  assert.match(migration, /player_titles/);
  assert.match(migration, /That title has not been earned/);
  assert.match(migration, /to service_role/);
  assert.match(migration, /revoke all on function public\.equip_player_title_service/);
});

test("formation mastery uses completed Battle games with stable thresholds", async () => {
  const mastery = await source("src/lib/formationMastery.ts");

  assert.match(mastery, /Novice.+minGames: 1/);
  assert.match(mastery, /Adept.+minGames: 3/);
  assert.match(mastery, /Veteran.+minGames: 5/);
  assert.match(mastery, /Elite.+minGames: 10/);
  assert.match(mastery, /Master.+minGames: 25/);
  assert.match(mastery, /gamesToNext/);
});

test("profile showcase exposes achievements, titles and formation stats without private sources", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");
  const showcaseBlock = edge.slice(
    edge.indexOf('if (action === "profile_showcase")'),
    edge.indexOf('if (action === "equip_title")')
  );

  assert.match(showcaseBlock, /player_achievements/);
  assert.match(showcaseBlock, /achievement_definitions/);
  assert.match(showcaseBlock, /player_titles/);
  assert.match(showcaseBlock, /title_definitions/);
  assert.match(showcaseBlock, /profile_equipment/);
  assert.match(showcaseBlock, /formationStats/);
  assert.match(showcaseBlock, /equippedTitle/);
  assert.doesNotMatch(showcaseBlock, /source_type/);
  assert.doesNotMatch(showcaseBlock, /source_id/);
  assert.doesNotMatch(showcaseBlock, /session\.user\.email/);
});

test("title equipment only changes the authenticated player's profile", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");
  const equipBlock = edge.slice(
    edge.indexOf('if (action === "equip_title")'),
    edge.indexOf('if (action === "accept_rematch")')
  );

  assert.match(equipBlock, /actor_id: userId/);
  assert.match(equipBlock, /equip_player_title_service/);
  assert.doesNotMatch(equipBlock, /body\.userId/);
});

test("Trophy Case renders achievements, mastery and editable earned titles", async () => {
  const trophy = await source("src/components/ProfileTrophyCase.tsx");
  const account = await source("src/components/AuthPanel.tsx");

  assert.match(trophy, /Equipped title/);
  assert.match(trophy, /Earned titles/);
  assert.match(trophy, /Achievements/);
  assert.match(trophy, /Formation mastery/);
  assert.match(trophy, /formationMastery/);
  assert.match(trophy, /action: "equip_title"/);
  assert.match(trophy, /equipped \? null : title\.titleKey/);
  assert.match(account, /ProfileTrophyCase userId=\{session\.user\.id\} editable/);
});
