-- The browser now creates and joins games through the authenticated online-game
-- Edge Function. These legacy SECURITY DEFINER RPCs are no longer client APIs.

revoke all on function public.create_waiting_game(text, integer)
  from public, anon, authenticated;

revoke all on function public.join_waiting_game(uuid)
  from public, anon, authenticated;

grant execute on function public.create_waiting_game(text, integer)
  to service_role;

grant execute on function public.join_waiting_game(uuid)
  to service_role;
