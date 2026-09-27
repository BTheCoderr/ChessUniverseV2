import { useMemo, useState } from "react";
import type { Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { gameStatus, legalMoves, newPosition, playMove, type QueenLevel } from "../lib/evolvingQueens";

const descriptions = [
  "Classic queen: long rook and bishop moves.",
  "Bishop lines, one square in any direction, and knight jumps. No long rook lines.",
  "Rook lines, one square in any direction, and knight jumps. No long bishop lines.",
  "Full queen lines, one square in any direction, and knight jumps.",
];

export function EvolvingQueensGame() {
  const [level, setLevel] = useState<QueenLevel>(1);
  const [position, setPosition] = useState(newPosition);
  const [selected, setSelected] = useState<Square | null>(null);
  const [history, setHistory] = useState<ReturnType<typeof newPosition>[]>([]);
  const pieces = useMemo(() => position.board.flatMap((piece, i) => piece ? [{
    square: `${"abcdefgh"[i % 8]}${8 - Math.floor(i / 8)}` as Square, ...piece,
  }] : []), [position]);
  const targets = selected ? legalMoves(position, level, selected).map((move) => move.to) : [];
  const status = gameStatus(position, level);
  const over = status.startsWith("Checkmate") || status.startsWith("Draw");

  const chooseLevel = (next: QueenLevel) => {
    setLevel(next);
    setPosition(newPosition());
    setSelected(null);
    setHistory([]);
  };
  const click = (square: Square) => {
    if (over) return;
    const piece = position.board[(8 - Number(square[1])) * 8 + "abcdefgh".indexOf(square[0])];
    if (selected) {
      const next = playMove(position, level, selected, square);
      if (next) {
        setHistory([...history, position]);
        setPosition(next);
        setSelected(null);
        return;
      }
    }
    setSelected(piece?.color === position.turn ? square : null);
  };

  return (
    <section className="play-layout">
      <div className="board-shell">
        <ChessBoard pieces={pieces} selected={selected} legalTargets={targets} onSquareClick={click} orientation="b" />
      </div>
      <aside className="game-panel">
        <div className="eyebrow">EVOLVING QUEENS</div>
        <h2>Queen evolution</h2>
        <p className="muted">Two players on one board. Black moves first. Choose a level to change how both queens move.</p>
        <div className="horse-levels" aria-label="Queen movement levels">
          {([1, 2, 3, 4] as const).map((value) => <button key={value} type="button" className={level === value ? "active" : ""} onClick={() => chooseLevel(value)}>
            Level {value}<span>{value === 1 ? "Classic" : value === 2 ? "Bishop + horse" : value === 3 ? "Rook + horse" : "Full + horse"}</span>
          </button>)}
        </div>
        <p className="muted">{descriptions[level - 1]}</p>
        <p className="status" role="status">{status}</p>
        <p className="muted">Pawns promote to queens. This local mode has no computer opponent yet.</p>
        <button className="primary-action" onClick={() => chooseLevel(level)}>New game</button>
        <button className="secondary-action horse-next" disabled={history.length === 0} onClick={() => {
          const previous = history.at(-1);
          if (previous) { setPosition(previous); setHistory(history.slice(0, -1)); setSelected(null); }
        }}>Undo move</button>
      </aside>
    </section>
  );
}
