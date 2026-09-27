-- Online multiplayer v2: Black-first games, server clocks, atomic trusted commits.

alter table public.games
  add column if not exists last_move_at timestamptz,
  add column if not exists result_reason text;

alter table public.games
  alter column fen set default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
  alter column current_turn set default 'b';

create or replace function public.create_waiting_game(
  game_variant text default 'traditional',
  game_minutes integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if game_variant <> 'traditional' then
    raise exception 'Variant is not available for online play yet';
  end if;

  if game_minutes < 1 or game_minutes > 180 then
    raise exception 'Invalid time control';
  end if;

  insert into public.games (
    white_id,
    status,
    variant,
    fen,
    current_turn,
    time_control_minutes,
    increment_seconds,
    white_time_ms,
    black_time_ms
  )
  values (
    auth.uid(),
    'waiting',
    game_variant,
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
    'b',
    game_minutes,
    0,
    game_minutes::bigint * 60000,
    game_minutes::bigint * 60000
  )
  returning id into created_id;

  return created_id;
end;
$$;

revoke all on function public.create_waiting_game(text, integer) from anon, authenticated, public;
grant execute on function public.create_waiting_game(text, integer) to authenticated;

create or replace function public.join_waiting_game(target_game_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  joined_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.games
  set
    black_id = auth.uid(),
    status = 'active',
    current_turn = 'b',
    started_at = now(),
    last_move_at = now(),
    white_time_ms = time_control_minutes::bigint * 60000,
    black_time_ms = time_control_minutes::bigint * 60000,
    updated_at = now()
  where id = target_game_id
    and status = 'waiting'
    and black_id is null
    and white_id <> auth.uid()
  returning id into joined_id;

  if joined_id is null then
    raise exception 'Game is no longer available';
  end if;

  return joined_id;
end;
$$;

revoke all on function public.join_waiting_game(uuid) from anon, authenticated, public;
grant execute on function public.join_waiting_game(uuid) to authenticated;

create or replace function public.commit_online_move(
  target_game_id uuid,
  actor_id uuid,
  expected_fen text,
  expected_turn text,
  move_from text,
  move_to text,
  move_promotion text,
  move_san text,
  next_fen text,
  next_pgn text,
  next_turn text,
  next_white_time_ms bigint,
  next_black_time_ms bigint,
  next_status text,
  next_result text,
  next_result_reason text,
  event_time timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.games%rowtype;
  next_ply integer;
  actor_color text;
begin
  select * into game_row
  from public.games
  where id = target_game_id
  for update;

  if not found then raise exception 'Game not found'; end if;
  if game_row.status <> 'active' then raise exception 'Game is not active'; end if;
  if game_row.fen <> expected_fen or game_row.current_turn <> expected_turn then
    raise exception 'Game changed; reload and try again';
  end if;

  actor_color := case
    when game_row.white_id = actor_id then 'w'
    when game_row.black_id = actor_id then 'b'
    else null
  end;

  if actor_color is null then raise exception 'Not a participant'; end if;
  if actor_color <> game_row.current_turn then raise exception 'Not your turn'; end if;

  select coalesce(max(ply), 0) + 1 into next_ply
  from public.game_moves
  where game_id = target_game_id;

  insert into public.game_moves (
    game_id, player_id, ply, from_square, to_square, promotion, san, fen_after
  ) values (
    target_game_id, actor_id, next_ply, move_from, move_to,
    nullif(move_promotion, ''), move_san, next_fen
  );

  update public.games
  set
    fen = next_fen,
    pgn = next_pgn,
    current_turn = next_turn,
    white_time_ms = greatest(0, next_white_time_ms),
    black_time_ms = greatest(0, next_black_time_ms),
    last_move_at = event_time,
    status = next_status::public.game_status,
    result = case when next_result is null then null else next_result::public.game_result end,
    result_reason = next_result_reason,
    ended_at = case when next_status = 'completed' then event_time else null end,
    updated_at = event_time
  where id = target_game_id;

  return next_ply;
end;
$$;

revoke all on function public.commit_online_move(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  bigint, bigint, text, text, text, timestamptz
) from anon, authenticated, public;
grant execute on function public.commit_online_move(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  bigint, bigint, text, text, text, timestamptz
) to service_role;

create or replace function public.finish_online_game(
  target_game_id uuid,
  actor_id uuid,
  expected_fen text,
  next_white_time_ms bigint,
  next_black_time_ms bigint,
  next_result text,
  next_result_reason text,
  event_time timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.games%rowtype;
begin
  select * into game_row
  from public.games
  where id = target_game_id
  for update;

  if not found then raise exception 'Game not found'; end if;
  if game_row.status <> 'active' then raise exception 'Game is not active'; end if;
  if game_row.fen <> expected_fen then raise exception 'Game changed; reload and try again'; end if;
  if game_row.white_id <> actor_id and game_row.black_id <> actor_id then
    raise exception 'Not a participant';
  end if;

  update public.games
  set
    white_time_ms = greatest(0, next_white_time_ms),
    black_time_ms = greatest(0, next_black_time_ms),
    status = 'completed',
    result = next_result::public.game_result,
    result_reason = next_result_reason,
    ended_at = event_time,
    last_move_at = event_time,
    updated_at = event_time
  where id = target_game_id;
end;
$$;

revoke all on function public.finish_online_game(
  uuid, uuid, text, bigint, bigint, text, text, timestamptz
) from anon, authenticated, public;
grant execute on function public.finish_online_game(
  uuid, uuid, text, bigint, bigint, text, text, timestamptz
) to service_role;
