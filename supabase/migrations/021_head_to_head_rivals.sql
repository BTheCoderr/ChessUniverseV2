-- Head-to-head rivalry and targeted player challenges:
-- - exact Classic/Battle series records are computed server-side
-- - Rival begins at 3 completed meetings; Nemesis begins at 10
-- - direct challenges are private and targeted to a specific profile
-- - Battle challenge creation still enforces both players' Battle access
-- - all new RPCs are service-role only

create or replace function public.get_head_to_head_service(
  actor_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_games integer := 0;
  classic_wins integer := 0;
  classic_losses integer := 0;
  classic_draws integer := 0;
  battle_wins integer := 0;
  battle_losses integer := 0;
  battle_draws integer := 0;
  favorite_formation text := null;
  favorite_formation_games integer := 0;
  last_game public.games%rowtype;
  streak_result text := null;
  streak_count integer := 0;
  current_result text;
  game_row record;
  relationship_label text := 'New opponent';
begin
  if actor_id is null or target_user_id is null then
    raise exception 'Both players are required';
  end if;

  if actor_id = target_user_id then
    return null;
  end if;

  if not exists(select 1 from public.profiles where id = actor_id)
     or not exists(select 1 from public.profiles where id = target_user_id) then
    raise exception 'Player profile not found';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where g.variant <> 'battle'
        and ((g.result='white' and g.white_id=actor_id) or (g.result='black' and g.black_id=actor_id))
    )::integer,
    count(*) filter (
      where g.variant <> 'battle'
        and ((g.result='white' and g.black_id=actor_id) or (g.result='black' and g.white_id=actor_id))
    )::integer,
    count(*) filter (where g.variant <> 'battle' and g.result='draw')::integer,
    count(*) filter (
      where g.variant='battle'
        and ((g.result='white' and g.white_id=actor_id) or (g.result='black' and g.black_id=actor_id))
    )::integer,
    count(*) filter (
      where g.variant='battle'
        and ((g.result='white' and g.black_id=actor_id) or (g.result='black' and g.white_id=actor_id))
    )::integer,
    count(*) filter (where g.variant='battle' and g.result='draw')::integer
  into
    total_games,
    classic_wins,
    classic_losses,
    classic_draws,
    battle_wins,
    battle_losses,
    battle_draws
  from public.games g
  where g.status='completed'
    and (
      (g.white_id=actor_id and g.black_id=target_user_id)
      or (g.white_id=target_user_id and g.black_id=actor_id)
    );

  select g.battle_formation_key,count(*)::integer
  into favorite_formation,favorite_formation_games
  from public.games g
  where g.status='completed'
    and g.variant='battle'
    and g.battle_formation_key is not null
    and (
      (g.white_id=actor_id and g.black_id=target_user_id)
      or (g.white_id=target_user_id and g.black_id=actor_id)
    )
  group by g.battle_formation_key
  order by count(*) desc,g.battle_formation_key
  limit 1;

  select *
  into last_game
  from public.games g
  where g.status='completed'
    and (
      (g.white_id=actor_id and g.black_id=target_user_id)
      or (g.white_id=target_user_id and g.black_id=actor_id)
    )
  order by coalesce(g.ended_at,g.updated_at,g.created_at) desc,g.created_at desc
  limit 1;

  for game_row in
    select g.result,g.white_id,g.black_id
    from public.games g
    where g.status='completed'
      and (
        (g.white_id=actor_id and g.black_id=target_user_id)
        or (g.white_id=target_user_id and g.black_id=actor_id)
      )
    order by coalesce(g.ended_at,g.updated_at,g.created_at) desc,g.created_at desc
  loop
    current_result := case
      when game_row.result='draw' then 'draw'
      when game_row.result='white' and game_row.white_id=actor_id then 'win'
      when game_row.result='black' and game_row.black_id=actor_id then 'win'
      else 'loss'
    end;

    if streak_result is null then
      streak_result := current_result;
      streak_count := 1;
    elsif current_result = streak_result then
      streak_count := streak_count + 1;
    else
      exit;
    end if;
  end loop;

  relationship_label := case
    when total_games >= 10 then 'Nemesis'
    when total_games >= 3 then 'Rival'
    when total_games >= 1 then 'Opponent'
    else 'New opponent'
  end;

  return jsonb_build_object(
    'totalGames',total_games,
    'relationshipLabel',relationship_label,
    'classic',jsonb_build_object(
      'wins',classic_wins,
      'losses',classic_losses,
      'draws',classic_draws,
      'games',classic_wins+classic_losses+classic_draws
    ),
    'battle',jsonb_build_object(
      'wins',battle_wins,
      'losses',battle_losses,
      'draws',battle_draws,
      'games',battle_wins+battle_losses+battle_draws
    ),
    'favoriteBattleFormation',favorite_formation,
    'favoriteBattleFormationGames',coalesce(favorite_formation_games,0),
    'streakResult',streak_result,
    'streakCount',streak_count,
    'lastGame',case
      when last_game.id is null then null
      else jsonb_build_object(
        'gameId',last_game.id,
        'variant',last_game.variant,
        'result',last_game.result,
        'resultReason',last_game.result_reason,
        'timeControlMinutes',last_game.time_control_minutes,
        'battleFormationKey',last_game.battle_formation_key,
        'endedAt',last_game.ended_at
      )
    end
  );
