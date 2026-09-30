-- Season Championship tournament system:
-- - top-N Season qualification snapshot and service-only check-in
-- - seeded single-elimination bracket with byes for 2-8 checked-in players
-- - trusted tournament game creation and bracket advancement
-- - draws replay the same bracket match instead of advancing a player
-- - completed tournaments retain champion and runner-up history

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  slug text not null unique,
  status text not null default 'scheduled'
    check (status in ('scheduled','check_in','bracket_ready','active','completed','cancelled')),
  qualification_slots integer not null default 8
    check (qualification_slots between 2 and 64),
  time_control_minutes integer not null default 15
    check (time_control_minutes between 1 and 180),
  check_in_opens_at timestamptz not null,
  check_in_closes_at timestamptz not null,
  starts_at timestamptz not null,
  champion_id uuid references public.profiles(id) on delete set null,
  runner_up_id uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id),
  check (check_in_closes_at > check_in_opens_at),
  check (starts_at >= check_in_closes_at)
);

create table if not exists public.tournament_entries (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seed integer,
  qualified_rank integer,
  status text not null default 'qualified'
    check (status in ('qualified','checked_in','eliminated','champion','withdrawn')),
  checked_in_at timestamptz,
  eliminated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create unique index if not exists tournament_entries_seed_unique
  on public.tournament_entries(tournament_id, seed)
  where seed is not null;

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round smallint not null check (round between 1 and 3),
  bracket_position smallint not null check (bracket_position between 1 and 4),
  player1_id uuid references public.profiles(id) on delete set null,
  player2_id uuid references public.profiles(id) on delete set null,
  winner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','ready','waiting','active','completed')),
  game_id uuid references public.games(id) on delete set null,
  source1_match_id uuid references public.tournament_matches(id) on delete set null,
  source2_match_id uuid references public.tournament_matches(id) on delete set null,
  next_match_id uuid references public.tournament_matches(id) on delete set null,
  next_slot smallint check (next_slot in (1,2)),
  replay_count integer not null default 0 check (replay_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, round, bracket_position)
);

alter table public.games
  add column if not exists tournament_match_id uuid references public.tournament_matches(id) on delete set null;

create index if not exists games_tournament_match_id_idx
  on public.games(tournament_match_id)
  where tournament_match_id is not null;

create index if not exists tournament_matches_tournament_round_idx
  on public.tournament_matches(tournament_id, round, bracket_position);

alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_matches enable row level security;

drop policy if exists "authenticated users can read tournaments" on public.tournaments;
create policy "authenticated users can read tournaments"
on public.tournaments for select to authenticated using (true);

drop policy if exists "authenticated users can read tournament entries" on public.tournament_entries;
create policy "authenticated users can read tournament entries"
on public.tournament_entries for select to authenticated using (true);

drop policy if exists "authenticated users can read tournament matches" on public.tournament_matches;
create policy "authenticated users can read tournament matches"
on public.tournament_matches for select to authenticated using (true);

revoke all on public.tournaments from anon, authenticated;
revoke all on public.tournament_entries from anon, authenticated;
revoke all on public.tournament_matches from anon, authenticated;
grant select on public.tournaments to authenticated;
grant select on public.tournament_entries to authenticated;
grant select on public.tournament_matches to authenticated;

insert into public.tournaments (
  season_id,
  name,
  slug,
  status,
  qualification_slots,
  time_control_minutes,
  check_in_opens_at,
  check_in_closes_at,
  starts_at
)
select
  s.id,
  'Beta Season 1 Championship',
  'beta-season-1-championship',
  'scheduled',
  8,
  15,
  '2027-01-01 05:00:00+00',
  '2027-01-03 04:59:59+00',
  '2027-01-03 17:00:00+00'
from public.seasons s
where s.slug = 'beta-season-1'
on conflict (slug) do update
set
  season_id = excluded.season_id,
  name = excluded.name,
  qualification_slots = excluded.qualification_slots,
  time_control_minutes = excluded.time_control_minutes,
  check_in_opens_at = excluded.check_in_opens_at,
  check_in_closes_at = excluded.check_in_closes_at,
  starts_at = excluded.starts_at,
  updated_at = now();

