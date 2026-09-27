-- Apply only after the online-game Edge Function client is deployed.
-- The browser must never be able to submit its own authoritative FEN/SAN.

revoke execute on function public.submit_game_move(
  uuid, text, text, text, text, text
) from anon, authenticated, public;
