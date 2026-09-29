-- Account sync foundation for offline-first progress and saved Practice games.

create table if not exists public.player_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  legends_progress jsonb not null default '{}'::jsonb,
  puzzle_progress jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  sync_version integer not null default 1 check (sync_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(legends_progress) = 'object'),
  check (jsonb_typeof(puzzle_progress) = 'array'),
  check (jsonb_typeof(preferences) = 'object')
);

create table if not exists public.saved_practice_games (
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_id text not null check (char_length(local_id) between 1 and 100),
  completed_at timestamptz not null,
  mode text not null check (mode in ('ai','local')),
  difficulty text not null check (difficulty in ('beginner','easy','medium','hard')),
  time_control_minutes integer not null check (time_control_minutes between 0 and 180),
  result text not null check (char_length(result) between 1 and 120),
  moves jsonb not null check (jsonb_typeof(moves) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_id)
);

create index if not exists saved_practice_games_user_completed_idx
  on public.saved_practice_games(user_id, completed_at desc);

alter table public.player_progress enable row level security;
alter table public.saved_practice_games enable row level security;

revoke all on table public.player_progress from anon, authenticated;
revoke all on table public.saved_practice_games from anon, authenticated;

grant select, insert, update, delete on table public.player_progress to authenticated;
grant select, insert, update, delete on table public.saved_practice_games to authenticated;

drop policy if exists "users read own progress" on public.player_progress;
create policy "users read own progress"
on public.player_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users insert own progress" on public.player_progress;
create policy "users insert own progress"
on public.player_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users update own progress" on public.player_progress;
create policy "users update own progress"
on public.player_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users delete own progress" on public.player_progress;
create policy "users delete own progress"
on public.player_progress
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users read own practice games" on public.saved_practice_games;
create policy "users read own practice games"
on public.saved_practice_games
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users insert own practice games" on public.saved_practice_games;
create policy "users insert own practice games"
on public.saved_practice_games
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users update own practice games" on public.saved_practice_games;
create policy "users update own practice games"
on public.saved_practice_games
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users delete own practice games" on public.saved_practice_games;
create policy "users delete own practice games"
on public.saved_practice_games
for delete
to authenticated
using ((select auth.uid()) = user_id);
