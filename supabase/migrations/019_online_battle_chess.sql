-- Online Battle Chess:
-- - separate Battle Elo/W-L-D and per-formation records
-- - Battle results do not affect Classic Elo or Season standings
-- - public/private Formation Clash tables use server-validated unlocked formations
-- - Battle rematches preserve the original formation

alter table public.games
  add column if not exists battle_formation_key text,
  add column if not exists battle_white_rating_before integer,
  add column if not exists battle_white_rating_after integer,
  add column if not exists battle_black_rating_before integer,
  add column if not exists battle_black_rating_after integer;

alter table public.games
  drop constraint if exists games_battle_formation_check,
  add constraint games_battle_formation_check check (
    (variant = 'battle' and battle_formation_key in ('classic','cavalry','fortress','crest_guard','crown_wall','master_grid'))
    or (variant <> 'battle' and battle_formation_key is null)
  ),
  drop constraint if exists games_battle_white_rating_before_check,
  add constraint games_battle_white_rating_before_check check (battle_white_rating_before is null or battle_white_rating_before >= 0),
  drop constraint if exists games_battle_white_rating_after_check,
  add constraint games_battle_white_rating_after_check check (battle_white_rating_after is null or battle_white_rating_after >= 0),
  drop constraint if exists games_battle_black_rating_before_check,
  add constraint games_battle_black_rating_before_check check (battle_black_rating_before is null or battle_black_rating_before >= 0),
  drop constraint if exists games_battle_black_rating_after_check,
  add constraint games_battle_black_rating_after_check check (battle_black_rating_after is null or battle_black_rating_after >= 0);

create table if not exists public.battle_player_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  rating integer not null default 1200 check (rating >= 100),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  games_played integer not null default 0 check (games_played >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (games_played = wins + losses + draws)
);

create table if not exists public.battle_formation_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  formation_key text not null check (formation_key in ('classic','cavalry','fortress','crest_guard','crown_wall','master_grid')),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  games_played integer not null default 0 check (games_played >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, formation_key),
  check (games_played = wins + losses + draws)
);

create index if not exists battle_player_stats_rating_idx
  on public.battle_player_stats(rating desc, wins desc, user_id);
create index if not exists battle_formation_stats_games_idx
  on public.battle_formation_stats(user_id, games_played desc, wins desc);

alter table public.battle_player_stats enable row level security;
alter table public.battle_formation_stats enable row level security;

drop policy if exists "authenticated users can read battle stats" on public.battle_player_stats;
create policy "authenticated users can read battle stats"
on public.battle_player_stats for select to authenticated using (true);

drop policy if exists "authenticated users can read battle formation stats" on public.battle_formation_stats;
create policy "authenticated users can read battle formation stats"
on public.battle_formation_stats for select to authenticated using (true);

revoke all on public.battle_player_stats from anon, authenticated;
revoke all on public.battle_formation_stats from anon, authenticated;
grant select on public.battle_player_stats to authenticated;
grant select on public.battle_formation_stats to authenticated;

insert into public.battle_player_stats(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function private.battle_formation_fen(formation_key text)
returns text language sql immutable set search_path = ''
as $$
  select case formation_key
    when 'classic' then 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b - - 0 1'
    when 'cavalry' then 'rnnqkbbr/pppppppp/8/8/8/8/PPPPPPPP/RNNQKBBR b - - 0 1'
    when 'fortress' then 'rbnqknbr/pppppppp/8/8/8/8/PPPPPPPP/RBNQKNBR b - - 0 1'
    when 'crest_guard' then 'nrbqkbrn/pppppppp/8/8/8/8/PPPPPPPP/NRBQKBRN b - - 0 1'
    when 'crown_wall' then 'qrbnknbr/pppppppp/8/8/8/8/PPPPPPPP/QRBNKNBR b - - 0 1'
    when 'master_grid' then 'bnrqkrnb/pppppppp/8/8/8/8/PPPPPPPP/BNRQKRNB b - - 0 1'
    else null
  end;
$$;
revoke all on function private.battle_formation_fen(text) from public, anon, authenticated;

create or replace function private.battle_formation_requirement(formation_key text)
returns text language sql immutable set search_path = ''
as $$
  select case formation_key
    when 'classic' then null
    when 'cavalry' then 'back_rank_lab'
    when 'fortress' then 'back_rank_lab'
    when 'crest_guard' then 'championship_crest'
    when 'crown_wall' then 'champion_crown'
    when 'master_grid' then 'universe_master_title'
    else '__invalid__'
  end;
$$;
revoke all on function private.battle_formation_requirement(text) from public, anon, authenticated;

create or replace function private.assert_battle_access(actor_id uuid,formation_key text)
returns void language plpgsql security definer set search_path = ''
as $$
declare requirement text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.player_unlocks where user_id=actor_id and reward_key='battle_chess') then
    raise exception 'Battle Chess is locked. Win 3 rated online games first.';
  end if;
  requirement := private.battle_formation_requirement(formation_key);
  if requirement='__invalid__' then raise exception 'Unknown Battle formation'; end if;
  if requirement is not null and not exists(
    select 1 from public.player_unlocks where user_id=actor_id and reward_key=requirement
  ) then
    raise exception 'That Battle formation is still locked';
  end if;
