import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { Session } from "@supabase/supabase-js";
import { ChessBoard } from "./ChessBoard";
import { BATTLE_FORMATIONS } from "../lib/battleChess";
import { supabase } from "../lib/supabase";

type GameRow = {
  id: string;
  white_id: string | null;
  black_id: string | null;
  status: "waiting" | "active" | "completed" | "cancelled";
  result: "white" | "black" | "draw" | null;
  result_reason: string | null;
  variant: string;
  battle_formation_key: string | null;
  fen: string;
  current_turn: "w" | "b";
  time_control_minutes: number;
  increment_seconds: number;
  white_time_ms: number | null;
  black_time_ms: number | null;
  started_at: string | null;
  last_move_at: string | null;
  draw_offer_by: string | null;
  rematch_game_id: string | null;
  rematch_requested_by: string | null;
  white_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_before: number | null;
  black_rating_after: number | null;
  battle_white_rating_before: number | null;
  battle_white_rating_after: number | null;
  battle_black_rating_before: number | null;
  battle_black_rating_after: number | null;
  tournament_match_id: string | null;
};

type GameMove = {
  id: number;
  game_id: string;
  player_id: string | null;
  ply: number;
  from_square: Square;
  to_square: Square;
  san: string;
  created_at: string;
};

type PlayerProfile = {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
};

type BattleStats = {
  user_id: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
};

function formationName(key: string | null) {
  return BATTLE_FORMATIONS.find((formation) => formation.key === key)?.name ?? "Classic Line";
}

function boardPieces(game: Chess) {
  return game.board().flatMap((rank, rankIndex) =>
    rank.flatMap((piece, fileIndex) => {
      if (!piece) return [];
      const file = String.fromCharCode(97 + fileIndex);
      const square = `${file}${8 - rankIndex}` as Square;
      return [{ square, type: piece.type, color: piece.color }];
    })
  );
}

function remainingTime(game: GameRow, color: "w" | "b", now: number) {
  if (game.time_control_minutes === 0) return 0;

  const stored =
    color === "w"
      ? game.white_time_ms ?? game.time_control_minutes * 60_000
      : game.black_time_ms ?? game.time_control_minutes * 60_000;

  if (game.status !== "active" || game.current_turn !== color || !game.last_move_at) {
    return Math.max(0, stored);
  }

  return Math.max(0, stored - Math.max(0, now - Date.parse(game.last_move_at)));
}

