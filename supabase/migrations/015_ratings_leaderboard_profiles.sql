-- Rated online competition:
-- - Elo-style rating updates (K=32) at the same atomic point as W/L/D
-- - immutable before/after rating snapshots on completed games
-- - all public completion paths share one idempotent finalizer

create schema if not exists private;

alter table public.games
  add column if not exists white_rating_before integer,
  add column if not exists white_rating_after integer,
  add column if not exists black_rating_before integer,
  add column if not exists black_rating_after integer;

alter table public.games
  drop constraint if exists games_white_rating_before_check,
  add constraint games_white_rating_before_check check (white_rating_before is null or white_rating_before >= 0),
  drop constraint if exists games_white_rating_after_check,
  add constraint games_white_rating_after_check check (white_rating_after is null or white_rating_after >= 0),
  drop constraint if exists games_black_rating_before_check,
  add constraint games_black_rating_before_check check (black_rating_before is null or black_rating_before >= 0),
  drop constraint if exists games_black_rating_after_check,
  add constraint games_black_rating_after_check check (black_rating_after is null or black_rating_after >= 0);

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

  update public.games
  set
    white_rating_before = white_before,
    white_rating_after = white_after,
    black_rating_before = black_before,
    black_rating_after = black_after,
    updated_at = event_time
  where id = target_game_id;
end;
$$;

revoke all on function private.finalize_online_result(uuid, text, timestamptz)
  from public, anon, authenticated;

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
  select * into game_row from public.games where id = target_game_id for update;
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
    draw_offer_by = null,
    ended_at = case when next_status = 'completed' then event_time else null end,
    updated_at = event_time
  where id = target_game_id;

  if next_status = 'completed' and next_result is not null then
    perform private.finalize_online_result(target_game_id, next_result, event_time);
  end if;

  return next_ply;
end;
$$;

revoke all on function public.commit_online_move(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  bigint, bigint, text, text, text, timestamptz
) from public, anon, authenticated;
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
  select * into game_row from public.games where id = target_game_id for update;
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
    draw_offer_by = null,
    ended_at = event_time,
    last_move_at = event_time,
    updated_at = event_time
  where id = target_game_id;

  perform private.finalize_online_result(target_game_id, next_result, event_time);
end;
$$;

revoke all on function public.finish_online_game(
  uuid, uuid, text, bigint, bigint, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.finish_online_game(
  uuid, uuid, text, bigint, bigint, text, text, timestamptz
) to service_role;

create or replace function public.handle_online_draw_offer(
  target_game_id uuid,
  actor_id uuid,
  expected_fen text,
  draw_action text,
  event_time timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.games%rowtype;
  actor_color text;
begin
  select * into game_row from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if game_row.status <> 'active' then raise exception 'Game is not active'; end if;
  if game_row.fen <> expected_fen then raise exception 'Game changed; reload and try again'; end if;

  actor_color := case
    when game_row.white_id = actor_id then 'w'
    when game_row.black_id = actor_id then 'b'
    else null
  end;
  if actor_color is null then raise exception 'Not a participant'; end if;

  if draw_action = 'offer' then
    if game_row.current_turn = actor_color then
      raise exception 'Make your move before offering a draw';
    end if;
    if game_row.draw_offer_by is not null and game_row.draw_offer_by <> actor_id then
      raise exception 'Opponent already offered a draw';
    end if;
    update public.games set draw_offer_by = actor_id, updated_at = event_time
    where id = target_game_id;
    return 'offered';
  end if;

  if draw_action = 'decline' then
    if game_row.draw_offer_by is null or game_row.draw_offer_by = actor_id then
      raise exception 'No opponent draw offer to decline';
    end if;
    update public.games set draw_offer_by = null, updated_at = event_time
    where id = target_game_id;
    return 'declined';
  end if;

  if draw_action = 'accept' then
    if game_row.draw_offer_by is null or game_row.draw_offer_by = actor_id then
      raise exception 'No opponent draw offer to accept';
    end if;

    update public.games
    set
      status = 'completed',
      result = 'draw',
      result_reason = 'draw_agreement',
      draw_offer_by = null,
      ended_at = event_time,
      last_move_at = event_time,
      updated_at = event_time
    where id = target_game_id;

    perform private.finalize_online_result(target_game_id, 'draw', event_time);
    return 'accepted';
  end if;

  raise exception 'Unsupported draw action';
end;
$$;

revoke all on function public.handle_online_draw_offer(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.handle_online_draw_offer(uuid, uuid, text, text, timestamptz)
  to service_role;
