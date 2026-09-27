import { useEffect, useMemo, useState } from "react";
import type { Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { gameStatus, legalMoves, newPosition, playMove, type Move, type QueenLevel } from "../lib/evolvingQueens";

import type { QueenDifficulty } from "../lib/queenAi";

const descriptions = [
  "Classic queen: long rook and bishop moves.",
  "Bishop lines, one square in any direction, and knight jumps. No long rook lines.",
  "Rook lines, one square in any direction, and knight jumps. No long bishop lines.",
  "Full queen lines, one square in any direction, and knight jumps.",
];

export function EvolvingQueensGame() {
  const [mode, setMode] = useState<"ai" | "local">("ai");
  const [difficulty, setDifficulty] = useState<QueenDifficulty>("medium");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
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

  const aiTurn = mode === "ai" && position.turn === "w" && !over;

  useEffect(() => {
    setError("");
    if (!aiTurn) return;
    let active = true;
    let worker: Worker | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (!active) return;
      setError("The queen opponent could not make a move. Please retry.");
      worker?.terminate();
      clearTimeout(watchdog);
    };
    try {
      worker = new Worker(new URL("../lib/queenAi.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<{ move?: Move; error?: string }>) => {
        if (!active) return;
        const move = event.data.move;
        const next = move && !event.data.error ? playMove(position, level, move.from, move.to) : null;
        if (!next) { fail(); return; }
        clearTimeout(watchdog);
        worker?.terminate();
        setHistory((previous) => [...previous, position]);
        setPosition(next);
      };
      worker.onerror = fail;
      watchdog = setTimeout(fail, 12000);
      worker.postMessage({ position, level, difficulty });
    } catch { fail(); }
    return () => { active = false; clearTimeout(watchdog); worker?.terminate(); };
  }, [aiTurn, position, level, difficulty, retry]);

  const chooseLevel = (next: QueenLevel) => {
    setError("");
    setLevel(next);
    setPosition(newPosition());
    setSelected(null);
    setHistory([]);
  };
  const click = (square: Square) => {
    if (over || aiTurn) return;
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
        <ChessBoard pieces={pieces} selected={selected} legalTargets={targets} onSquareClick={click} orientation="b" disabled={aiTurn} />
      </div>
      <aside className="game-panel">
        <div className="eyebrow">EVOLVING QUEENS</div>
        <h2>Queen evolution</h2>
        <p className="muted">{mode === "ai" ? "You play Black. The computer plays White." : "Two players on one board."} Black moves first. Choose a level to change how both queens move.</p>
        <div className="segmented">
          <button className={mode === "ai" ? "active" : ""} onClick={() => { setMode("ai"); chooseLevel(level); }}>Vs AI</button>
          <button className={mode === "local" ? "active" : ""} onClick={() => { setMode("local"); chooseLevel(level); }}>2 Player</button>
        </div>
        {mode === "ai" ? <div className="game-settings">
          <label htmlFor="queen-difficulty">AI difficulty</label>
          <select id="queen-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as QueenDifficulty)}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
          <p className="muted">Higher difficulty searches further ahead using this level’s queen rules.</p>
        </div> : null}
        <div className="horse-levels" aria-label="Queen movement levels">
          {([1, 2, 3, 4] as const).map((value) => <button key={value} type="button" className={level === value ? "active" : ""} onClick={() => chooseLevel(value)}>
            Level {value}<span>{value === 1 ? "Classic" : value === 2 ? "Bishop + horse" : value === 3 ? "Rook + horse" : "Full + horse"}</span>
          </button>)}
        </div>
        <p className="muted">{descriptions[level - 1]}</p>
        <p className="status" role="status">{error || (aiTurn ? "Queen opponent is thinking…" : status)}</p>
        {error ? <button className="secondary-action" onClick={() => setRetry((value) => value + 1)}>Retry AI move</button> : null}
        <p className="muted">Pawns promote to queens with the current level’s movement.</p>
        <button className="primary-action" onClick={() => chooseLevel(level)}>New game</button>
        <button className="secondary-action horse-next" disabled={history.length === 0} onClick={() => {
          const steps = mode === "ai" && position.turn === "b" ? 2 : 1;
          const previous = history.at(-steps);
          if (previous) { setError(""); setPosition(previous); setHistory(history.slice(0, -steps)); setSelected(null); }
        }}>Undo move</button>
      </aside>
    </section>
  );
}