function formatClock(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function moveNumber(move: GameMove) {
  return move.ply % 2 === 1
    ? `${Math.ceil(move.ply / 2)}...`
    : `${move.ply / 2 + 1}.`;
}

export function OnlineGame({
  gameId,
  session,
  onBack,
  onOpenGame,
}: {
  gameId: string;
  session: Session;
  onBack: () => void;
  onOpenGame: (gameId: string) => void;
}) {
  const client = supabase;
  const [gameRow, setGameRow] = useState<GameRow | null>(null);
  const [moves, setMoves] = useState<GameMove[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [message, setMessage] = useState("Loading game…");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({});
  const [battleStats, setBattleStats] = useState<Record<string, BattleStats>>({});
  const [learningHelp, setLearningHelp] = useState(() => {
    try {
      return window.localStorage.getItem("chess-universe-learning-help") !== "off";
    } catch {
      return true;
    }
  });
  const timeoutClaimed = useRef(false);

  const loadPlayers = useCallback(async (row: GameRow) => {
    if (!client) return;
    const ids = [row.white_id, row.black_id].filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      setPlayerProfiles({});
      return;
    }

    const [{ data }, { data: battleData }] = await Promise.all([
      client
        .from("profiles")
        .select("id,username,rating,wins,losses,draws")
        .in("id", ids),
      client
        .from("battle_player_stats")
        .select("user_id,rating,wins,losses,draws,games_played")
        .in("user_id", ids),
    ]);

    const next: Record<string, PlayerProfile> = {};
    for (const profile of (data ?? []) as PlayerProfile[]) {
      next[profile.id] = profile;
    }
    setPlayerProfiles(next);

    const nextBattle: Record<string, BattleStats> = {};
    for (const stats of (battleData ?? []) as BattleStats[]) {
      nextBattle[stats.user_id] = stats;
    }
    setBattleStats(nextBattle);
  }, [client]);

  const load = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client
      .from("games")
      .select("id,white_id,black_id,status,result,result_reason,variant,battle_formation_key,fen,current_turn,time_control_minutes,increment_seconds,white_time_ms,black_time_ms,started_at,last_move_at,draw_offer_by,rematch_game_id,rematch_requested_by,white_rating_before,white_rating_after,black_rating_before,black_rating_after,battle_white_rating_before,battle_white_rating_after,battle_black_rating_before,battle_black_rating_after,tournament_match_id")
      .eq("id", gameId)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const row = data as GameRow;
    setGameRow(row);
    await loadPlayers(row);
    setMessage("");
  }, [client, gameId, loadPlayers]);

  const loadMoves = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client
      .from("game_moves")
      .select("id,game_id,player_id,ply,from_square,to_square,san,created_at")
      .eq("game_id", gameId)
      .order("ply", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMoves((data ?? []) as GameMove[]);
  }, [client, gameId]);

  useEffect(() => {
    void load();
    void loadMoves();
  }, [load, loadMoves]);

  const myColor =
    gameRow?.white_id === session.user.id
      ? "w"
      : gameRow?.black_id === session.user.id
        ? "b"
        : null;

  useEffect(() => {
    if (!client || !myColor) return;

    const channel = client
      .channel(`game:${gameId}`, {
        config: { presence: { key: myColor } },
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const row = payload.new as GameRow;
          setGameRow(row);
          void loadPlayers(row);
          setSelected(null);
          timeoutClaimed.current = false;
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_moves",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const incoming = payload.new as GameMove;
          setMoves((current) =>
            current.some((move) => move.id === incoming.id)
              ? current
              : [...current, incoming].sort((a, b) => a.ply - b.ply)
          );
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, unknown[]>;
        const opponentColor = myColor === "w" ? "b" : "w";
        setOpponentOnline(Boolean(state[opponentColor]?.length));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          void channel.track({ side: myColor, online_at: new Date().toISOString() });
          void load();
          void loadMoves();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("reconnecting");
          setOpponentOnline(false);
        }
      });

    return () => {
      setOpponentOnline(false);
      void client.removeChannel(channel);
    };
  }, [client, gameId, load, loadMoves, loadPlayers, myColor]);

  useEffect(() => {
    if (gameRow?.status !== "active" || gameRow.time_control_minutes === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [gameRow?.status, gameRow?.time_control_minutes]);

  const whiteRemaining = gameRow ? remainingTime(gameRow, "w", now) : 0;
  const blackRemaining = gameRow ? remainingTime(gameRow, "b", now) : 0;

  useEffect(() => {
    if (
      !client ||
      !gameRow ||
      gameRow.status !== "active" ||
      gameRow.time_control_minutes === 0 ||
      !myColor ||
      timeoutClaimed.current
    ) return;

    const activeRemaining = gameRow.current_turn === "w" ? whiteRemaining : blackRemaining;
    if (activeRemaining > 0) return;

    timeoutClaimed.current = true;
    void client.functions
      .invoke("online-game", { body: { action: "timeout", gameId } })
      .then(async ({ error }) => {
        if (error) {
          timeoutClaimed.current = false;
          setMessage(error.message);
        }
        await load();
        await loadMoves();
      });
  }, [blackRemaining, client, gameId, gameRow, load, loadMoves, myColor, whiteRemaining]);

  const chess = useMemo(() => {
    try {
      return new Chess(gameRow?.fen);
    } catch {
      return new Chess();
    }
  }, [gameRow?.fen]);

  const pieces = useMemo(() => boardPieces(chess), [chess]);
  const legalTargets = useMemo(() => {
    if (!learningHelp || !selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [chess, learningHelp, selected]);

  const lastMove = moves.length > 0
    ? { from: moves[moves.length - 1].from_square, to: moves[moves.length - 1].to_square }
    : null;

  if (!client || !gameRow) {
    return (
      <div className="card">
        <button className="text-button" onClick={onBack}>← Back to lobby</button>
        <h2>Online game</h2>
        <p>{message}</p>
      </div>
    );
  }

  const isMyTurn =
    gameRow.status === "active" &&
    myColor !== null &&
    gameRow.current_turn === myColor;

  const myProfile = myColor === "w"
    ? (gameRow.white_id ? playerProfiles[gameRow.white_id] : undefined)
    : myColor === "b"
      ? (gameRow.black_id ? playerProfiles[gameRow.black_id] : undefined)
      : undefined;
  const opponentId = myColor === "w" ? gameRow.black_id : myColor === "b" ? gameRow.white_id : null;
  const opponentProfile = opponentId ? playerProfiles[opponentId] : undefined;
  const opponentName = opponentProfile?.username ?? "Opponent";
  const isBattle = gameRow.variant === "battle";
  const myBattleStats = myColor === "w"
    ? (gameRow.white_id ? battleStats[gameRow.white_id] : undefined)
    : myColor === "b"
      ? (gameRow.black_id ? battleStats[gameRow.black_id] : undefined)
      : undefined;
  const opponentBattleStats = opponentId ? battleStats[opponentId] : undefined;

  const myRatingBefore = isBattle
    ? (myColor === "w" ? gameRow.battle_white_rating_before : myColor === "b" ? gameRow.battle_black_rating_before : null)
    : (myColor === "w" ? gameRow.white_rating_before : myColor === "b" ? gameRow.black_rating_before : null);
  const myRatingAfter = isBattle
    ? (myColor === "w" ? gameRow.battle_white_rating_after : myColor === "b" ? gameRow.battle_black_rating_after : null)
    : (myColor === "w" ? gameRow.white_rating_after : myColor === "b" ? gameRow.black_rating_after : null);
  const myRatingDelta =
    myRatingBefore !== null && myRatingAfter !== null
      ? myRatingAfter - myRatingBefore
      : null;
  const resultForMe =
    gameRow.result === "draw"
      ? "Draw"
      : gameRow.result === "white"
        ? myColor === "w" ? "Win" : "Loss"
        : gameRow.result === "black"
          ? myColor === "b" ? "Win" : "Loss"
          : "Game over";

  const drawOfferedByMe = gameRow.draw_offer_by === session.user.id;
  const drawOfferedByOpponent = Boolean(gameRow.draw_offer_by && !drawOfferedByMe);
  const canOfferDraw =
    gameRow.status === "active" &&
    Boolean(myColor) &&
    !gameRow.draw_offer_by &&
    moves.length > 0 &&
    !isMyTurn;

  const resultText =
    gameRow.result === "white"
      ? "White wins"
      : gameRow.result === "black"
        ? "Black wins"
        : gameRow.result === "draw"
          ? "Draw"
          : null;

  const baseStatus =
    gameRow.status === "waiting"
      ? "Waiting for an opponent…"
      : gameRow.status === "completed"
        ? `${resultText ?? "Game over"}${gameRow.result_reason ? ` · ${gameRow.result_reason.replaceAll("_", " ")}` : ""}`
        : gameRow.status === "cancelled"
          ? gameRow.result_reason === "aborted_short_game"
            ? "Game aborted · fewer than 4 plies"
            : gameRow.result_reason === "expired"
              ? "Waiting game expired"
              : "Game cancelled"
          : isMyTurn
            ? "Your move"
            : "Opponent's move";

  const status =
    learningHelp && isMyTurn && chess.isCheck()
      ? "You're in check — move the king or stop the attack."
      : baseStatus;

  const invokeGameAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    setMessage("");
    const { error } = await client.functions.invoke("online-game", { body });
    if (error) setMessage(error.message);
    await load();
    await loadMoves();
    setSaving(false);
  };

  const openRematch = async () => {
    if (!myColor || gameRow.status !== "completed" || saving) return;

    setSaving(true);
    setMessage("");

    const action = gameRow.rematch_game_id ? "accept_rematch" : "create_rematch";
    const { data, error } = await client.functions.invoke("online-game", {
      body: { action, gameId },
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      await load();
      return;
    }

    if (data?.gameId) {
      onOpenGame(String(data.gameId));
      return;
    }

    setMessage("The rematch could not be opened.");
    setSaving(false);
  };

  const attemptMove = async (from: Square, to: Square) => {
    if (!isMyTurn || saving || !myColor) return;

    try {
      const preview = new Chess(chess.fen());
      const move = preview.move({ from, to, promotion: "q" });
      if (!move) {
        if (learningHelp) setMessage("That move isn't legal. Pick a highlighted square.");
        return;
      }

      setSelected(null);
      setMessage("");
      await invokeGameAction({
        action: "move",
        gameId,
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? null,
      });
    } catch {
      if (learningHelp) setMessage("That move isn't legal. Pick a highlighted square.");
    }
  };

  const onSquareClick = async (square: Square) => {
    if (!isMyTurn || saving || !myColor) return;

    const piece = chess.get(square);
    if (!selected) {
      if (piece?.color === myColor) {
        setSelected(square);
        if (learningHelp) {
          const count = chess.moves({ square, verbose: true }).length;
          setMessage(count === 0 ? "That piece has no legal moves right now." : "");
        }
      }
      return;
    }

    if (piece?.color === myColor) {
      setSelected(square);
      setMessage("");
      return;
    }

    await attemptMove(selected, square);
  };

  const toggleLearningHelp = () => {
    setLearningHelp((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("chess-universe-learning-help", next ? "on" : "off");
      } catch {
        // Keep the in-memory preference when storage is unavailable.
      }
      return next;
    });
  };

  const presenceCopy =
    realtimeStatus !== "connected"
      ? `Reconnecting to ${opponentName}…`
      : opponentOnline
        ? `${opponentName} online`
        : `${opponentName} away / reconnecting`;

  return (
    <section className="play-layout">
      <div className="board-shell">
        <ChessBoard
          pieces={pieces}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onSquareClick={(square) => void onSquareClick(square)}
          onMoveAttempt={(from, to) => void attemptMove(from, to)}
          disabled={!isMyTurn || saving}
          orientation={myColor === "b" ? "b" : "w"}
        />
      </div>

      <aside className="game-panel">
        <button className="text-button back-link" onClick={onBack}>← Lobby</button>
        <div className="eyebrow">{gameRow.tournament_match_id ? "SEASON CHAMPIONSHIP" : isBattle ? "BATTLE CHESS ONLINE" : "ONLINE TABLE"}</div>
        <h2>{myColor === "w" ? "You are White" : myColor === "b" ? "You are Black" : "Spectating"}</h2>
        {isBattle ? (
          <div className="battle-online-game-banner">
            <strong>Formation Clash · {formationName(gameRow.battle_formation_key)}</strong>
            <span>Battle Elo is separate from Classic Elo. Normal chess movement, Black first, no castling.</span>
          </div>
        ) : null}
        {gameRow.tournament_match_id ? (
          <div className="tournament-game-banner">
            <strong>Knockout match</strong>
            <span>Winner advances. A draw sends this bracket match to a replay.</span>
          </div>
        ) : null}

        {myColor ? (
          <div className="matchup-profile-strip" aria-label="Match players">
            <div>
              <span>You</span>
              <strong>{myProfile?.username ?? "Player"}</strong>
              <small>{isBattle ? `${myBattleStats?.rating ?? 1200} Battle rating` : `${myProfile?.rating ?? "—"} Classic rating`}</small>
            </div>
            <b>VS</b>
            <div>
              <span>Opponent</span>
              <strong>{opponentName}</strong>
              <small>{
                isBattle
                  ? opponentProfile
                    ? `${opponentBattleStats?.rating ?? 1200} Battle rating · ${opponentBattleStats?.wins ?? 0}-${opponentBattleStats?.losses ?? 0}-${opponentBattleStats?.draws ?? 0}`
                    : "Waiting for player"
                  : opponentProfile
                    ? `${opponentProfile.rating} Classic rating · ${opponentProfile.wins}-${opponentProfile.losses}-${opponentProfile.draws}`
                    : "Waiting for player"
              }</small>
            </div>
          </div>
        ) : null}

        {gameRow.status === "active" && myColor ? (
          <div className="online-presence">
            <span className={opponentOnline && realtimeStatus === "connected" ? "presence-dot online" : "presence-dot"} />
            <div>
              <strong>{presenceCopy}</strong>
              <small>
                {gameRow.time_control_minutes === 0
                  ? "Untimed games can safely be resumed after a disconnect."
                  : "The server clock keeps running during disconnects."}
              </small>
            </div>
          </div>
        ) : null}

        {gameRow.time_control_minutes === 0 ? (
          <div className="untimed-banner">
            <strong>Untimed casual</strong>
            <span>You can leave this table and resume it later.</span>
          </div>
        ) : (
          <div className="clock-row" aria-label="Game clocks">
            <div className={gameRow.current_turn === "b" && gameRow.status === "active" ? "clock active" : "clock"}>
              <span>Black</span>
              <strong>{formatClock(blackRemaining)}</strong>
            </div>
            <div className={gameRow.current_turn === "w" && gameRow.status === "active" ? "clock active" : "clock"}>
              <span>White</span>
              <strong>{formatClock(whiteRemaining)}</strong>
            </div>
          </div>
        )}

        <p className="status">{saving ? "Updating game…" : status}</p>
        {message ? <p className="form-message">{message}</p> : null}

        {gameRow.status === "active" && myColor ? (
          <div className="draw-controls">
            {drawOfferedByOpponent ? (
              <div className="draw-offer-card">
                <div>
                  <strong>Draw offered</strong>
                  <span>Your opponent is offering to end the game as a draw.</span>
                </div>
                <div>
                  <button
                    className="primary-action compact"
                    disabled={saving}
                    onClick={() => void invokeGameAction({ action: "accept_draw", gameId })}
                  >
                    Accept
                  </button>
                  <button
                    className="secondary-action compact"
                    disabled={saving}
                    onClick={() => void invokeGameAction({ action: "decline_draw", gameId })}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : drawOfferedByMe ? (
              <div className="draw-offer-card sent">
                <div>
                  <strong>Draw offer sent</strong>
                  <span>Your opponent can accept, decline, or make a move.</span>
                </div>
              </div>
            ) : canOfferDraw ? (
              <button
                className="secondary-action draw-action"
                disabled={saving}
                onClick={() => void invokeGameAction({ action: "offer_draw", gameId })}
              >
                Offer draw
              </button>
            ) : null}
          </div>
        ) : null}

        {gameRow.status === "completed" && myColor ? (
          <div className={`post-game-summary ${resultForMe.toLowerCase().replace(" ", "-")}`}>
            <div>
              <div className="eyebrow">FINAL</div>
              <strong>{resultForMe}</strong>
              <span>{gameRow.result_reason ? gameRow.result_reason.replaceAll("_", " ") : "completed"}</span>
            </div>
            <div className="rating-result">
              {myRatingDelta !== null && myRatingBefore !== null && myRatingAfter !== null ? (
                <>
                  <strong className={myRatingDelta > 0 ? "rating-up" : myRatingDelta < 0 ? "rating-down" : ""}>
                    {myRatingDelta > 0 ? "+" : ""}{myRatingDelta}
                  </strong>
                  <span>{myRatingBefore} → {myRatingAfter} {isBattle ? "Battle" : "Classic"} rating</span>
                </>
              ) : (
                <>
                  <strong>{isBattle ? myBattleStats?.rating ?? 1200 : myProfile?.rating ?? "—"}</strong>
                  <span>Current {isBattle ? "Battle" : "Classic"} rating · older game has no rating snapshot</span>
                </>
              )}
            </div>
          </div>
        ) : null}

        {gameRow.status === "completed" && myColor && gameRow.tournament_match_id ? (
          <div className="championship-game-result">
            <div>
              <div className="eyebrow">CHAMPIONSHIP</div>
              <strong>{gameRow.result === "draw" ? "Replay required" : "Bracket result recorded"}</strong>
              <span>
                {gameRow.result === "draw"
                  ? "This draw does not eliminate either player. Return to the Championship bracket to start the replay."
                  : "The winner has advanced automatically in the Season Championship bracket."}
              </span>
            </div>
            <button className="primary-action compact" onClick={onBack}>
              Back to Championship
            </button>
          </div>
        ) : null}

        {gameRow.status === "completed" && myColor && !gameRow.tournament_match_id ? (
          <div className={gameRow.rematch_game_id ? "rematch-card requested" : "rematch-card"}>
            <div>
              <strong>
                {gameRow.rematch_game_id
                  ? gameRow.rematch_requested_by === session.user.id
                    ? "Rematch table ready"
                    : `${opponentName} wants a rematch`
                  : "Run it back?"}
              </strong>
              <span>
                {gameRow.rematch_game_id
                  ? gameRow.rematch_requested_by === session.user.id
                    ? "Your private rematch is waiting for the other player."
                    : `Accept to play ${opponentName} again with the same clock.`
                  : "Start a private rematch with the same time control."}
              </span>
            </div>
            <button
              className="primary-action compact"
              disabled={saving}
              onClick={() => void openRematch()}
            >
              {gameRow.rematch_game_id
                ? gameRow.rematch_requested_by === session.user.id
                  ? "Open rematch"
                  : "Accept rematch"
                : "Rematch"}
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className={learningHelp ? "learning-toggle active" : "learning-toggle"}
          onClick={toggleLearningHelp}
        >
          <span>
            <strong>Learning Help</strong>
            <small>
              {learningHelp
                ? "Legal moves and check guidance are on."
                : "Board assistance is off."}
            </small>
          </span>
          <b>{learningHelp ? "ON" : "OFF"}</b>
        </button>

        <div className="online-meta">
          <span>{gameRow.time_control_minutes === 0 ? "Untimed" : `${gameRow.time_control_minutes} min`}</span>
          <span>Black moves first</span>
          {isBattle ? <span>Battle · {formationName(gameRow.battle_formation_key)}</span> : null}
          {gameRow.tournament_match_id ? <span>Season Championship</span> : null}
          <span>{gameRow.id.slice(0, 8)}</span>
        </div>

        <div className="move-history">
          <div className="move-history-heading">
            <strong>Moves</strong>
            <span>{moves.length === 0 ? "No moves yet" : `${moves.length} played`}</span>
          </div>
          <div className="move-history-list">
            {moves.length === 0 ? (
              <p className="muted">Black makes the opening move.</p>
            ) : (
              moves.map((move) => (
                <div className="move-entry" key={move.id}>
                  <span>{moveNumber(move)}</span>
                  <strong>{move.san}</strong>
                  <small>{move.from_square} → {move.to_square}</small>
                </div>
              ))
            )}
          </div>
        </div>

        {gameRow.status === "active" && myColor ? (
          <button
            className="secondary-action danger-action"
            disabled={saving}
            onClick={() => void invokeGameAction({ action: "resign", gameId })}
          >
            {moves.length < 4 && !gameRow.tournament_match_id ? "Abort game" : "Resign game"}
          </button>
        ) : null}

        <p className="muted">
          Moves, results, and draw agreements are validated by the trusted game service before the database accepts them.
          {isBattle ? " Battle results update only Battle rating and Battle stats." : ""}
          {gameRow.time_control_minutes === 0
            ? " Untimed games are casual and unrated, and they do not expire from a chess clock."
            : " Timed games are rated after 4 plies and keep running after they begin, so reconnect instead of expecting a pause."}
        </p>
      </aside>
    </section>
  );
}
