-- Reduce profile exposure and remove the obsolete pre-server-authoritative move RPC.

revoke select on table public.profiles from anon;

drop policy if exists "profiles are readable" on public.profiles;
create policy "authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

drop function if exists public.submit_game_move(
  uuid, text, text, text, text, text
);
