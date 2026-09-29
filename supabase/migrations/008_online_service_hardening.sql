-- Supabase service hardening:
-- - least-privilege browser table grants
-- - draw offer FK index
-- - service-only create/join RPCs used by the Edge Function

create index if not exists games_draw_offer_by_idx
  on public.games (draw_offer_by);

revoke all on table public.games from anon, authenticated;
revoke all on table public.game_moves from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant select on table public.games to authenticated;
grant select on table public.game_moves to authenticated;

create or replace function public.create_waiting_game_service(
  actor_id uuid,
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
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists(select 1 from public.profiles where id = actor_id) then
    raise exception 'Player profile not found';
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
    actor_id,
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

revoke all on function public.create_waiting_game_service(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.create_waiting_game_service(uuid, text, integer)
  to service_role;

create or replace function public.join_waiting_game_service(
  target_game_id uuid,
  actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  joined_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists(select 1 from public.profiles where id = actor_id) then
    raise exception 'Player profile not found';
  end if;

  update public.games
  set
    black_id = actor_id,
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
    and white_id <> actor_id
  returning id into joined_id;

  if joined_id is null then
    raise exception 'Game is no longer available';
  end if;

  return joined_id;
end;
$$;

revoke all on function public.join_waiting_game_service(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.join_waiting_game_service(uuid, uuid)
  to service_role;
