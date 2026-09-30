import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("rank tiers have clear rating thresholds", async () => {
  const progression = await source("src/lib/progression.ts");
  assert.match(progression, /Rookie.+minRating: 0/);
  assert.match(progression, /Bronze.+minRating: 1100/);
  assert.match(progression, /Silver.+minRating: 1250/);
  assert.match(progression, /Gold.+minRating: 1400/);
  assert.match(progression, /Platinum.+minRating: 1550/);
  assert.match(progression, /Diamond.+minRating: 1700/);
  assert.match(progression, /Universe Master.+minRating: 1900/);
});

test("season progression uses visible milestone unlocks", async () => {
  const progression = await source("src/lib/progression.ts");
  assert.match(progression, /First Move/);
  assert.match(progression, /Challenger/);
  assert.match(progression, /Contender/);
  assert.match(progression, /Elite Run/);
  assert.match(progression, /Universe Crown/);
  assert.match(progression, /milestoneUnlocked/);
});

test("Season 1 migration is browser read-only and scores rated games server-side", async () => {
  const migration = await source("supabase/migrations/016_season_1_progression.sql");
  assert.match(migration, /create table if not exists public\.seasons/);
  assert.match(migration, /create table if not exists public\.season_player_stats/);
  assert.match(migration, /alter table public\.seasons enable row level security/);
  assert.match(migration, /grant select on public\.seasons to authenticated/);
  assert.match(migration, /grant select on public\.season_player_stats to authenticated/);
  assert.match(migration, /revoke all on public\.season_player_stats from anon, authenticated/);
  assert.match(migration, /when next_result = 'white' then 3/);
  assert.match(migration, /when next_result = 'draw' then 1/);
  assert.match(migration, /season_id = active_season_id/);
  assert.match(migration, /revoke all on function private\.finalize_online_result/);
});

test("online lobby renders season standings and championship qualification", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  const season = await source("src/components/SeasonProgression.tsx");
  assert.match(lobby, /<SeasonProgression session=\{session\} \/>/);
  assert.match(season, /CURRENT SEASON/);
  assert.match(season, /Season standings/);
  assert.match(season, /Season Championship/);
  assert.match(season, /Win = 3 · Draw = 1/);
  assert.match(season, /Top \{season\.championship_slots\} qualify/);
});

test("profile shows all-time rank progress", async () => {
  const profile = await source("src/components/AuthPanel.tsx");
  assert.match(profile, /rankForRating/);
  assert.match(profile, /rank-pill/);
  assert.match(profile, /rating to/);
  assert.match(profile, /rank-progress-track/);
});
