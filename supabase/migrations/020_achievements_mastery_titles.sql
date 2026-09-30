-- Achievements, formation mastery support and equipped titles:
-- - achievements/titles are permanently earned from trusted Classic, Battle, Season and Championship data
-- - formation mastery remains derived from server-tracked Battle formation usage
-- - title equipment is service-role only and validates ownership before changing profile equipment

create table if not exists public.achievement_definitions (
  achievement_key text primary key,
  name text not null,
  description text not null,
  icon text not null default '•',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.player_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null references public.achievement_definitions(achievement_key) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

create table if not exists public.title_definitions (
  title_key text primary key,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.player_titles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_key text not null references public.title_definitions(title_key) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, title_key)
);

create table if not exists public.profile_equipment (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  equipped_title_key text references public.title_definitions(title_key) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists player_achievements_earned_idx
  on public.player_achievements(user_id, earned_at desc);
create index if not exists player_titles_earned_idx
  on public.player_titles(user_id, earned_at desc);

alter table public.achievement_definitions enable row level security;
alter table public.player_achievements enable row level security;
alter table public.title_definitions enable row level security;
alter table public.player_titles enable row level security;
alter table public.profile_equipment enable row level security;

revoke all on public.achievement_definitions from anon, authenticated;
revoke all on public.player_achievements from anon, authenticated;
revoke all on public.title_definitions from anon, authenticated;
revoke all on public.player_titles from anon, authenticated;
revoke all on public.profile_equipment from anon, authenticated;

insert into public.achievement_definitions(achievement_key,name,description,icon,sort_order)
values
  ('classic_5','Classic Five','Win 5 rated Classic games.','♙',10),
  ('classic_10','Classic Ten','Win 10 rated Classic games.','♖',20),
  ('classic_25','Classic Twenty-Five','Win 25 rated Classic games.','♔',30),
  ('first_battle_win','First Battle Win','Win your first rated Formation Clash.','⚔',40),
  ('battle_5','Battle Five','Win 5 rated Battle games.','⚔',50),
  ('battle_10','Battle Veteran','Win 10 rated Battle games.','⚔',60),
  ('battle_25','Battle Twenty-Five','Win 25 rated Battle games.','♛',70),
  ('formation_explorer','Formation Explorer','Play rated Battle games with 3 different formations.','♞',80),
  ('formation_specialist','Formation Specialist','Play 10 rated Battle games with one formation.','◆',90),
  ('season_challenger','Season Challenger','Earn the Season Challenger reward.','◇',100),
  ('season_contender','Season Contender','Earn the Season Contender reward.','◆',110),
  ('championship_qualifier','Championship Qualifier','Qualify for a Chess Universe Season Championship.','♜',120),
  ('season_champion','Season Champion','Win a Chess Universe Season Championship.','♛',130),
  ('rating_1500','1500 Club','Reach a 1500 Classic rating.','✦',140),
  ('rating_1700','1700 Club','Reach a 1700 Classic rating.','✦',150),
  ('rating_1900','Universe Master','Reach a 1900 Classic rating.','✦',160)
on conflict (achievement_key) do update
set name=excluded.name,description=excluded.description,icon=excluded.icon,sort_order=excluded.sort_order;

insert into public.title_definitions(title_key,name,description,sort_order)
values
  ('season_contender','Season Contender','Earned by reaching 15 Season points.',10),
  ('championship_qualifier','Championship Qualifier','Earned by qualifying for a Season Championship.',20),
  ('battle_veteran','Battle Veteran','Earned by winning 10 rated Battle games.',30),
  ('formation_specialist','Formation Specialist','Earned by playing 10 rated games with one Battle formation.',40),
  ('champion','Champion','Earned by winning a Season Championship.',50),
  ('universe_master','Universe Master','Earned by reaching a 1900 Classic rating.',60)
on conflict (title_key) do update
set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order;

create or replace function private.refresh_player_achievements(
  target_user_id uuid,
  event_time timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  classic_wins integer := 0;
  classic_rating integer := 1200;
  battle_wins integer := 0;
  formation_count integer := 0;
  max_formation_games integer := 0;
  has_season_challenger boolean := false;
  has_season_contender boolean := false;
  has_championship_crest boolean := false;
  has_champion_crown boolean := false;
  has_universe_master boolean := false;
begin
  if target_user_id is null then return; end if;

  select p.wins,p.rating
  into classic_wins,classic_rating
  from public.profiles p
  where p.id=target_user_id;

  if not found then return; end if;

  select coalesce(b.wins,0)
  into battle_wins
  from public.battle_player_stats b
  where b.user_id=target_user_id;

  battle_wins := coalesce(battle_wins,0);

  select
    count(*) filter (where bfs.games_played > 0),
    coalesce(max(bfs.games_played),0)
  into formation_count,max_formation_games
  from public.battle_formation_stats bfs
  where bfs.user_id=target_user_id;

  select
    exists(select 1 from public.player_unlocks u where u.user_id=target_user_id and u.reward_key='season_challenger'),
    exists(select 1 from public.player_unlocks u where u.user_id=target_user_id and u.reward_key='season_contender'),
    exists(select 1 from public.player_unlocks u where u.user_id=target_user_id and u.reward_key='championship_crest'),
    exists(select 1 from public.player_unlocks u where u.user_id=target_user_id and u.reward_key='champion_crown'),
    exists(select 1 from public.player_unlocks u where u.user_id=target_user_id and u.reward_key='universe_master_title')
  into
    has_season_challenger,
    has_season_contender,
    has_championship_crest,
    has_champion_crown,
    has_universe_master;

  if classic_wins >= 5 then
    insert into public.player_achievements values(target_user_id,'classic_5',event_time) on conflict do nothing;
  end if;
  if classic_wins >= 10 then
    insert into public.player_achievements values(target_user_id,'classic_10',event_time) on conflict do nothing;
  end if;
  if classic_wins >= 25 then
    insert into public.player_achievements values(target_user_id,'classic_25',event_time) on conflict do nothing;
  end if;

  if battle_wins >= 1 then
    insert into public.player_achievements values(target_user_id,'first_battle_win',event_time) on conflict do nothing;
  end if;
  if battle_wins >= 5 then
    insert into public.player_achievements values(target_user_id,'battle_5',event_time) on conflict do nothing;
  end if;
  if battle_wins >= 10 then
    insert into public.player_achievements values(target_user_id,'battle_10',event_time) on conflict do nothing;
    insert into public.player_titles values(target_user_id,'battle_veteran',event_time) on conflict do nothing;
  end if;
  if battle_wins >= 25 then
    insert into public.player_achievements values(target_user_id,'battle_25',event_time) on conflict do nothing;
  end if;

  if formation_count >= 3 then
    insert into public.player_achievements values(target_user_id,'formation_explorer',event_time) on conflict do nothing;
  end if;
  if max_formation_games >= 10 then
    insert into public.player_achievements values(target_user_id,'formation_specialist',event_time) on conflict do nothing;
    insert into public.player_titles values(target_user_id,'formation_specialist',event_time) on conflict do nothing;
  end if;

  if has_season_challenger then
    insert into public.player_achievements values(target_user_id,'season_challenger',event_time) on conflict do nothing;
  end if;
  if has_season_contender then
    insert into public.player_achievements values(target_user_id,'season_contender',event_time) on conflict do nothing;
    insert into public.player_titles values(target_user_id,'season_contender',event_time) on conflict do nothing;
  end if;
  if has_championship_crest then
    insert into public.player_achievements values(target_user_id,'championship_qualifier',event_time) on conflict do nothing;
    insert into public.player_titles values(target_user_id,'championship_qualifier',event_time) on conflict do nothing;
  end if;
  if has_champion_crown then
    insert into public.player_achievements values(target_user_id,'season_champion',event_time) on conflict do nothing;
    insert into public.player_titles values(target_user_id,'champion',event_time) on conflict do nothing;
  end if;

  if classic_rating >= 1500 then
    insert into public.player_achievements values(target_user_id,'rating_1500',event_time) on conflict do nothing;
  end if;
  if classic_rating >= 1700 then
    insert into public.player_achievements values(target_user_id,'rating_1700',event_time) on conflict do nothing;
  end if;
  if classic_rating >= 1900 or has_universe_master then
    insert into public.player_achievements values(target_user_id,'rating_1900',event_time) on conflict do nothing;
    insert into public.player_titles values(target_user_id,'universe_master',event_time) on conflict do nothing;
  end if;
end;
$$;

revoke all on function private.refresh_player_achievements(uuid,timestamptz)
from public,anon,authenticated;

create or replace function public.equip_player_title_service(
  actor_id uuid,
  requested_title_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=actor_id) then
    raise exception 'Player profile not found';
  end if;

  if requested_title_key is not null and not exists(
    select 1 from public.player_titles
    where user_id=actor_id and title_key=requested_title_key
  ) then
    raise exception 'That title has not been earned';
  end if;

  insert into public.profile_equipment(user_id,equipped_title_key,updated_at)
  values(actor_id,requested_title_key,now())
  on conflict(user_id) do update
  set equipped_title_key=excluded.equipped_title_key,
      updated_at=excluded.updated_at;

  return true;
end;
$$;

revoke all on function public.equip_player_title_service(uuid,text)
from public,anon,authenticated;
grant execute on function public.equip_player_title_service(uuid,text)
to service_role;

create or replace function private.refresh_achievements_from_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_player_achievements(new.id,now());
  return new;
end;
$$;
revoke all on function private.refresh_achievements_from_profile() from public,anon,authenticated;

drop trigger if exists profiles_refresh_achievements on public.profiles;
create trigger profiles_refresh_achievements
after update of wins,rating on public.profiles
for each row
when (old.wins is distinct from new.wins or old.rating is distinct from new.rating)
execute function private.refresh_achievements_from_profile();

create or replace function private.refresh_achievements_from_battle_stats()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_player_achievements(new.user_id,now());
  return new;
end;
$$;
revoke all on function private.refresh_achievements_from_battle_stats() from public,anon,authenticated;

drop trigger if exists battle_stats_refresh_achievements on public.battle_player_stats;
create trigger battle_stats_refresh_achievements
after insert or update of wins,games_played on public.battle_player_stats
for each row
execute function private.refresh_achievements_from_battle_stats();

create or replace function private.refresh_achievements_from_formation_stats()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_player_achievements(new.user_id,now());
  return new;
end;
$$;
revoke all on function private.refresh_achievements_from_formation_stats() from public,anon,authenticated;

drop trigger if exists formation_stats_refresh_achievements on public.battle_formation_stats;
create trigger formation_stats_refresh_achievements
after insert or update of games_played,wins on public.battle_formation_stats
for each row
execute function private.refresh_achievements_from_formation_stats();

create or replace function private.refresh_achievements_from_unlocks()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_player_achievements(new.user_id,now());
  return new;
end;
$$;
revoke all on function private.refresh_achievements_from_unlocks() from public,anon,authenticated;

drop trigger if exists player_unlocks_refresh_achievements on public.player_unlocks;
create trigger player_unlocks_refresh_achievements
after insert on public.player_unlocks
for each row
execute function private.refresh_achievements_from_unlocks();

select private.refresh_player_achievements(id,now())
from public.profiles;