end;
$$;
revoke all on function private.assert_battle_access(uuid,text) from public, anon, authenticated;

create or replace function public.create_battle_game_service(
  actor_id uuid, game_minutes integer, formation_key text, game_private boolean default false
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  created_id uuid;
  existing public.games%rowtype;
  start_fen text;
begin
  if not exists(select 1 from public.profiles where id=actor_id) then raise exception 'Player profile not found'; end if;
  if game_minutes<0 or game_minutes>180 then raise exception 'Invalid time control'; end if;
  perform private.assert_battle_access(actor_id,formation_key);
  start_fen := private.battle_formation_fen(formation_key);

  select * into existing from public.games
  where white_id=actor_id and status='waiting'
  order by created_at desc limit 1;

  if existing.id is not null then
    if existing.variant='battle' and existing.battle_formation_key=formation_key and existing.is_private=game_private then
      return existing.id;
    end if;
    raise exception 'Close or use your existing waiting table before opening a Battle table';
  end if;

  if exists(select 1 from public.games where status='active' and (white_id=actor_id or black_id=actor_id)) then
    raise exception 'Resume or finish your active game before creating another';
  end if;

  insert into public.games(
    white_id,status,variant,fen,current_turn,time_control_minutes,increment_seconds,
    white_time_ms,black_time_ms,is_private,battle_formation_key
  ) values(
    actor_id,'waiting','battle',start_fen,'b',game_minutes,0,
    case when game_minutes=0 then 0 else game_minutes::bigint*60000 end,
    case when game_minutes=0 then 0 else game_minutes::bigint*60000 end,
    game_private,formation_key
  ) returning id into created_id;
  return created_id;
end;
$$;
revoke all on function public.create_battle_game_service(uuid,integer,text,boolean) from public, anon, authenticated;
grant execute on function public.create_battle_game_service(uuid,integer,text,boolean) to service_role;

create or replace function public.join_waiting_game_service(target_game_id uuid,actor_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  target_game public.games%rowtype;
  joined_id uuid;
  joined_tournament_match_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=actor_id) then raise exception 'Player profile not found'; end if;

  select * into target_game from public.games where id=target_game_id for update;
  if target_game.id is null or target_game.status<>'waiting' then raise exception 'Game is no longer available'; end if;

  if target_game.variant='battle' then
    perform private.assert_battle_access(actor_id,'classic');
  end if;

  if exists(select 1 from public.games where status in ('waiting','active') and (white_id=actor_id or black_id=actor_id)) then
    raise exception 'Resume or finish your current game before joining another';
  end if;

  update public.games
  set black_id=actor_id,invited_user_id=coalesce(invited_user_id,actor_id),status='active',
      current_turn='b',started_at=now(),last_move_at=now(),
      white_time_ms=case when time_control_minutes=0 then 0 else time_control_minutes::bigint*60000 end,
      black_time_ms=case when time_control_minutes=0 then 0 else time_control_minutes::bigint*60000 end,
      updated_at=now()
  where id=target_game_id and status='waiting' and black_id is null and white_id is not null
    and white_id<>actor_id and (invited_user_id is null or invited_user_id=actor_id)
  returning id,tournament_match_id into joined_id,joined_tournament_match_id;

  if joined_id is null then raise exception 'Game is no longer available'; end if;

  if joined_tournament_match_id is not null then
    update public.tournament_matches set status='active',updated_at=now()
    where id=joined_tournament_match_id and winner_id is null;
  end if;
  return joined_id;
end;
$$;
revoke all on function public.join_waiting_game_service(uuid,uuid) from public, anon, authenticated;
grant execute on function public.join_waiting_game_service(uuid,uuid) to service_role;

create or replace function public.create_rematch_game_service(actor_id uuid,source_game_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  source_game public.games%rowtype;
  created_id uuid;
  opponent_id uuid;
  start_fen text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into source_game from public.games where id=source_game_id for update;
  if source_game.id is null then raise exception 'Game not found'; end if;
  if source_game.tournament_match_id is not null then
    raise exception 'Championship games use the tournament bracket for replays and advancement';
  end if;
  if source_game.status<>'completed' then raise exception 'Rematches are available after the game is complete'; end if;

  if source_game.white_id=actor_id then opponent_id:=source_game.black_id;
  elsif source_game.black_id=actor_id then opponent_id:=source_game.white_id;
  else raise exception 'Not a participant'; end if;

  if opponent_id is null then raise exception 'The opponent account is no longer available for a rematch'; end if;

  if source_game.variant='battle' then
    perform private.assert_battle_access(actor_id,source_game.battle_formation_key);
    if not exists(select 1 from public.player_unlocks where user_id=opponent_id and reward_key='battle_chess') then
      raise exception 'The opponent no longer has Battle Chess access';
    end if;
    start_fen:=private.battle_formation_fen(source_game.battle_formation_key);
  else
    start_fen:='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
  end if;

  if source_game.rematch_game_id is not null then return source_game.rematch_game_id; end if;
  if exists(select 1 from public.games where status in ('waiting','active') and (white_id=actor_id or black_id=actor_id)) then
    raise exception 'Finish or use your current table before starting a rematch';
  end if;

  insert into public.games(
    white_id,status,variant,fen,current_turn,time_control_minutes,increment_seconds,
    white_time_ms,black_time_ms,is_private,invited_user_id,rematch_of,battle_formation_key
  ) values(
    actor_id,'waiting',source_game.variant,start_fen,'b',source_game.time_control_minutes,source_game.increment_seconds,
    case when source_game.time_control_minutes=0 then 0 else source_game.time_control_minutes::bigint*60000 end,
    case when source_game.time_control_minutes=0 then 0 else source_game.time_control_minutes::bigint*60000 end,
    true,opponent_id,source_game_id,source_game.battle_formation_key
  ) returning id into created_id;

  update public.games set rematch_game_id=created_id,rematch_requested_by=actor_id,updated_at=now()
  where id=source_game_id;
  return created_id;
end;
$$;
revoke all on function public.create_rematch_game_service(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_rematch_game_service(uuid,uuid) to service_role;

create or replace function private.finalize_online_result(target_game_id uuid,next_result text,event_time timestamptz)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  game_row public.games%rowtype;
  white_before integer; black_before integer; white_after integer; black_after integer;
  white_score numeric; expected_white numeric; rating_delta integer;
  active_season_id uuid; white_points integer; black_points integer;
begin
  if next_result not in ('white','black','draw') then raise exception 'Invalid game result'; end if;
  select * into game_row from public.games where id=target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if game_row.white_id is null or game_row.black_id is null then return; end if;

  if game_row.variant='battle' then
    if game_row.battle_white_rating_after is not null or game_row.battle_black_rating_after is not null then return; end if;

    insert into public.battle_player_stats(user_id)
    values(game_row.white_id),(game_row.black_id)
    on conflict(user_id) do nothing;

    select rating into white_before from public.battle_player_stats where user_id=game_row.white_id for update;
    select rating into black_before from public.battle_player_stats where user_id=game_row.black_id for update;

    white_score:=case when next_result='white' then 1.0 when next_result='draw' then 0.5 else 0.0 end;
    expected_white:=1.0/(1.0+power(10.0::numeric,(black_before-white_before)::numeric/400.0));
    rating_delta:=round(32.0*(white_score-expected_white))::integer;
    white_after:=greatest(100,white_before+rating_delta);
    black_after:=greatest(100,black_before-rating_delta);

    update public.battle_player_stats
    set rating=case when user_id=game_row.white_id then white_after else black_after end,
        wins=wins+case when next_result='white' and user_id=game_row.white_id then 1 when next_result='black' and user_id=game_row.black_id then 1 else 0 end,
        losses=losses+case when next_result='white' and user_id=game_row.black_id then 1 when next_result='black' and user_id=game_row.white_id then 1 else 0 end,
        draws=draws+case when next_result='draw' then 1 else 0 end,
        games_played=games_played+1,updated_at=event_time
    where user_id in(game_row.white_id,game_row.black_id);

    insert into public.battle_formation_stats(user_id,formation_key)
    values(game_row.white_id,game_row.battle_formation_key),(game_row.black_id,game_row.battle_formation_key)
    on conflict(user_id,formation_key) do nothing;

    update public.battle_formation_stats
    set wins=wins+case when next_result='white' and user_id=game_row.white_id then 1 when next_result='black' and user_id=game_row.black_id then 1 else 0 end,
        losses=losses+case when next_result='white' and user_id=game_row.black_id then 1 when next_result='black' and user_id=game_row.white_id then 1 else 0 end,
        draws=draws+case when next_result='draw' then 1 else 0 end,
        games_played=games_played+1,updated_at=event_time
    where formation_key=game_row.battle_formation_key and user_id in(game_row.white_id,game_row.black_id);

    update public.games
    set battle_white_rating_before=white_before,battle_white_rating_after=white_after,
        battle_black_rating_before=black_before,battle_black_rating_after=black_after,updated_at=event_time
    where id=target_game_id;
    return;
  end if;

  if game_row.white_rating_after is not null or game_row.black_rating_after is not null then return; end if;
  select rating into white_before from public.profiles where id=game_row.white_id for update;
  select rating into black_before from public.profiles where id=game_row.black_id for update;
  if white_before is null or black_before is null then return; end if;

  white_score:=case when next_result='white' then 1.0 when next_result='draw' then 0.5 else 0.0 end;
  expected_white:=1.0/(1.0+power(10.0::numeric,(black_before-white_before)::numeric/400.0));
  rating_delta:=round(32.0*(white_score-expected_white))::integer;
  white_after:=greatest(100,white_before+rating_delta);
  black_after:=greatest(100,black_before-rating_delta);

  update public.profiles
  set rating=case when id=game_row.white_id then white_after else black_after end,
      wins=wins+case when next_result='white' and id=game_row.white_id then 1 when next_result='black' and id=game_row.black_id then 1 else 0 end,
      losses=losses+case when next_result='white' and id=game_row.black_id then 1 when next_result='black' and id=game_row.white_id then 1 else 0 end,
      draws=draws+case when next_result='draw' then 1 else 0 end,updated_at=event_time
  where id in(game_row.white_id,game_row.black_id);

  select s.id into active_season_id from public.seasons s
  where s.status='active' and s.starts_at<=event_time and s.ends_at>event_time
  order by s.starts_at desc limit 1;

  if active_season_id is not null then
    white_points:=case when next_result='white' then 3 when next_result='draw' then 1 else 0 end;
    black_points:=case when next_result='black' then 3 when next_result='draw' then 1 else 0 end;

    insert into public.season_player_stats(season_id,user_id,rating_start,rating_current,rating_peak)
    values(active_season_id,game_row.white_id,white_before,white_before,white_before),
          (active_season_id,game_row.black_id,black_before,black_before,black_before)
    on conflict(season_id,user_id) do nothing;

    update public.season_player_stats
    set games_played=games_played+1,wins=wins+case when next_result='white' then 1 else 0 end,
        losses=losses+case when next_result='black' then 1 else 0 end,draws=draws+case when next_result='draw' then 1 else 0 end,
        points=points+white_points,rating_current=white_after,rating_peak=greatest(rating_peak,white_after),updated_at=event_time
    where season_id=active_season_id and user_id=game_row.white_id;

    update public.season_player_stats
    set games_played=games_played+1,wins=wins+case when next_result='black' then 1 else 0 end,
        losses=losses+case when next_result='white' then 1 else 0 end,draws=draws+case when next_result='draw' then 1 else 0 end,
        points=points+black_points,rating_current=black_after,rating_peak=greatest(rating_peak,black_after),updated_at=event_time
    where season_id=active_season_id and user_id=game_row.black_id;
  end if;

  update public.games
  set white_rating_before=white_before,white_rating_after=white_after,
      black_rating_before=black_before,black_rating_after=black_after,
      season_id=active_season_id,updated_at=event_time
  where id=target_game_id;

  perform private.resolve_tournament_result(target_game_id,next_result,event_time);
end;
$$;
revoke all on function private.finalize_online_result(uuid,text,timestamptz) from public, anon, authenticated;
