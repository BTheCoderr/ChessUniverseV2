-- Private online challenges and rematches:
-- - private waiting games never appear in public discovery
-- - exact invite links can still join through the trusted Edge Function
-- - rematches are private challenges targeted to the prior opponent
-- - service-only RPCs preserve the existing server-authoritative trust model

alter table public.games
  add column if not exists is_private boolean not null default false,
  add column if not exists invited_user_id uuid,
  add column if not exists rematch_of uuid,
  add column if not exists rematch_game_id uuid,
  add column if not exists rematch_requested_by uuid;

alter table public.games
  drop constraint if exists games_invited_user_id_fkey,
  add constraint games_invited_user_id_fkey
    foreign key (invited_user_id) references public.profiles(id) on delete set null,
  drop constraint if exists games_rematch_of_fkey,
  add constraint games_rematch_of_fkey
    foreign key (rematch_of) references public.games(id) on delete set null,
  drop constraint if exists games_rematch_game_id_fkey,
  add constraint games_rematch_game_id_fkey
    foreign key (rematch_game_id) references public.games(id) on delete set null,
  drop constraint if exists games_rematch_requested_by_fkey,
  add constraint games_rematch_requested_by_fkey
    foreign key (rematch_requested_by) references public.profiles(id) on delete set null;

create index if not exists games_private_waiting_idx
  on public.games (is_private, status, created_at desc);

create index if not exists games_invited_user_status_idx
  on public.games (invited_user_id, status)
  where invited_user_id is not null;

create index if not exists games_rematch_of_idx
  on public.games (rematch_of)
  where rematch_of is not null;

drop policy if exists "users can read open or participating games" on public.games;
create policy "users can read open or participating games"
on public.games
for select
to authenticated
using (
  (status = 'waiting' and is_private = false)
  or white_id = (select auth.uid())
  or black_id = (select auth.uid())
  or invited_user_id = (select auth.uid())
);

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
  existing_id uuid;
  existing_private boolean;
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

  select id, is_private into existing_id, existing_private
  from public.games
  where white_id = actor_id
    and status = 'waiting'
  order by created_at desc
  limit 1;

  if existing_id is not null then
    if existing_private then
      raise exception 'You already have a pending private challenge';
    end if;
    return existing_id;
  end if;

  if exists(
    select 1
    from public.games
    where status = 'active'
      and (white_id = actor_id or black_id = actor_id)
  ) then
    raise exception 'Resume or finish your active game before creating another';
  end if;

  insert into public.games (
    white_id, status, variant, fen, current_turn,
    time_control_minutes, increment_seconds,
    white_time_ms, black_time_ms, is_private
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
    case when game_minutes = 0 then 0 else game_minutes::bigint * 60000 end,
    false
  )
  returning id into created_id;

  return created_id;
end;
$$;

revoke all on function public.create_waiting_game_service(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.create_waiting_game_service(uuid, text, integer)
  to service_role;

create or replace function public.create_private_challenge_service(
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
  existing_id uuid;
  existing_private boolean;
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

  select id, is_private into existing_id, existing_private
  from public.games
  where white_id = actor_id
    and status = 'waiting'
  order by created_at desc
  limit 1;

  if existing_id is not null then
    if existing_private then
      return existing_id;
    end if;
    raise exception 'Close or use your open public table before creating a private challenge';
  end if;

  if exists(
    select 1
    from public.games
    where status = 'active'
      and (white_id = actor_id or black_id = actor_id)
  ) then
    raise exception 'Resume or finish your active game before creating another';
  end if;

  insert into public.games (
    white_id, status, variant, fen, current_turn,
    time_control_minutes, increment_seconds,
    white_time_ms, black_time_ms, is_private
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
    case when game_minutes = 0 then 0 else game_minutes::bigint * 60000 end,
    true
  )
  returning id into created_id;

  return created_id;
end;
$$;

revoke all on function public.create_private_challenge_service(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.create_private_challenge_service(uuid, text, integer)
  to service_role;

create or replace function public.create_rematch_game_service(
  actor_id uuid,
  source_game_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_game public.games%rowtype;
  created_id uuid;
  opponent_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into source_game
  from public.games
  where id = source_game_id
  for update;

  if source_game.id is null then
    raise exception 'Game not found';
  end if;

  if source_game.status <> 'completed' then
    raise exception 'Rematches are available after the game is complete';
  end if;

  if source_game.white_id = actor_id then
    opponent_id := source_game.black_id;
  elsif source_game.black_id = actor_id then
    opponent_id := source_game.white_id;
  else
    raise exception 'Not a participant';
  end if;

  if opponent_id is null then
    raise exception 'The opponent account is no longer available for a rematch';
  end if;

  if source_game.rematch_game_id is not null then
    return source_game.rematch_game_id;
  end if;

  if exists(
    select 1
    from public.games
    where status in ('waiting', 'active')
      and (white_id = actor_id or black_id = actor_id)
  ) then
    raise exception 'Finish or use your current table before starting a rematch';
  end if;

  insert into public.games (
    white_id, status, variant, fen, current_turn,
    time_control_minutes, increment_seconds,
    white_time_ms, black_time_ms,
    is_private, invited_user_id, rematch_of
  )
  values (
    actor_id,
    'waiting',
    source_game.variant,
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
    'b',
    source_game.time_control_minutes,
    source_game.increment_seconds,
    case when source_game.time_control_minutes = 0 then 0 else source_game.time_control_minutes::bigint * 60000 end,
    case when source_game.time_control_minutes = 0 then 0 else source_game.time_control_minutes::bigint * 60000 end,
    true,
    opponent_id,
    source_game_id
  )
  returning id into created_id;

  update public.games
  set
    rematch_game_id = created_id,
    rematch_requested_by = actor_id,
    updated_at = now()
  where id = source_game_id;

  return created_id;
end;
$$;

revoke all on function public.create_rematch_game_service(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.create_rematch_game_service(uuid, uuid)
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

  if exists(
    select 1
    from public.games
    where status in ('waiting','active')
      and (white_id = actor_id or black_id = actor_id)
  ) then
    raise exception 'Resume or finish your current game before joining another';
  end if;

  update public.games
  set
    black_id = actor_id,
    invited_user_id = coalesce(invited_user_id, actor_id),
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
    and white_id is not null
    and white_id <> actor_id
    and (invited_user_id is null or invited_user_id = actor_id)
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
