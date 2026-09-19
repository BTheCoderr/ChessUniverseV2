import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { getComputerMove } from "../lib/stockfish";

type Mode = "local" | "ai";

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

export function LocalGame() {
  const [game, setGame] = useState(() => new Chess());
  const [mode, setMode] = useState<Mode>("ai");
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState("White to move");

  const pieces = useMemo(() => boardPieces(game), [game]);
  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [game, selected]);

  const statusText = () => {
    if (game.isCheckmate()) return `Checkmate — ${game.turn() === "w" ? "Black" : "White"} wins`;
    if (game.isDraw()) return "Draw";
    return `${game.turn() === "w" ? "White" : "Black"} to move${game.inCheck() ? " — check" : ""}`;
  };

  const applyComputerMove = async (next: Chess) => {
    if (mode !== "ai" || next.isGameOver() || next.turn() !== "b") return;
    setThinking(true);
    const move = await getComputerMove(next, 10);
    if (move) {
      const aiGame = new Chess(next.fen());
      try {
        if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
          aiGame.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] ?? "q" });
        } else {
          aiGame.move(move);
        }
        setGame(aiGame);
        setMessage(aiGame.isGameOver() ? statusTextFor(aiGame) : "Your move");
      } catch {
        setMessage("Computer move failed. Start a new game.");
      }
    }
    setThinking(false);
  };

  const statusTextFor = (value: Chess) => {
    if (value.isCheckmate()) return `Checkmate — ${value.turn() === "w" ? "Black" : "White"} wins`;
    if (value.isDraw()) return "Draw";
    return `${value.turn() === "w" ? "White" : "Black"} to move${value.inCheck() ? " — check" : ""}`;
  };

  const onSquareClick = (square: Square) => {
    if (thinking || game.isGameOver()) return;
    if (mode === "ai" && game.turn() === "b") return;

    const piece = game.get(square);
    if (!selected) {
      if (piece && piece.color === game.turn()) setSelected(square);
      return;
    }

    const next = new Chess(game.fen());
    try {
      const move = next.move({ from: selected, to: square, promotion: "q" });
      setSelected(null);
      if (!move) return;
      setGame(next);
      setMessage(statusTextFor(next));
      void applyComputerMove(next);
    } catch {
      if (piece && piece.color === game.turn()) setSelected(square);
      else setSelected(null);
    }
  };

  const reset = () => {
    const next = new Chess();
    setGame(next);
    setSelected(null);
    setThinking(false);
    setMessage("White to move");
  };

  return (
    <section className="play-layout">
      <div className="board-shell">
        <ChessBoard
          pieces={pieces}
          selected={selected}
          legalTargets={legalTargets}
          onSquareClick={onSquareClick}
          disabled={thinking}
        />
      </div>
      <aside className="game-panel">
        <div className="eyebrow">PLAY</div>
        <h2>{mode === "ai" ? "You vs Computer" : "Local Board"}</h2>
        <p className="status">{thinking ? "Computer is thinking…" : message || statusText()}</p>
        <div className="segmented">
          <button className={mode === "ai" ? "active" : ""} onClick={() => { setMode("ai"); reset(); }}>Vs AI</button>
          <button className={mode === "local" ? "active" : ""} onClick={() => { setMode("local"); reset(); }}>2 Player</button>
        </div>
        <button className="primary-action" onClick={reset}>New game</button>
        <p className="muted">Stockfish runs in your browser. If the legacy worker cannot load, the game falls back to a legal computer move instead of breaking.</p>
      </aside>
    </section>
  );
}
