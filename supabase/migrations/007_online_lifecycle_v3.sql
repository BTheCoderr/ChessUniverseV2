-- Online lifecycle v3:
-- - persistent draw offers
-- - automatic W/L/D profile stats
-- - service-only draw resolution RPC
-- - one-time stat backfill for existing completed games

alter table public.games
  add column if not exists draw_offer_by uuid
  references public.profiles(id)
  on delete set null;

alter table public.games
  drop constraint if exists games_draw_offer_participant_check;

alter table public.games
  add constraint games_draw_offer_participant_check
  check (
    draw_offer_by is null
    or draw_offer_by = white_id
    or draw_offer_by = black_id
  );

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
    draw_offer_by = null,
    ended_at = case when next_status = 'completed' then event_time else null end,
    updated_at = event_time
  where id = target_game_id;

  if next_status = 'completed' and next_result is not null then
    if next_result = 'draw' then
      update public.profiles
      set draws = draws + 1, updated_at = event_time
      where id in (game_row.white_id, game_row.black_id);
    elsif next_result = 'white' then
      update public.profiles
      set wins = wins + 1, updated_at = event_time
      where id = game_row.white_id;

      update public.profiles
      set losses = losses + 1, updated_at = event_time
      where id = game_row.black_id;
    elsif next_result = 'black' then
      update public.profiles
      set wins = wins + 1, updated_at = event_time
      where id = game_row.black_id;

      update public.profiles
      set losses = losses + 1, updated_at = event_time
      where id = game_row.white_id;
    end if;
  end if;

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
    draw_offer_by = null,
    ended_at = event_time,
    last_move_at = event_time,
    updated_at = event_time
  where id = target_game_id;

  if next_result = 'draw' then
    update public.profiles
    set draws = draws + 1, updated_at = event_time
    where id in (game_row.white_id, game_row.black_id);
  elsif next_result = 'white' then
    update public.profiles
    set wins = wins + 1, updated_at = event_time
    where id = game_row.white_id;

    update public.profiles
    set losses = losses + 1, updated_at = event_time
    where id = game_row.black_id;
  elsif next_result = 'black' then
    update public.profiles
    set wins = wins + 1, updated_at = event_time
    where id = game_row.black_id;

    update public.profiles
    set losses = losses + 1, updated_at = event_time
    where id = game_row.white_id;
  end if;
end;
$$;

revoke all on function public.finish_online_game(
  uuid, uuid, text, bigint, bigint, text, text, timestamptz
) from anon, authenticated, public;
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
  select * into game_row
  from public.games
  where id = target_game_id
  for update;

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

    update public.games
    set draw_offer_by = actor_id, updated_at = event_time
    where id = target_game_id;

    return 'offered';
  end if;

  if draw_action = 'decline' then
    if game_row.draw_offer_by is null or game_row.draw_offer_by = actor_id then
      raise exception 'No opponent draw offer to decline';
    end if;

    update public.games
    set draw_offer_by = null, updated_at = event_time
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

    update public.profiles
    set draws = draws + 1, updated_at = event_time
    where id in (game_row.white_id, game_row.black_id);

    return 'accepted';
  end if;

  raise exception 'Unsupported draw action';
end;
$$;

revoke all on function public.handle_online_draw_offer(
  uuid, uuid, text, text, timestamptz
) from anon, authenticated, public;
grant execute on function public.handle_online_draw_offer(
  uuid, uuid, text, text, timestamptz
) to service_role;

-- Existing completed games predate automatic stat tracking.
-- Current profile totals were verified as zero before this backfill.
with computed as (
  select
    p.id,
    count(*) filter (
      where g.status = 'completed'
        and (
          (g.result = 'white' and g.white_id = p.id)
          or (g.result = 'black' and g.black_id = p.id)
        )
    )::int as wins,
    count(*) filter (
      where g.status = 'completed'
        and (
          (g.result = 'white' and g.black_id = p.id)
          or (g.result = 'black' and g.white_id = p.id)
        )
    )::int as losses,
    count(*) filter (
      where g.status = 'completed'
        and g.result = 'draw'
        and (g.white_id = p.id or g.black_id = p.id)
    )::int as draws
  from public.profiles p
  left join public.games g
    on g.white_id = p.id or g.black_id = p.id
  group by p.id
)
update public.profiles p
set
  wins = computed.wins,
  losses = computed.losses,
  draws = computed.draws,
  updated_at = now()
from computed
where computed.id = p.id;
