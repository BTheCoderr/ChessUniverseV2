import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { Chess } from "npm:chess.js@1.1.0";
import { isUntimed, participantColor, validateMoveTurn } from "./rules.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type GameRow = {
  id: string;
  white_id: string;
  variant: string;
  battle_formation_key: string | null;
  black_id: string | null;
  status: "waiting" | "active" | "completed" | "cancelled";
  result: "white" | "black" | "draw" | null;
  fen: string;
  current_turn: "w" | "b";
  time_control_minutes: number;
  increment_seconds: number;
  white_time_ms: number | null;
  black_time_ms: number | null;
  last_move_at: string | null;
  draw_offer_by: string | null;
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function clocksAt(game: GameRow, nowMs: number) {
  if (isUntimed(game)) return { white: 0, black: 0 };

  let white = Number(game.white_time_ms ?? game.time_control_minutes * 60_000);
  let black = Number(game.black_time_ms ?? game.time_control_minutes * 60_000);

  if (game.status === "active" && game.last_move_at) {
    const elapsed = Math.max(0, nowMs - Date.parse(game.last_move_at));
    if (game.current_turn === "w") white -= elapsed;
    else black -= elapsed;
  }

  return { white: Math.max(0, white), black: Math.max(0, black) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceKey || !authHeader) {
    return response({ error: "Server authentication is not configured" }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return response({ error: "Authentication required" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return response({ error: "Invalid JSON body" }, 400);
  }

  const userId = authData.user.id;
  const action = String(body.action ?? "");

  if (action === "create_game") {
    const variant = String(body.variant ?? "traditional");
    const minutes = Number(body.minutes ?? 0);

    if (!Number.isInteger(minutes)) {
      return response({ error: "Invalid time control" }, 400);
    }

    if (variant === "battle") {
      const formationKey = String(body.formationKey ?? "classic");
      const { data, error } = await admin.rpc("create_battle_game_service", {
        actor_id: userId,
        game_minutes: minutes,
        formation_key: formationKey,
        game_private: false,
      });

      if (error) return response({ error: error.message }, 409);
      return response({ ok: true, gameId: data, variant, formationKey });
    }

    const { data, error } = await admin.rpc("create_waiting_game_service", {
      actor_id: userId,
      game_variant: variant,
      game_minutes: minutes,
    });

    if (error) return response({ error: error.message }, 409);
    return response({ ok: true, gameId: data, variant });
  }

  if (action === "create_private_challenge") {
    const variant = String(body.variant ?? "traditional");
    const minutes = Number(body.minutes ?? 0);

    if (!Number.isInteger(minutes)) {
      return response({ error: "Invalid time control" }, 400);
    }

    if (variant === "battle") {
      const formationKey = String(body.formationKey ?? "classic");
      const { data, error } = await admin.rpc("create_battle_game_service", {
        actor_id: userId,
        game_minutes: minutes,
        formation_key: formationKey,
        game_private: true,
      });

      if (error) return response({ error: error.message }, 409);
      return response({ ok: true, gameId: data, private: true, variant, formationKey });
    }

    const { data, error } = await admin.rpc("create_private_challenge_service", {
      actor_id: userId,
      game_variant: variant,
      game_minutes: minutes,
    });

    if (error) return response({ error: error.message }, 409);
    return response({ ok: true, gameId: data, private: true, variant });
  }

  if (action === "join_game") {
    const gameId = String(body.gameId ?? "");
    if (!gameId) return response({ error: "Game id is required" }, 400);

    const { data, error } = await admin.rpc("join_waiting_game_service", {
      target_game_id: gameId,
      actor_id: userId,
    });

    if (error) return response({ error: error.message }, 409);
    return response({ ok: true, gameId: data });
  }

  if (action === "create_rematch") {
    const gameId = String(body.gameId ?? "");
    if (!gameId) return response({ error: "Game id is required" }, 400);

    const { data, error } = await admin.rpc("create_rematch_game_service", {
      actor_id: userId,
      source_game_id: gameId,
    });

    if (error) return response({ error: error.message }, 409);
    return response({ ok: true, gameId: data, rematch: true });
  }

  if (action === "inspect_challenge") {
    const gameId = String(body.gameId ?? "");
    if (!gameId) return response({ error: "Game id is required" }, 400);

    const { data: challenge, error: challengeError } = await admin
      .from("games")
      .select("id,white_id,invited_user_id,status,is_private,time_control_minutes,rematch_of,variant,battle_formation_key")
      .eq("id", gameId)
      .single();

    if (challengeError || !challenge) return response({ error: "Challenge not found" }, 404);
    if (!challenge.is_private || challenge.status !== "waiting" || !challenge.white_id) {
      return response({ error: "Challenge is no longer available" }, 409);
    }

    if (
      challenge.invited_user_id &&
      challenge.invited_user_id !== userId &&
      challenge.white_id !== userId
    ) {
      return response({ error: "This challenge is for another player" }, 403);
    }

    const { data: challenger } = await admin
      .from("profiles")
      .select("id,username,rating,wins,losses,draws")
      .eq("id", challenge.white_id)
      .single();

    const { data: battleStats } = challenge.variant === "battle"
      ? await admin
          .from("battle_player_stats")
          .select("rating,wins,losses,draws,games_played")
          .eq("user_id", challenge.white_id)
          .single()
      : { data: null };

    return response({
      ok: true,
      challenge: {
        gameId: challenge.id,
        timeControlMinutes: challenge.time_control_minutes,
        isRematch: Boolean(challenge.rematch_of),
        variant: challenge.variant,
        formationKey: challenge.battle_formation_key,
        challenger: challenger ?? null,
        challengerBattleStats: battleStats ?? null,
      },
    });
  }

  if (action === "profile_showcase") {
    const targetUserId = String(body.userId ?? userId);

    const [
      { data: profile, error: profileError },
      { data: battleStats },
      { data: formationStats },
      { data: unlockRows },
      { count: championshipWins },
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("id,username,rating,wins,losses,draws")
        .eq("id", targetUserId)
        .single(),
      admin
        .from("battle_player_stats")
        .select("user_id,rating,wins,losses,draws,games_played")
        .eq("user_id", targetUserId)
        .maybeSingle(),
      admin
        .from("battle_formation_stats")
        .select("formation_key,wins,losses,draws,games_played")
        .eq("user_id", targetUserId)
        .order("games_played", { ascending: false })
        .order("wins", { ascending: false })
        .limit(1),
      admin
        .from("player_unlocks")
        .select("reward_key,unlocked_at")
        .eq("user_id", targetUserId)
        .order("unlocked_at", { ascending: true }),
      admin
        .from("tournament_entries")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", targetUserId)
        .eq("status", "champion"),
    ]);

    if (profileError || !profile) return response({ error: "Player profile not found" }, 404);

    const rewardKeys = (unlockRows ?? []).map((row) => row.reward_key);
    let rewards: Array<Record<string, unknown>> = [];

    if (rewardKeys.length > 0) {
      const { data: rewardRows, error: rewardError } = await admin
        .from("universe_rewards")
        .select("reward_key,name,category,description,requirement_copy,sort_order")
        .in("reward_key", rewardKeys)
        .order("sort_order", { ascending: true });

      if (rewardError) return response({ error: "Unable to load trophy data" }, 409);

      const unlockedAtByKey = new Map(
        (unlockRows ?? []).map((row) => [row.reward_key, row.unlocked_at])
      );

      rewards = (rewardRows ?? []).map((reward) => ({
        rewardKey: reward.reward_key,
        name: reward.name,
        category: reward.category,
        description: reward.description,
        requirementCopy: reward.requirement_copy,
        unlockedAt: unlockedAtByKey.get(reward.reward_key) ?? null,
      }));
    }

    return response({
      ok: true,
      showcase: {
        profile,
        battleStats: battleStats ?? {
          user_id: targetUserId,
          rating: 1200,
          wins: 0,
          losses: 0,
          draws: 0,
          games_played: 0,
        },
        favoriteFormation: (formationStats ?? [])[0] ?? null,
        rewards,
        championshipWins: championshipWins ?? 0,
      },
    });
  }

  if (action === "accept_rematch") {
    const sourceGameId = String(body.gameId ?? "");
    if (!sourceGameId) return response({ error: "Game id is required" }, 400);

    const { data: source, error: sourceError } = await admin
      .from("games")
      .select("id,white_id,black_id,status,rematch_game_id")
      .eq("id", sourceGameId)
      .single();

    if (sourceError || !source) return response({ error: "Game not found" }, 404);
    if (source.white_id !== userId && source.black_id !== userId) {
      return response({ error: "Not a participant" }, 403);
    }
    if (source.status !== "completed" || !source.rematch_game_id) {
      return response({ error: "No rematch is waiting" }, 409);
    }

    const rematchId = String(source.rematch_game_id);
    const { data: rematch, error: rematchError } = await admin
      .from("games")
      .select("id,white_id,black_id,status")
      .eq("id", rematchId)
      .single();

    if (rematchError || !rematch) return response({ error: "Rematch not found" }, 404);

    if (rematch.white_id === userId || rematch.black_id === userId) {
      return response({ ok: true, gameId: rematchId, status: rematch.status });
    }

    if (rematch.status !== "waiting") {
      return response({ error: "Rematch is no longer available" }, 409);
    }

    const { data, error } = await admin.rpc("join_waiting_game_service", {
      target_game_id: rematchId,
      actor_id: userId,
    });

    if (error) return response({ error: error.message }, 409);
    return response({ ok: true, gameId: data, status: "active" });
  }

  if (action === "championship_status") {
    const tournamentId = String(body.tournamentId ?? "");
    if (!tournamentId) return response({ error: "Tournament id is required" }, 400);

    const now = new Date().toISOString();
    const { data, error } = await admin.rpc("sync_tournament_service", {
      target_tournament_id: tournamentId,
      event_time: now,
    });

    if (error) return response({ error: error.message }, 409);
    return response({ ok: true, status: data });
  }

  if (action === "championship_check_in") {
    const tournamentId = String(body.tournamentId ?? "");
    if (!tournamentId) return response({ error: "Tournament id is required" }, 400);

    const now = new Date().toISOString();
    const { error: syncError } = await admin.rpc("sync_tournament_service", {
      target_tournament_id: tournamentId,
      event_time: now,
    });
    if (syncError) return response({ error: syncError.message }, 409);

    const { data, error } = await admin.rpc("check_in_tournament_service", {
      actor_id: userId,
      target_tournament_id: tournamentId,
      event_time: now,
    });

    if (error) return response({ error: error.message }, 409);
    return response({ ok: true, checkedIn: Boolean(data) });
  }

  if (action === "open_tournament_match") {
    const tournamentMatchId = String(body.tournamentMatchId ?? "");
    if (!tournamentMatchId) {
      return response({ error: "Tournament match id is required" }, 400);
    }

    const { data: match, error: matchError } = await admin
      .from("tournament_matches")
      .select("id,tournament_id,player1_id,player2_id,status,game_id")
      .eq("id", tournamentMatchId)
      .single();

    if (matchError || !match) return response({ error: "Tournament match not found" }, 404);
    if (match.player1_id !== userId && match.player2_id !== userId) {
      return response({ error: "Not a Championship participant" }, 403);
    }

    const now = new Date().toISOString();
    const { error: syncError } = await admin.rpc("sync_tournament_service", {
      target_tournament_id: match.tournament_id,
      event_time: now,
    });
    if (syncError) return response({ error: syncError.message }, 409);

    const { data: openedGameId, error: openError } = await admin.rpc(
      "open_tournament_match_service",
      {
        actor_id: userId,
        target_match_id: tournamentMatchId,
        event_time: now,
      }
    );

    if (openError || !openedGameId) {
      return response({ error: openError?.message ?? "Unable to open Championship match" }, 409);
    }

    const gameId = String(openedGameId);
    const { data: game, error: gameError } = await admin
      .from("games")
      .select("id,status,white_id,black_id")
      .eq("id", gameId)
      .single();

    if (gameError || !game) return response({ error: "Championship game not found" }, 404);

    if (game.status === "waiting" && match.player2_id === userId && !game.black_id) {
      const { data: joinedId, error: joinError } = await admin.rpc("join_waiting_game_service", {
        target_game_id: gameId,
        actor_id: userId,
      });

      if (joinError) return response({ error: joinError.message }, 409);
      return response({ ok: true, gameId: joinedId, status: "active" });
    }

    return response({ ok: true, gameId, status: game.status });
  }

  const gameId = String(body.gameId ?? "");
  if (!gameId) return response({ error: "Game id is required" }, 400);

  const { data: gameData, error: gameError } = await admin
    .from("games")
    .select("id,white_id,black_id,status,result,variant,battle_formation_key,fen,current_turn,time_control_minutes,increment_seconds,white_time_ms,black_time_ms,last_move_at,draw_offer_by")
    .eq("id", gameId)
    .single();

  if (gameError || !gameData) return response({ error: "Game not found" }, 404);
  const game = gameData as GameRow;
  const actorColor = participantColor(game, userId) as "w" | "b" | null;

  if (!actorColor) return response({ error: "Not a participant" }, 403);
  if (game.status !== "active") return response({ error: "Game is not active" }, 409);

  const untimed = isUntimed(game);
  const now = new Date();
  const nowMs = now.getTime();
  const clocks = clocksAt(game, nowMs);

  const finish = async (result: "white" | "black" | "draw", reason: string) => {
    const { error } = await admin.rpc("finish_online_game", {
      target_game_id: gameId,
      actor_id: userId,
      expected_fen: game.fen,
      next_white_time_ms: Math.round(clocks.white),
      next_black_time_ms: Math.round(clocks.black),
      next_result: result,
      next_result_reason: reason,
      event_time: now.toISOString(),
    });
    if (error) throw error;
  };

  try {
    if (action === "resign") {
      await finish(actorColor === "w" ? "black" : "white", "resignation");
      return response({ ok: true, status: "completed" });
    }

    if (action === "timeout") {
      if (untimed) return response({ error: "Untimed games do not expire" }, 409);
      const remaining = game.current_turn === "w" ? clocks.white : clocks.black;
      if (remaining > 0) return response({ error: "Clock has not expired" }, 409);
      await finish(game.current_turn === "w" ? "black" : "white", "timeout");
      return response({ ok: true, status: "completed" });
    }

    if (action === "offer_draw" || action === "accept_draw" || action === "decline_draw") {
      const drawAction =
        action === "offer_draw"
          ? "offer"
          : action === "accept_draw"
            ? "accept"
            : "decline";

      const { data, error } = await admin.rpc("handle_online_draw_offer", {
        target_game_id: gameId,
        actor_id: userId,
        expected_fen: game.fen,
        draw_action: drawAction,
        event_time: now.toISOString(),
      });

      if (error) return response({ error: error.message }, 409);
      return response({
        ok: true,
        draw: data,
        status: action === "accept_draw" ? "completed" : "active",
        result: action === "accept_draw" ? "draw" : null,
      });
    }

    if (action !== "move") return response({ error: "Unsupported action" }, 400);

    const turnError = validateMoveTurn(game, userId);
    if (turnError) return response({ error: turnError }, turnError === "Not a participant" ? 403 : 409);

    if (!untimed) {
      const activeRemaining = actorColor === "w" ? clocks.white : clocks.black;
      if (activeRemaining <= 0) {
        await finish(actorColor === "w" ? "black" : "white", "timeout");
        return response({ error: "Time expired" }, 409);
      }
    }

    const chess = new Chess(game.fen);
    if (chess.turn() !== game.current_turn) return response({ error: "Stored game state is inconsistent" }, 409);

    const from = String(body.from ?? "");
    const to = String(body.to ?? "");
    const promotion = body.promotion ? String(body.promotion) : undefined;
    let move;
    try {
      move = chess.move({ from, to, promotion: promotion ?? "q" });
    } catch {
      return response({ error: "Illegal move" }, 400);
    }
    if (!move) return response({ error: "Illegal move" }, 400);

    if (!untimed) {
      if (actorColor === "w") clocks.white += game.increment_seconds * 1000;
      else clocks.black += game.increment_seconds * 1000;
    }

    let nextStatus = "active";
    let nextResult: "white" | "black" | "draw" | null = null;
    let reason: string | null = null;

    if (chess.isCheckmate()) {
      nextStatus = "completed";
      nextResult = actorColor === "w" ? "white" : "black";
      reason = "checkmate";
    } else if (chess.isDraw()) {
      nextStatus = "completed";
      nextResult = "draw";
      reason = chess.isStalemate()
        ? "stalemate"
        : chess.isInsufficientMaterial()
          ? "insufficient_material"
          : chess.isThreefoldRepetition()
            ? "threefold_repetition"
            : "draw";
    }

    const { data: ply, error: commitError } = await admin.rpc("commit_online_move", {
      target_game_id: gameId,
      actor_id: userId,
      expected_fen: game.fen,
      expected_turn: game.current_turn,
      move_from: move.from,
      move_to: move.to,
      move_promotion: move.promotion ?? null,
      move_san: move.san,
      next_fen: chess.fen(),
      next_pgn: chess.pgn(),
      next_turn: chess.turn(),
      next_white_time_ms: Math.round(clocks.white),
      next_black_time_ms: Math.round(clocks.black),
      next_status: nextStatus,
      next_result: nextResult,
      next_result_reason: reason,
      event_time: now.toISOString(),
    });

    if (commitError) return response({ error: commitError.message }, 409);
    return response({ ok: true, ply, status: nextStatus, result: nextResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Online game update failed";
    return response({ error: message }, 409);
  }
});