end;
$$;

revoke all on function public.get_head_to_head_service(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.get_head_to_head_service(uuid,uuid)
to service_role;

create or replace function public.create_targeted_challenge_service(
  actor_id uuid,
  target_user_id uuid,
  game_variant text default 'traditional',
  game_minutes integer default 10,
  formation_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
  existing public.games%rowtype;
  start_fen text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if target_user_id is null or target_user_id=actor_id then
    raise exception 'Choose another player to challenge';
  end if;

  if not exists(select 1 from public.profiles where id=actor_id)
     or not exists(select 1 from public.profiles where id=target_user_id) then
    raise exception 'Player profile not found';
  end if;

  if game_variant not in ('traditional','battle') then
    raise exception 'Unsupported challenge variant';
  end if;

  if game_minutes<0 or game_minutes>180 then
    raise exception 'Invalid time control';
  end if;

  if game_variant='battle' then
    perform private.assert_battle_access(actor_id,formation_key);
    perform private.assert_battle_access(target_user_id,'classic');
    start_fen := private.battle_formation_fen(formation_key);

    if start_fen is null then raise exception 'Unknown Battle formation'; end if;
  else
    formation_key := null;
    start_fen := 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
  end if;

  select *
  into existing
  from public.games g
  where g.white_id=actor_id and g.status='waiting'
  order by g.created_at desc
  limit 1;

  if existing.id is not null then
    if existing.is_private
       and existing.invited_user_id=target_user_id
       and existing.variant=game_variant
       and existing.time_control_minutes=game_minutes
       and existing.battle_formation_key is not distinct from formation_key then
      return existing.id;
    end if;

    raise exception 'Close or use your existing waiting table before challenging another player';
  end if;

  if exists(
    select 1 from public.games g
    where g.status='active'
      and (g.white_id=actor_id or g.black_id=actor_id)
  ) then
    raise exception 'Resume or finish your active game before creating another';
  end if;

  insert into public.games(
    white_id,status,variant,fen,current_turn,time_control_minutes,increment_seconds,
    white_time_ms,black_time_ms,is_private,invited_user_id,battle_formation_key
  )
  values(
    actor_id,'waiting',game_variant,start_fen,'b',game_minutes,0,
    case when game_minutes=0 then 0 else game_minutes::bigint*60000 end,
    case when game_minutes=0 then 0 else game_minutes::bigint*60000 end,
    true,target_user_id,formation_key
  )
  returning id into created_id;

  return created_id;
end;
$$;

revoke all on function public.create_targeted_challenge_service(uuid,uuid,text,integer,text)
from public,anon,authenticated;
grant execute on function public.create_targeted_challenge_service(uuid,uuid,text,integer,text)
to service_role;
