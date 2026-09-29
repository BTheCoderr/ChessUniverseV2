-- Promote online-game assumptions into database invariants and remove
-- an exact duplicate of the unique (game_id, ply) index.

drop index if exists public.game_moves_game_ply_idx;

alter table public.games
  drop constraint if exists games_draw_offer_active_check;
alter table public.games
  add constraint games_draw_offer_active_check
  check (draw_offer_by is null or status = 'active') not valid;
alter table public.games validate constraint games_draw_offer_active_check;

alter table public.games
  drop constraint if exists games_completed_result_check;
alter table public.games
  add constraint games_completed_result_check
  check (status <> 'completed' or (result is not null and ended_at is not null)) not valid;
alter table public.games validate constraint games_completed_result_check;

alter table public.games
  drop constraint if exists games_active_has_opponent_check;
alter table public.games
  add constraint games_active_has_opponent_check
  check (status <> 'active' or black_id is not null) not valid;
alter table public.games validate constraint games_active_has_opponent_check;

alter table public.games
  drop constraint if exists games_waiting_has_no_opponent_check;
alter table public.games
  add constraint games_waiting_has_no_opponent_check
  check (status <> 'waiting' or black_id is null) not valid;
alter table public.games validate constraint games_waiting_has_no_opponent_check;

alter table public.games
  drop constraint if exists games_fen_turn_matches_check;
alter table public.games
  add constraint games_fen_turn_matches_check
  check (current_turn = split_part(fen, ' ', 2)) not valid;
alter table public.games validate constraint games_fen_turn_matches_check;
