import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { Session } from "@supabase/supabase-js";
import { ChessBoard } from "./ChessBoard";
import { supabase } from "../lib/supabase";

type GameRow = {
  id: string;
  white_id: string;
  black_id: string | null;
  status: "waiting" | "active" | "completed" | "cancelled";
  result: "white" | "black" | "draw" | null;
  result_reason: string | null;
  fen: string;
  current_turn: "w" | "b";
  time_control_minutes: number;
  increment_seconds: number;
  white_time_ms: number | null;
  black_time_ms: number | null;
  started_at: string | null;
  last_move_at: string | null;
};

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

export function OnlineGame({
  gameId,
  session,
  onBack,
}: {
  gameId: string;
  session: Session;
  onBack: () => void;
}) {
  const client = supabase;
  const [gameRow, setGameRow] = useState<GameRow | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [message, setMessage] = useState("Loading game…");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const timeoutClaimed = useRef(false);

  const load = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client
      .from("games")
      .select("id,white_id,black_id,status,result,result_reason,fen,current_turn,time_control_minutes,increment_seconds,white_time_ms,black_time_ms,started_at,last_move_at")
      .eq("id", gameId)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setGameRow(data as GameRow);
    setMessage("");
  }, [client, gameId]);

  useEffect(() => {
    void load();
    if (!client) return;

    const channel = client
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          setGameRow(payload.new as GameRow);
          setSelected(null);
          timeoutClaimed.current = false;
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, gameId, load]);

  useEffect(() => {
    if (gameRow?.status !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [gameRow?.status]);

  const myColor =
    gameRow?.white_id === session.user.id
      ? "w"
      : gameRow?.black_id === session.user.id
        ? "b"
        : null;

  const whiteRemaining = gameRow ? remainingTime(gameRow, "w", now) : 0;
  const blackRemaining = gameRow ? remainingTime(gameRow, "b", now) : 0;

  useEffect(() => {
    if (!client || !gameRow || gameRow.status !== "active" || !myColor || timeoutClaimed.current) return;
    const activeRemaining = gameRow.current_turn === "w" ? whiteRemaining : blackRemaining;
    if (activeRemaining > 0) return;

    timeoutClaimed.current = true;
    void client.functions
      .invoke("online-game", { body: { action: "timeout", gameId } })
      .then(({ error }) => {
        if (error) {
          timeoutClaimed.current = false;
          setMessage(error.message);
        }
      });
  }, [blackRemaining, client, gameId, gameRow, myColor, whiteRemaining]);

  const chess = useMemo(() => {
    try {
      return new Chess(gameRow?.fen);
    } catch {
      return new Chess();
    }
  }, [gameRow?.fen]);

  const pieces = useMemo(() => boardPieces(chess), [chess]);
  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [chess, selected]);

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

  const resultText =
    gameRow.result === "white"
      ? "White wins"
      : gameRow.result === "black"
        ? "Black wins"
        : gameRow.result === "draw"
          ? "Draw"
          : null;

  const status =
    gameRow.status === "waiting"
      ? "Waiting for an opponent…"
      : gameRow.status === "completed"
        ? `${resultText ?? "Game over"}${gameRow.result_reason ? ` · ${gameRow.result_reason.replaceAll("_", " ")}` : ""}`
        : gameRow.status === "cancelled"
          ? "Game cancelled"
          : isMyTurn
            ? "Your move"
            : "Opponent's move";

  const invokeGameAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    setMessage("");
    const { error } = await client.functions.invoke("online-game", { body });
    if (error) {
      setMessage(error.message);
      await load();
    }
    setSaving(false);
  };

  const onSquareClick = async (square: Square) => {
    if (!isMyTurn || saving || !myColor) return;

    const piece = chess.get(square);
    if (!selected) {
      if (piece?.color === myColor) setSelected(square);
      return;
    }

    try {
      const preview = new Chess(chess.fen());
      const move = preview.move({ from: selected, to: square, promotion: "q" });
      if (!move) return;

      setSelected(null);
      await invokeGameAction({
        action: "move",
        gameId,
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? null,
      });
    } catch {
      if (piece?.color === myColor) setSelected(square);
      else setSelected(null);
    }
  };

  return (
    <section className="play-layout">
      <div className="board-shell">
        <ChessBoard
          pieces={pieces}
          selected={selected}
          legalTargets={legalTargets}
          onSquareClick={(square) => void onSquareClick(square)}
          disabled={!isMyTurn || saving}
          orientation={myColor === "b" ? "b" : "w"}
        />
      </div>

      <aside className="game-panel">
        <button className="text-button back-link" onClick={onBack}>← Lobby</button>
        <div className="eyebrow">ONLINE TABLE</div>
        <h2>{myColor === "w" ? "You are White" : myColor === "b" ? "You are Black" : "Spectating"}</h2>

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

        <p className="status">{saving ? "Updating game…" : status}</p>
        {message ? <p className="form-message">{message}</p> : null}

        <div className="online-meta">
          <span>{gameRow.time_control_minutes} min</span>
          <span>Black moves first</span>
          <span>{gameRow.id.slice(0, 8)}</span>
        </div>

        {gameRow.status === "active" && myColor ? (
          <button
            className="secondary-action danger-action"
            disabled={saving}
            onClick={() => void invokeGameAction({ action: "resign", gameId })}
          >
            Resign game
          </button>
        ) : null}

        <p className="muted">
          Moves are validated by the trusted game function before the database accepts them.
          Clocks are calculated from server timestamps and the table restores after a refresh.
        </p>
      </aside>
    </section>
  );
}
