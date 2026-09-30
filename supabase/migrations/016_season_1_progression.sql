-- Season 1 progression:
-- - authenticated read-only season/standings data
-- - 3/1/0 season points updated atomically with rated game completion
-- - completed games tagged to the active season
-- - season standings preserve all-time Elo instead of resetting profiles

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming'
    check (status in ('upcoming','active','completed')),
  championship_slots integer not null default 8
    check (championship_slots between 2 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.season_player_stats (
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  games_played integer not null default 0 check (games_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  points integer not null default 0 check (points >= 0),
  rating_start integer not null check (rating_start >= 0),
  rating_current integer not null check (rating_current >= 0),
  rating_peak integer not null check (rating_peak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id),
  check (games_played = wins + losses + draws)
);

create index if not exists season_player_stats_standings_idx
  on public.season_player_stats (season_id, points desc, wins desc, rating_current desc);

alter table public.games
  add column if not exists season_id uuid references public.seasons(id) on delete set null;

create index if not exists games_season_id_idx
  on public.games (season_id)
  where season_id is not null;

alter table public.seasons enable row level security;
alter table public.season_player_stats enable row level security;

drop policy if exists "authenticated users can read seasons" on public.seasons;
create policy "authenticated users can read seasons"
on public.seasons
for select
to authenticated
using (true);

drop policy if exists "authenticated users can read season standings" on public.season_player_stats;
create policy "authenticated users can read season standings"
on public.season_player_stats
for select
to authenticated
using (true);

revoke all on public.seasons from anon, authenticated;
revoke all on public.season_player_stats from anon, authenticated;
grant select on public.seasons to authenticated;
grant select on public.season_player_stats to authenticated;

insert into public.seasons (
  name, slug, starts_at, ends_at, status, championship_slots
)
values (
  'Beta Season 1',
  'beta-season-1',
  '2026-09-30 01:50:00+00',
  '2027-01-01 04:59:59+00',
  'active',
  8
)
on conflict (slug) do update
set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = excluded.status,
  championship_slots = excluded.championship_slots,
  updated_at = now();

create or replace function private.finalize_online_result(
  target_game_id uuid,
  next_result text,
  event_time timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game_row public.games%rowtype;
  white_before integer;
  black_before integer;
  white_after integer;
  black_after integer;
  white_score numeric;
  expected_white numeric;
  rating_delta integer;
  active_season_id uuid;
  white_points integer;
  black_points integer;
begin
  if next_result not in ('white', 'black', 'draw') then
    raise exception 'Invalid game result';
  end if;

  select * into game_row
  from public.games
  where id = target_game_id
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  if game_row.white_rating_after is not null or game_row.black_rating_after is not null then
    return;
  end if;

  if game_row.white_id is null or game_row.black_id is null then
    return;
  end if;

  select rating into white_before
  from public.profiles
  where id = game_row.white_id
  for update;

  select rating into black_before
  from public.profiles
  where id = game_row.black_id
  for update;

  if white_before is null or black_before is null then
    return;
  end if;

  white_score := case
    when next_result = 'white' then 1.0
    when next_result = 'draw' then 0.5
    else 0.0
  end;

  expected_white := 1.0 / (1.0 + power(10.0::numeric, (black_before - white_before)::numeric / 400.0));
  rating_delta := round(32.0 * (white_score - expected_white))::integer;

  white_after := greatest(100, white_before + rating_delta);
  black_after := greatest(100, black_before - rating_delta);

  update public.profiles
  set
    rating = case
      when id = game_row.white_id then white_after
      else black_after
    end,
    wins = wins + case
      when next_result = 'white' and id = game_row.white_id then 1
      when next_result = 'black' and id = game_row.black_id then 1
      else 0
    end,
    losses = losses + case
      when next_result = 'white' and id = game_row.black_id then 1
      when next_result = 'black' and id = game_row.white_id then 1
      else 0
    end,
    draws = draws + case when next_result = 'draw' then 1 else 0 end,
    updated_at = event_time
  where id in (game_row.white_id, game_row.black_id);

  select s.id into active_season_id
  from public.seasons s
  where s.status = 'active'
    and s.starts_at <= event_time
    and s.ends_at > event_time
  order by s.starts_at desc
  limit 1;

  if active_season_id is not null then
    white_points := case
      when next_result = 'white' then 3
      when next_result = 'draw' then 1
      else 0
    end;

    black_points := case
      when next_result = 'black' then 3
      when next_result = 'draw' then 1
      else 0
    end;

    insert into public.season_player_stats (
      season_id, user_id, rating_start, rating_current, rating_peak
    )
    values
      (active_season_id, game_row.white_id, white_before, white_before, white_before),
      (active_season_id, game_row.black_id, black_before, black_before, black_before)
    on conflict (season_id, user_id) do nothing;

    update public.season_player_stats
    set
      games_played = games_played + 1,
      wins = wins + case when next_result = 'white' then 1 else 0 end,
      losses = losses + case when next_result = 'black' then 1 else 0 end,
      draws = draws + case when next_result = 'draw' then 1 else 0 end,
      points = points + white_points,
      rating_current = white_after,
      rating_peak = greatest(rating_peak, white_after),
      updated_at = event_time
    where season_id = active_season_id
      and user_id = game_row.white_id;

    update public.season_player_stats
    set
      games_played = games_played + 1,
      wins = wins + case when next_result = 'black' then 1 else 0 end,
      losses = losses + case when next_result = 'white' then 1 else 0 end,
      draws = draws + case when next_result = 'draw' then 1 else 0 end,
      points = points + black_points,
      rating_current = black_after,
      rating_peak = greatest(rating_peak, black_after),
      updated_at = event_time
    where season_id = active_season_id
      and user_id = game_row.black_id;
  end if;

  update public.games
  set
    white_rating_before = white_before,
    white_rating_after = white_after,
    black_rating_before = black_before,
    black_rating_after = black_after,
    season_id = active_season_id,
    updated_at = event_time
  where id = target_game_id;
end;
$$;

revoke all on function private.finalize_online_result(uuid, text, timestamptz)
  from public, anon, authenticated;
