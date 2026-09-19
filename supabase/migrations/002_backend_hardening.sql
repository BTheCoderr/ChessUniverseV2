-- Lock down RPC execution and tune RLS/indexes after initial schema.

-- Prevent Postgres/Supabase default EXECUTE grants from exposing future
-- public-schema functions unless we explicitly grant access.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;

-- Auth trigger helper is internal-only. The trigger remains able to invoke it.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Game RPCs are authenticated-only. Revoke inherited/default grants first,
-- then explicitly grant only the role the browser should use after sign-in.
revoke execute on function public.create_waiting_game(text, integer)
  from anon, authenticated, public;
grant execute on function public.create_waiting_game(text, integer)
  to authenticated;

revoke execute on function public.join_waiting_game(uuid)
  from anon, authenticated, public;
grant execute on function public.join_waiting_game(uuid)
  to authenticated;

revoke execute on function public.submit_game_move(uuid, text, text, text, text, text)
  from anon, authenticated, public;
grant execute on function public.submit_game_move(uuid, text, text, text, text, text)
  to authenticated;

-- Avoid auth.uid() being re-evaluated for every row.
drop policy if exists "users can read open or participating games" on public.games;
create policy "users can read open or participating games"
on public.games for select to authenticated
using (
  status = 'waiting'
  or white_id = (select auth.uid())
  or black_id = (select auth.uid())
);

drop policy if exists "participants can read moves" on public.game_moves;
create policy "participants can read moves"
on public.game_moves for select to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = game_moves.game_id
      and (
        g.white_id = (select auth.uid())
        or g.black_id = (select auth.uid())
      )
  )
);

-- Cover foreign keys used in participant/history lookups.
create index if not exists games_white_id_idx
  on public.games(white_id);

create index if not exists games_black_id_idx
  on public.games(black_id);

create index if not exists game_moves_player_id_idx
  on public.game_moves(player_id);
