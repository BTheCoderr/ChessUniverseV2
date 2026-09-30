import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Championship schema is read-only to browser roles", async () => {
  const migration = await source("supabase/migrations/017_season_championship.sql");
  assert.match(migration, /create table if not exists public\.tournaments/);
  assert.match(migration, /create table if not exists public\.tournament_entries/);
  assert.match(migration, /create table if not exists public\.tournament_matches/);
  assert.match(migration, /alter table public\.tournaments enable row level security/);
  assert.match(migration, /grant select on public\.tournaments to authenticated/);
  assert.match(migration, /grant select on public\.tournament_entries to authenticated/);
  assert.match(migration, /grant select on public\.tournament_matches to authenticated/);
  assert.match(migration, /revoke all on public\.tournament_matches from anon, authenticated/);
});

test("Championship lifecycle is service-role only", async () => {
  const migration = await source("supabase/migrations/017_season_championship.sql");
  assert.match(migration, /sync_tournament_service/);
  assert.match(migration, /check_in_tournament_service/);
  assert.match(migration, /open_tournament_match_service/);
  assert.match(migration, /to service_role/);
  assert.match(migration, /revoke all on function public\.sync_tournament_service/);
  assert.match(migration, /revoke all on function public\.check_in_tournament_service/);
  assert.match(migration, /revoke all on function public\.open_tournament_match_service/);
});

test("knockout bracket advances winners and replays draws", async () => {
  const migration = await source("supabase/migrations/017_season_championship.sql");
  assert.match(migration, /private\.advance_tournament_match/);
  assert.match(migration, /private\.process_tournament_byes/);
  assert.match(migration, /private\.resolve_tournament_result/);
  assert.match(migration, /if next_result = 'draw'/);
  assert.match(migration, /replay_count = replay_count \+ 1/);
  assert.match(migration, /winner_id = winning_user_id/);
  assert.match(migration, /champion_id = winning_user_id/);
  assert.match(migration, /runner_up_id = losing_user_id/);
  assert.match(migration, /perform private\.resolve_tournament_result/);
});

test("Championship games cannot escape into normal rematches", async () => {
  const migration = await source("supabase/migrations/017_season_championship.sql");
  assert.match(migration, /source_game\.tournament_match_id is not null/);
  assert.match(migration, /Championship games use the tournament bracket/);

  const game = await source("src/components/OnlineGame.tsx");
  assert.match(game, /gameRow\.tournament_match_id/);
  assert.match(game, /Replay required/);
  assert.match(game, /Bracket result recorded/);
  assert.match(game, /!gameRow\.tournament_match_id/);
});

test("online game service exposes trusted Championship actions", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");
  assert.match(edge, /action === "championship_status"/);
  assert.match(edge, /action === "championship_check_in"/);
  assert.match(edge, /action === "open_tournament_match"/);
  assert.match(edge, /sync_tournament_service/);
  assert.match(edge, /check_in_tournament_service/);
  assert.match(edge, /open_tournament_match_service/);
  assert.match(edge, /join_waiting_game_service/);
});

test("Championship UI supports qualification, check-in, bracket play and history", async () => {
  const component = await source("src/components/SeasonChampionship.tsx");
  const lobby = await source("src/components/OnlineLobby.tsx");

  assert.match(component, /SEASON CHAMPIONSHIP/);
  assert.match(component, /Qualification race is live/);
  assert.match(component, /Check in/);
  assert.match(component, /Quarterfinals/);
  assert.match(component, /Semifinals/);
  assert.match(component, /Winner becomes Season Champion/);
  assert.match(component, /Champion history/);
  assert.match(component, /draws replay/);
  assert.match(lobby, /<SeasonChampionship session=\{session\} onOpenGame=\{onOpenGame\} \/>/);
});
