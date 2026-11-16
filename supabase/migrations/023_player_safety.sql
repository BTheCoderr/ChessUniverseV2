-- App Store user-safety controls for online Chess Universe.
create schema if not exists private;
-- Reports are private to the service operators; players may submit but not read reports.
create table if not exists public.player_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  -- Keep nullable for ON DELETE SET NULL, but reject NULL on player submissions via RLS.
  game_id uuid references public.games(id) on delete set null,
  reason text not null check (reason in ('abusive_behavior', 'offensive_username', 'cheating', 'other')),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved')),
  created_at timestamptz not null default now(),
  constraint no_self_reports check (reporter_id <> reported_id)
);

-- Limit report spam: one report per player/opponent/match.
create unique index if not exists player_reports_once_per_match_idx
  on public.player_reports(reporter_id, reported_id, game_id);

create index if not exists player_reports_status_created_idx
  on public.player_reports(status, created_at desc);

alter table public.player_reports enable row level security;
-- Never allow clients to set report id, status, or created_at.
revoke all on public.player_reports from public, anon, authenticated;
grant insert (reporter_id, reported_id, game_id, reason) on public.player_reports to authenticated;
grant select, insert, update, delete on public.player_reports to service_role;
drop policy if exists "players can submit own reports" on public.player_reports;
create policy "players can submit own reports"
on public.player_reports for insert to authenticated
with check (
  (select auth.uid()) = reporter_id
  and game_id is not null
  and exists (
    -- A player may report only the opponent they actually faced.
    select 1 from public.games g
    where g.id = game_id
      and (
        (g.white_id = reporter_id and g.black_id = reported_id)
        or (g.black_id = reporter_id and g.white_id = reported_id)
      )
  )
);

create table if not exists public.player_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_blocks check (blocker_id <> blocked_id)
);

create index if not exists player_blocks_blocked_idx on public.player_blocks(blocked_id, blocker_id);
alter table public.player_blocks enable row level security;
revoke all on public.player_blocks from public, anon, authenticated;
grant select, delete on public.player_blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.player_blocks to authenticated;
grant select, insert, update, delete on public.player_blocks to service_role;
drop policy if exists "players see own blocks" on public.player_blocks;
create policy "players see own blocks"
on public.player_blocks for select to authenticated
using ((select auth.uid()) = blocker_id);
drop policy if exists "players insert own blocks" on public.player_blocks;
create policy "players insert own blocks"
on public.player_blocks for insert to authenticated
with check ((select auth.uid()) = blocker_id);
drop policy if exists "players delete own blocks" on public.player_blocks;
create policy "players delete own blocks"
on public.player_blocks for delete to authenticated
using ((select auth.uid()) = blocker_id);

-- This applies to all matchmaking paths, including private challenges and
-- server-authoritative Edge Function joins. Existing games remain playable.
create or replace function private.reject_blocked_matchup()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- Archived games and cancellations must never be affected by future blocks.
  if new.status not in ('waiting', 'active') or new.white_id is null then return new; end if;
  if new.black_id is not null and exists (
    select 1 from public.player_blocks b
    where (b.blocker_id = new.white_id and b.blocked_id = new.black_id)
       or (b.blocker_id = new.black_id and b.blocked_id = new.white_id)
  ) then
    raise exception 'This matchup is not available';
  end if;
  if new.invited_user_id is not null and exists (
    select 1 from public.player_blocks b
    where (b.blocker_id = new.white_id and b.blocked_id = new.invited_user_id)
       or (b.blocker_id = new.invited_user_id and b.blocked_id = new.white_id)
  ) then
    raise exception 'This private challenge is not available';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_blocked_matchup() from public, anon, authenticated;
drop trigger if exists reject_blocked_matchups on public.games;
create trigger reject_blocked_matchups
before insert or update of white_id, black_id, invited_user_id on public.games
for each row execute function private.reject_blocked_matchup();
