import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { Session } from "@supabase/supabase-js";
import { ChessBoard } from "./ChessBoard";
import { supabase } from "../lib/supabase";

type GameRow = {
  id: string;
  white_id: string;
  black_id: string | null;
  status: "waiting" | "active" | "completed" | "cancelled";
  fen: string;
  current_turn: "w" | "b";
  time_control_minutes: number;
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

  const load = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client
      .from("games")
      .select("id,white_id,black_id,status,fen,current_turn,time_control_minutes")
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
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, gameId, load]);

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

  const myColor =
    gameRow.white_id === session.user.id
      ? "w"
      : gameRow.black_id === session.user.id
        ? "b"
        : null;

  const isMyTurn =
    gameRow.status === "active" &&
    myColor !== null &&
    gameRow.current_turn === myColor;

  const status =
    gameRow.status === "waiting"
      ? "Waiting for an opponent…"
      : gameRow.status !== "active"
        ? `Game ${gameRow.status}`
        : isMyTurn
          ? "Your move"
          : "Opponent's move";

  const onSquareClick = async (square: Square) => {
    if (!isMyTurn || saving || !myColor) return;

    const piece = chess.get(square);
    if (!selected) {
      if (piece?.color === myColor) setSelected(square);
      return;
    }

    const next = new Chess(chess.fen());

    try {
      const move = next.move({
        from: selected,
        to: square,
        promotion: "q",
      });

      if (!move) return;

      setSelected(null);
      setSaving(true);
      setMessage("");

      const { error } = await client.rpc("submit_game_move", {
        target_game_id: gameId,
        move_from: move.from,
        move_to: move.to,
        move_promotion: move.promotion ?? null,
        move_san: move.san,
        next_fen: next.fen(),
      });

      if (error) {
        setMessage(error.message);
        await load();
      }
    } catch {
      if (piece?.color === myColor) setSelected(square);
      else setSelected(null);
    } finally {
      setSaving(false);
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
        />
      </div>

      <aside className="game-panel">
        <button className="text-button back-link" onClick={onBack}>← Lobby</button>
        <div className="eyebrow">ONLINE TABLE</div>
        <h2>{myColor === "w" ? "You are White" : myColor === "b" ? "You are Black" : "Spectating"}</h2>
        <p className="status">{saving ? "Sending move…" : status}</p>
        {message ? <p className="form-message">{message}</p> : null}
        <div className="online-meta">
          <span>{gameRow.time_control_minutes} min</span>
          <span>{gameRow.id.slice(0, 8)}</span>
        </div>
        <p className="muted">
          Casual multiplayer MVP. Turn ownership and move sequencing are enforced in Supabase.
          Rated play stays off until chess legality is also validated by trusted server-side code.
        </p>
      </aside>
    </section>
  );
}
