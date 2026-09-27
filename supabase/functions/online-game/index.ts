import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { Chess } from "npm:chess.js@1.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type GameRow = {
  id: string;
  white_id: string;
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
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function clocksAt(game: GameRow, nowMs: number) {
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

  const action = String(body.action ?? "");
  const gameId = String(body.gameId ?? "");
  if (!gameId) return response({ error: "Game id is required" }, 400);

  const { data: gameData, error: gameError } = await admin
    .from("games")
    .select("id,white_id,black_id,status,result,fen,current_turn,time_control_minutes,increment_seconds,white_time_ms,black_time_ms,last_move_at")
    .eq("id", gameId)
    .single();

  if (gameError || !gameData) return response({ error: "Game not found" }, 404);
  const game = gameData as GameRow;
  const userId = authData.user.id;
  const actorColor = game.white_id === userId ? "w" : game.black_id === userId ? "b" : null;
  if (!actorColor) return response({ error: "Not a participant" }, 403);
  if (game.status !== "active") return response({ error: "Game is not active" }, 409);

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
      return response({ ok: true });
    }

    if (action === "timeout") {
      const remaining = game.current_turn === "w" ? clocks.white : clocks.black;
      if (remaining > 0) return response({ error: "Clock has not expired" }, 409);
      await finish(game.current_turn === "w" ? "black" : "white", "timeout");
      return response({ ok: true });
    }

    if (action !== "move") return response({ error: "Unsupported action" }, 400);
    if (game.current_turn !== actorColor) return response({ error: "Not your turn" }, 409);

    const activeRemaining = actorColor === "w" ? clocks.white : clocks.black;
    if (activeRemaining <= 0) {
      await finish(actorColor === "w" ? "black" : "white", "timeout");
      return response({ error: "Time expired" }, 409);
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

    if (actorColor === "w") clocks.white += game.increment_seconds * 1000;
    else clocks.black += game.increment_seconds * 1000;

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
