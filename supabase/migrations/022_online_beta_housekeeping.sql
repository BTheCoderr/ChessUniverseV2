-- Online beta housekeeping and competition-integrity fixes.
-- Keeps all lifecycle mutations service-role-only behind the authenticated Edge Function.

create or replace function public.expire_waiting_games_service(
  event_time timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  update public.games
  set
    status='cancelled',
    result=null,
    result_reason='expired',
    ended_at=event_time,
    updated_at=event_time,
    draw_offer_by=null
  where status='waiting'
    and tournament_match_id is null
    and (
      (is_private=false and created_at <= event_time - interval '30 minutes')
      or
      (is_private=true and created_at <= event_time - interval '72 hours')
    );

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke all on function public.expire_waiting_games_service(timestamptz)
  from public, anon, authenticated;
grant execute on function public.expire_waiting_games_service(timestamptz)
  to service_role;

create or replace function public.cancel_waiting_game_service(
  target_game_id uuid,
  actor_id uuid,
  event_time timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.games%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;

  select * into game_row
  from public.games
  where id=target_game_id
  for update;

  if not found then raise exception 'Game not found'; end if;
  if game_row.tournament_match_id is not null then
    raise exception 'Championship tables are managed by the bracket';
  end if;
  if game_row.white_id <> actor_id then
    raise exception 'Only the table creator can cancel this game';
  end if;
  if game_row.status <> 'waiting' then
    raise exception 'Only waiting games can be cancelled';
  end if;

  update public.games
  set
    status='cancelled',
    result=null,
    result_reason='cancelled',
    ended_at=event_time,
    updated_at=event_time,
    draw_offer_by=null
  where id=target_game_id;

  return true;
end;
$$;

revoke all on function public.cancel_waiting_game_service(uuid,uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function public.cancel_waiting_game_service(uuid,uuid,timestamptz)
  to service_role;

create or replace function public.abort_short_game_service(
  target_game_id uuid,
  actor_id uuid,
  expected_fen text,
  event_time timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.games%rowtype;
  move_count integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;

  select * into game_row
  from public.games
  where id=target_game_id
  for update;

  if not found then raise exception 'Game not found'; end if;
  if game_row.status <> 'active' then return false; end if;
  if actor_id <> game_row.white_id and actor_id <> game_row.black_id then
    raise exception 'Not a participant';
  end if;
  if game_row.tournament_match_id is not null then return false; end if;
  if game_row.fen <> expected_fen then
    raise exception 'Game changed before abort could be recorded';
  end if;

  select count(*)::integer into move_count
  from public.game_moves
  where game_id=target_game_id;

  if move_count >= 4 then return false; end if;

  update public.games
  set
    status='cancelled',
    result=null,
    result_reason='aborted_short_game',
    ended_at=event_time,
    updated_at=event_time,
    draw_offer_by=null
  where id=target_game_id;

  return true;
end;
$$;

revoke all on function public.abort_short_game_service(uuid,uuid,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.abort_short_game_service(uuid,uuid,text,timestamptz)
  to service_role;

-- Close the simultaneous-join race by serializing on the joining profile.
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

  -- Serialize concurrent join attempts by the same player.
  perform 1 from public.profiles where id=actor_id for update;

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

-- Preserve the current Classic/Battle finalizer, but make untimed and <4-ply
-- non-tournament games non-competitive.
create or replace function private.finalize_online_result(target_game_id uuid,next_result text,event_time timestamptz)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  game_row public.games%rowtype;
  white_before integer; black_before integer; white_after integer; black_after integer;
  white_score numeric; expected_white numeric; rating_delta integer;
  active_season_id uuid; white_points integer; black_points integer;
  competitive_ply_count integer;
begin
  if next_result not in ('white','black','draw') then raise exception 'Invalid game result'; end if;
  select * into game_row from public.games where id=target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if game_row.white_id is null or game_row.black_id is null then return; end if;

  select count(*)::integer into competitive_ply_count
  from public.game_moves
  where game_id=target_game_id;

  -- Untimed games are casual, and extremely short non-tournament games do not
  -- affect competitive ratings, records, Seasons, unlocks, or progression.
  if game_row.tournament_match_id is null
    and (game_row.time_control_minutes=0 or competitive_ply_count<4) then
    return;
  end if;

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
