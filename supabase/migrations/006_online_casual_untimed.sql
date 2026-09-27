-- Casual online play: allow 0-minute games as true untimed games.
-- Timed games keep their existing 1-180 minute behavior.

alter table public.games
  drop constraint if exists games_time_control_minutes_check;

alter table public.games
  add constraint games_time_control_minutes_check
  check (time_control_minutes >= 0 and time_control_minutes <= 180);

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

  if game_minutes < 0 or game_minutes > 180 then
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
    case when game_minutes = 0 then 0 else game_minutes::bigint * 60000 end,
    case when game_minutes = 0 then 0 else game_minutes::bigint * 60000 end
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
    white_time_ms = case when time_control_minutes = 0 then 0 else time_control_minutes::bigint * 60000 end,
    black_time_ms = case when time_control_minutes = 0 then 0 else time_control_minutes::bigint * 60000 end,
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
