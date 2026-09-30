-- Universe rewards and Battle Chess unlocks:
-- - server-derived unlocks only
-- - 3 rated wins unlock Battle Chess + Back Rank Lab
-- - Season, Championship and rating achievements grant permanent rewards
-- - authenticated users may read the catalog and only their own unlocks

create table if not exists public.universe_rewards (
  reward_key text primary key,
  name text not null,
  category text not null check (category in ('mode','formation','badge','title')),
  description text not null,
  requirement_copy text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.player_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_key text not null references public.universe_rewards(reward_key) on delete cascade,
  source_type text not null,
  source_id uuid,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, reward_key)
);

create index if not exists player_unlocks_user_unlocked_idx
  on public.player_unlocks(user_id, unlocked_at desc);

alter table public.universe_rewards enable row level security;
alter table public.player_unlocks enable row level security;

drop policy if exists "authenticated users can read universe rewards" on public.universe_rewards;
create policy "authenticated users can read universe rewards"
on public.universe_rewards for select to authenticated using (true);

drop policy if exists "users can read own universe unlocks" on public.player_unlocks;
create policy "users can read own universe unlocks"
on public.player_unlocks for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.universe_rewards from anon, authenticated;
revoke all on public.player_unlocks from anon, authenticated;
grant select on public.universe_rewards to authenticated;
grant select on public.player_unlocks to authenticated;

insert into public.universe_rewards(reward_key,name,category,description,requirement_copy,sort_order)
values
('battle_chess','Battle Chess','mode','Unlock Battle Chess: Formation Clash, a Black-first fight with alternate back-rank formations.','Win 3 rated online games.',10),
('back_rank_lab','Back Rank Lab','formation','Choose alternate legal back-rank formations in Battle Chess.','Win 3 rated online games.',20),
('season_challenger','Season Challenger','badge','A profile reward for making real progress in a Chess Universe season.','Earn 6 Season points.',30),
('season_contender','Season Contender','badge','A higher Season reward for sustained rated competition.','Earn 15 Season points.',40),
('championship_crest','Championship Crest','badge','Marks qualification for a Chess Universe Season Championship.','Qualify for a Season Championship.',50),
('champion_crown','Champion Crown','title','Permanent reward for winning a Chess Universe Season Championship.','Win a Season Championship.',60),
('universe_master_title','Universe Master','title','The top all-time rating title in Chess Universe.','Reach a 1900 all-time rating.',70)
on conflict (reward_key) do update
set name=excluded.name, category=excluded.category, description=excluded.description,
    requirement_copy=excluded.requirement_copy, sort_order=excluded.sort_order;

create or replace function private.refresh_player_unlocks(
  target_user_id uuid,
  event_time timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles%rowtype;
  best_season_points integer;
begin
  if target_user_id is null then return; end if;

  select * into profile_row from public.profiles where id=target_user_id;
  if not found then return; end if;

  select coalesce(max(points),0)
  into best_season_points
  from public.season_player_stats
  where user_id=target_user_id;

  if profile_row.wins >= 3 then
    insert into public.player_unlocks(user_id,reward_key,source_type,unlocked_at)
    values
      (target_user_id,'battle_chess','rated_wins',event_time),
      (target_user_id,'back_rank_lab','rated_wins',event_time)
    on conflict (user_id,reward_key) do nothing;
  end if;

  if best_season_points >= 6 then
    insert into public.player_unlocks(user_id,reward_key,source_type,unlocked_at)
    values (target_user_id,'season_challenger','season_points',event_time)
    on conflict (user_id,reward_key) do nothing;
  end if;

  if best_season_points >= 15 then
    insert into public.player_unlocks(user_id,reward_key,source_type,unlocked_at)
    values (target_user_id,'season_contender','season_points',event_time)
    on conflict (user_id,reward_key) do nothing;
  end if;

  insert into public.player_unlocks(user_id,reward_key,source_type,source_id,unlocked_at)
  select target_user_id,'championship_crest','championship_qualification',te.tournament_id,
         coalesce(te.checked_in_at,te.created_at,event_time)
  from public.tournament_entries te
  where te.user_id=target_user_id
    and te.status in ('qualified','checked_in','eliminated','champion')
  order by te.created_at
  limit 1
  on conflict (user_id,reward_key) do nothing;

  insert into public.player_unlocks(user_id,reward_key,source_type,source_id,unlocked_at)
  select target_user_id,'champion_crown','championship_win',te.tournament_id,
         coalesce(te.updated_at,event_time)
  from public.tournament_entries te
  where te.user_id=target_user_id and te.status='champion'
  order by te.updated_at
  limit 1
  on conflict (user_id,reward_key) do nothing;

  if profile_row.rating >= 1900 then
    insert into public.player_unlocks(user_id,reward_key,source_type,unlocked_at)
    values (target_user_id,'universe_master_title','rating',event_time)
    on conflict (user_id,reward_key) do nothing;
  end if;
end;
$$;

revoke all on function private.refresh_player_unlocks(uuid,timestamptz)
from public, anon, authenticated;

create or replace function public.refresh_universe_unlocks_service(
  actor_id uuid,
  event_time timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=actor_id) then
    raise exception 'Player profile not found';
  end if;
  perform private.refresh_player_unlocks(actor_id,event_time);
end;
$$;

revoke all on function public.refresh_universe_unlocks_service(uuid,timestamptz)
from public, anon, authenticated;
grant execute on function public.refresh_universe_unlocks_service(uuid,timestamptz)
to service_role;

create or replace function private.refresh_unlocks_from_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_player_unlocks(new.id,now());
  return new;
end;
$$;

revoke all on function private.refresh_unlocks_from_profile()
from public, anon, authenticated;

drop trigger if exists profiles_refresh_universe_unlocks on public.profiles;
create trigger profiles_refresh_universe_unlocks
after update of wins, rating on public.profiles
for each row
when (old.wins is distinct from new.wins or old.rating is distinct from new.rating)
execute function private.refresh_unlocks_from_profile();

create or replace function private.refresh_unlocks_from_season_stats()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_player_unlocks(new.user_id,now());
  return new;
end;
$$;

revoke all on function private.refresh_unlocks_from_season_stats()
from public, anon, authenticated;

drop trigger if exists season_stats_refresh_universe_unlocks on public.season_player_stats;
create trigger season_stats_refresh_universe_unlocks
after insert or update of points, wins, games_played on public.season_player_stats
for each row
execute function private.refresh_unlocks_from_season_stats();

create or replace function private.refresh_unlocks_from_tournament_entry()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_player_unlocks(new.user_id,now());
  return new;
end;
$$;

revoke all on function private.refresh_unlocks_from_tournament_entry()
from public, anon, authenticated;

drop trigger if exists tournament_entries_refresh_universe_unlocks on public.tournament_entries;
create trigger tournament_entries_refresh_universe_unlocks
after insert or update of status on public.tournament_entries
for each row
execute function private.refresh_unlocks_from_tournament_entry();

select private.refresh_player_unlocks(id,now()) from public.profiles;