create or replace function private.advance_tournament_match(
  target_match_id uuid,
  winning_user_id uuid,
  event_time timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.tournament_matches%rowtype;
  losing_user_id uuid;
begin
  select * into match_row
  from public.tournament_matches
  where id = target_match_id
  for update;

  if not found then
    raise exception 'Tournament match not found';
  end if;

  if match_row.winner_id is not null then
    return;
  end if;

  if winning_user_id is distinct from match_row.player1_id
     and winning_user_id is distinct from match_row.player2_id then
    raise exception 'Winner is not a participant in this tournament match';
  end if;

  losing_user_id := case
    when match_row.player1_id = winning_user_id then match_row.player2_id
    else match_row.player1_id
  end;

  update public.tournament_matches
  set
    winner_id = winning_user_id,
    status = 'completed',
    updated_at = event_time
  where id = target_match_id;

  if losing_user_id is not null then
    update public.tournament_entries
    set
      status = 'eliminated',
      eliminated_at = event_time,
      updated_at = event_time
    where tournament_id = match_row.tournament_id
      and user_id = losing_user_id
      and status <> 'champion';
  end if;

  if match_row.next_match_id is null then
    update public.tournaments
    set
      status = 'completed',
      champion_id = winning_user_id,
      runner_up_id = losing_user_id,
      completed_at = event_time,
      updated_at = event_time
    where id = match_row.tournament_id;

    update public.tournament_entries
    set
      status = 'champion',
      updated_at = event_time
    where tournament_id = match_row.tournament_id
      and user_id = winning_user_id;

    return;
  end if;

  if match_row.next_slot = 1 then
    update public.tournament_matches
    set player1_id = winning_user_id, updated_at = event_time
    where id = match_row.next_match_id;
  elsif match_row.next_slot = 2 then
    update public.tournament_matches
    set player2_id = winning_user_id, updated_at = event_time
    where id = match_row.next_match_id;
  else
    raise exception 'Tournament bracket path is invalid';
  end if;

  update public.tournament_matches
  set
    status = case
      when player1_id is not null and player2_id is not null then 'ready'
      else 'pending'
    end,
    updated_at = event_time
  where id = match_row.next_match_id
    and winner_id is null;
end;
$$;

revoke all on function private.advance_tournament_match(uuid, uuid, timestamptz)
  from public, anon, authenticated;

create or replace function private.process_tournament_byes(
  target_tournament_id uuid,
  event_time timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bye_match_id uuid;
  bye_winner_id uuid;
  player_count integer;
begin
  loop
    bye_match_id := null;
    bye_winner_id := null;
    player_count := null;

    select
      m.id,
      coalesce(m.player1_id, m.player2_id),
      (case when m.player1_id is not null then 1 else 0 end)
        + (case when m.player2_id is not null then 1 else 0 end)
    into bye_match_id, bye_winner_id, player_count
    from public.tournament_matches m
    left join public.tournament_matches s1 on s1.id = m.source1_match_id
    left join public.tournament_matches s2 on s2.id = m.source2_match_id
    where m.tournament_id = target_tournament_id
      and m.winner_id is null
      and m.status in ('pending','ready')
      and (
        (m.source1_match_id is null and m.source2_match_id is null)
        or (
          m.source1_match_id is not null
          and m.source2_match_id is not null
          and s1.status = 'completed'
          and s2.status = 'completed'
        )
      )
      and (
        (m.player1_id is null and m.player2_id is null)
        or ((m.player1_id is null) <> (m.player2_id is null))
      )
    order by m.round, m.bracket_position
    limit 1
    for update of m skip locked;

    exit when bye_match_id is null;

    if player_count = 0 then
      update public.tournament_matches
      set status = 'completed', updated_at = event_time
      where id = bye_match_id;
    else
      perform private.advance_tournament_match(
        bye_match_id,
        bye_winner_id,
        event_time
      );
    end if;
  end loop;
end;
$$;

revoke all on function private.process_tournament_byes(uuid, timestamptz)
  from public, anon, authenticated;

create or replace function private.resolve_tournament_result(
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
  match_row public.tournament_matches%rowtype;
  winning_user_id uuid;
begin
  select * into game_row
  from public.games
  where id = target_game_id;

  if not found or game_row.tournament_match_id is null then
    return;
  end if;

  select * into match_row
  from public.tournament_matches
  where id = game_row.tournament_match_id
  for update;

  if not found or match_row.winner_id is not null then
    return;
  end if;

  if next_result = 'draw' then
    update public.tournament_matches
    set
      game_id = null,
      status = 'ready',
      replay_count = replay_count + 1,
      updated_at = event_time
    where id = match_row.id;

    return;
  end if;

  winning_user_id := case
    when next_result = 'white' then game_row.white_id
    when next_result = 'black' then game_row.black_id
    else null
  end;

  if winning_user_id is null then
    raise exception 'Tournament game requires a decisive result or draw';
  end if;

  perform private.advance_tournament_match(
    match_row.id,
    winning_user_id,
    event_time
  );

  perform private.process_tournament_byes(
    match_row.tournament_id,
    event_time
  );
end;
$$;

revoke all on function private.resolve_tournament_result(uuid, text, timestamptz)
  from public, anon, authenticated;

create or replace function public.sync_tournament_service(
  target_tournament_id uuid,
  event_time timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_row public.tournaments%rowtype;
  checked_in_count integer;
  matches_exist boolean;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  p5 uuid; p6 uuid; p7 uuid; p8 uuid;
  q1 uuid; q2 uuid; q3 uuid; q4 uuid;
  s1 uuid; s2 uuid; f1 uuid;
begin
  select * into tournament_row
  from public.tournaments
  where id = target_tournament_id
  for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if tournament_row.status = 'scheduled'
     and event_time >= tournament_row.check_in_opens_at then
    with ranked as (
      select
        sps.user_id,
        row_number() over (
          order by sps.points desc, sps.wins desc, sps.rating_current desc, sps.user_id
        ) as rn
      from public.season_player_stats sps
      where sps.season_id = tournament_row.season_id
        and sps.games_played > 0
    )
    insert into public.tournament_entries (
      tournament_id,
      user_id,
      seed,
      qualified_rank,
      status
    )
    select
      tournament_row.id,
      ranked.user_id,
      ranked.rn::integer,
      ranked.rn::integer,
      'qualified'
    from ranked
    where ranked.rn <= tournament_row.qualification_slots
    on conflict (tournament_id, user_id) do nothing;

    update public.tournaments
    set status = 'check_in', updated_at = event_time
    where id = tournament_row.id;

    tournament_row.status := 'check_in';
  end if;

  if tournament_row.status = 'check_in'
     and event_time >= tournament_row.check_in_closes_at then
    select count(*) into checked_in_count
    from public.tournament_entries
    where tournament_id = tournament_row.id
      and status = 'checked_in';

    if checked_in_count < 2 then
      update public.tournaments
      set status = 'cancelled', updated_at = event_time
      where id = tournament_row.id;

      return 'cancelled';
    end if;

    select exists(
      select 1 from public.tournament_matches
      where tournament_id = tournament_row.id
    ) into matches_exist;

    if not matches_exist then
      select
        (array_agg(user_id) filter (where seed = 1))[1],
        (array_agg(user_id) filter (where seed = 2))[1],
        (array_agg(user_id) filter (where seed = 3))[1],
        (array_agg(user_id) filter (where seed = 4))[1],
        (array_agg(user_id) filter (where seed = 5))[1],
        (array_agg(user_id) filter (where seed = 6))[1],
        (array_agg(user_id) filter (where seed = 7))[1],
        (array_agg(user_id) filter (where seed = 8))[1]
      into p1,p2,p3,p4,p5,p6,p7,p8
      from public.tournament_entries
      where tournament_id = tournament_row.id
        and status = 'checked_in';

      insert into public.tournament_matches (
        tournament_id, round, bracket_position, player1_id, player2_id, status
      )
      values (
        tournament_row.id, 1, 1, p1, p8,
        case when p1 is not null and p8 is not null then 'ready' else 'pending' end
      )
      returning id into q1;

      insert into public.tournament_matches (
        tournament_id, round, bracket_position, player1_id, player2_id, status
      )
      values (
        tournament_row.id, 1, 2, p4, p5,
        case when p4 is not null and p5 is not null then 'ready' else 'pending' end
      )
      returning id into q2;

      insert into public.tournament_matches (
        tournament_id, round, bracket_position, player1_id, player2_id, status
      )
      values (
        tournament_row.id, 1, 3, p2, p7,
        case when p2 is not null and p7 is not null then 'ready' else 'pending' end
      )
      returning id into q3;

      insert into public.tournament_matches (
        tournament_id, round, bracket_position, player1_id, player2_id, status
      )
      values (
        tournament_row.id, 1, 4, p3, p6,
        case when p3 is not null and p6 is not null then 'ready' else 'pending' end
      )
      returning id into q4;

      insert into public.tournament_matches (
        tournament_id, round, bracket_position, source1_match_id, source2_match_id, status
      )
      values (tournament_row.id, 2, 1, q1, q2, 'pending')
      returning id into s1;

      insert into public.tournament_matches (
        tournament_id, round, bracket_position, source1_match_id, source2_match_id, status
      )
      values (tournament_row.id, 2, 2, q3, q4, 'pending')
      returning id into s2;

      insert into public.tournament_matches (
        tournament_id, round, bracket_position, source1_match_id, source2_match_id, status
      )
      values (tournament_row.id, 3, 1, s1, s2, 'pending')
      returning id into f1;

      update public.tournament_matches
      set next_match_id = s1,
          next_slot = case when id = q1 then 1 else 2 end
      where id in (q1,q2);

      update public.tournament_matches
      set next_match_id = s2,
          next_slot = case when id = q3 then 1 else 2 end
      where id in (q3,q4);

      update public.tournament_matches
      set next_match_id = f1,
          next_slot = case when id = s1 then 1 else 2 end
      where id in (s1,s2);
    end if;

    update public.tournaments
    set status = 'bracket_ready', updated_at = event_time
    where id = tournament_row.id;

    tournament_row.status := 'bracket_ready';
  end if;

  if tournament_row.status = 'bracket_ready'
     and event_time >= tournament_row.starts_at then
    update public.tournaments
    set status = 'active', updated_at = event_time
    where id = tournament_row.id;

    tournament_row.status := 'active';

    perform private.process_tournament_byes(
      tournament_row.id,
      event_time
    );
  end if;

  if tournament_row.status = 'active' then
    perform private.process_tournament_byes(
      tournament_row.id,
      event_time
    );
  end if;

  return (
    select status from public.tournaments where id = tournament_row.id
  );
end;
$$;

revoke all on function public.sync_tournament_service(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.sync_tournament_service(uuid, timestamptz)
  to service_role;

create or replace function public.check_in_tournament_service(
  actor_id uuid,
  target_tournament_id uuid,
  event_time timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_row public.tournaments%rowtype;
  updated_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into tournament_row
  from public.tournaments
  where id = target_tournament_id
  for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if tournament_row.status <> 'check_in'
     or event_time < tournament_row.check_in_opens_at
     or event_time >= tournament_row.check_in_closes_at then
    raise exception 'Championship check-in is not open';
  end if;

  update public.tournament_entries
  set
    status = 'checked_in',
    checked_in_at = coalesce(checked_in_at, event_time),
    updated_at = event_time
  where tournament_id = target_tournament_id
    and user_id = actor_id
    and status in ('qualified','checked_in');

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'You are not qualified for this Championship';
  end if;

  return true;
end;
$$;

revoke all on function public.check_in_tournament_service(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.check_in_tournament_service(uuid, uuid, timestamptz)
  to service_role;

create or replace function public.open_tournament_match_service(
  actor_id uuid,
  target_match_id uuid,
  event_time timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  match_row public.tournament_matches%rowtype;
  tournament_row public.tournaments%rowtype;
  created_game_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into match_row
  from public.tournament_matches
  where id = target_match_id
  for update;

  if not found then
    raise exception 'Tournament match not found';
  end if;

  select * into tournament_row
  from public.tournaments
  where id = match_row.tournament_id
  for update;

  if tournament_row.status <> 'active'
     or event_time < tournament_row.starts_at then
    raise exception 'Championship match play has not started';
  end if;

  if actor_id is distinct from match_row.player1_id
     and actor_id is distinct from match_row.player2_id then
    raise exception 'You are not a participant in this Championship match';
  end if;

  if match_row.winner_id is not null or match_row.status = 'completed' then
    raise exception 'Tournament match is already complete';
  end if;

  if match_row.game_id is not null then
    return match_row.game_id;
  end if;

  if match_row.player1_id is null or match_row.player2_id is null then
    raise exception 'Tournament match is not ready';
  end if;

  if match_row.status <> 'ready' then
    raise exception 'Tournament match is not ready';
  end if;

  if exists(
    select 1
    from public.games g
    where g.status in ('waiting','active')
      and g.tournament_match_id is distinct from target_match_id
      and (
        g.white_id in (match_row.player1_id, match_row.player2_id)
        or g.black_id in (match_row.player1_id, match_row.player2_id)
      )
  ) then
    raise exception 'Both players must finish their current table before starting this Championship match';
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
    black_time_ms,
    is_private,
    invited_user_id,
    tournament_match_id
  )
  values (
    match_row.player1_id,
    'waiting',
    'traditional',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
    'b',
    tournament_row.time_control_minutes,
    0,
    tournament_row.time_control_minutes::bigint * 60000,
    tournament_row.time_control_minutes::bigint * 60000,
    true,
    match_row.player2_id,
    target_match_id
  )
  returning id into created_game_id;

  update public.tournament_matches
  set
    game_id = created_game_id,
    status = 'waiting',
    updated_at = event_time
  where id = target_match_id;

  return created_game_id;
end;
$$;

revoke all on function public.open_tournament_match_service(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.open_tournament_match_service(uuid, uuid, timestamptz)
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
  joined_tournament_match_id uuid;
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
  returning id, tournament_match_id into joined_id, joined_tournament_match_id;

  if joined_id is null then
    raise exception 'Game is no longer available';
  end if;

  if joined_tournament_match_id is not null then
    update public.tournament_matches
    set status = 'active', updated_at = now()
    where id = joined_tournament_match_id
      and winner_id is null;
  end if;

  return joined_id;
end;
$$;

revoke all on function public.join_waiting_game_service(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.join_waiting_game_service(uuid, uuid)
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

  if source_game.tournament_match_id is not null then
    raise exception 'Championship games use the tournament bracket for replays and advancement';
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
    white_id,
    status,
    variant,
    fen,
    current_turn,
    time_control_minutes,
    increment_seconds,
    white_time_ms,
    black_time_ms,
    is_private,
    invited_user_id,
    rematch_of
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
  active_season_id uuid;
  white_points integer;
  black_points integer;
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

  select s.id into active_season_id
  from public.seasons s
  where s.status = 'active'
    and s.starts_at <= event_time
    and s.ends_at > event_time
  order by s.starts_at desc
  limit 1;

  if active_season_id is not null then
    white_points := case
      when next_result = 'white' then 3
      when next_result = 'draw' then 1
      else 0
    end;

    black_points := case
      when next_result = 'black' then 3
      when next_result = 'draw' then 1
      else 0
    end;

    insert into public.season_player_stats (
      season_id, user_id, rating_start, rating_current, rating_peak
    )
    values
      (active_season_id, game_row.white_id, white_before, white_before, white_before),
      (active_season_id, game_row.black_id, black_before, black_before, black_before)
    on conflict (season_id, user_id) do nothing;

    update public.season_player_stats
    set
      games_played = games_played + 1,
      wins = wins + case when next_result = 'white' then 1 else 0 end,
      losses = losses + case when next_result = 'black' then 1 else 0 end,
      draws = draws + case when next_result = 'draw' then 1 else 0 end,
      points = points + white_points,
      rating_current = white_after,
      rating_peak = greatest(rating_peak, white_after),
      updated_at = event_time
    where season_id = active_season_id
      and user_id = game_row.white_id;

    update public.season_player_stats
    set
      games_played = games_played + 1,
      wins = wins + case when next_result = 'black' then 1 else 0 end,
      losses = losses + case when next_result = 'white' then 1 else 0 end,
      draws = draws + case when next_result = 'draw' then 1 else 0 end,
      points = points + black_points,
      rating_current = black_after,
      rating_peak = greatest(rating_peak, black_after),
      updated_at = event_time
    where season_id = active_season_id
      and user_id = game_row.black_id;
  end if;

  update public.games
  set
    white_rating_before = white_before,
    white_rating_after = white_after,
    black_rating_before = black_before,
    black_rating_after = black_after,
    season_id = active_season_id,
    updated_at = event_time
  where id = target_game_id;

  perform private.resolve_tournament_result(
    target_game_id,
    next_result,
    event_time
  );
end;
$$;

revoke all on function private.finalize_online_result(uuid, text, timestamptz)
  from public, anon, authenticated;
