import { useState } from "react";
import type { Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { HORSE_START, QUEEN_TARGETS, initialQueens, legalHorseCaptures } from "../lib/magicHorse";

const STORAGE_KEY = "chess-universe-magic-horse-unlocked";

function savedUnlock() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value >= 1 && value <= 4 ? value : 1;
  } catch {
    return 1;
  }
}

export function MagicHorseGame() {
  const [unlocked, setUnlocked] = useState(savedUnlock);
  const [level, setLevel] = useState(1);
  const [horse, setHorse] = useState<Square>(HORSE_START);
  const [queens, setQueens] = useState(initialQueens);
  const [moves, setMoves] = useState(0);
  const [result, setResult] = useState<"playing" | "won" | "stuck">("playing");

  const targets = legalHorseCaptures(horse, queens);
  const goal = QUEEN_TARGETS[level - 1];

  const start = (nextLevel: number) => {
    if (nextLevel > unlocked) return;
    setLevel(nextLevel);
    setHorse(HORSE_START);
    setQueens(initialQueens());
    setMoves(0);
    setResult("playing");
  };

  const capture = (square: Square) => {
    if (result !== "playing" || !targets.includes(square)) return;
    const remaining = queens.filter((queen) => queen !== square);
    setHorse(square);
    setQueens(remaining);
    setMoves((count) => count + 1);

    if (remaining.length === goal) {
      setResult("won");
      if (level < 4 && unlocked <= level) {
        setUnlocked(level + 1);
        try { window.localStorage.setItem(STORAGE_KEY, String(level + 1)); } catch { /* private browsing */ }
      }
    } else if (legalHorseCaptures(square, remaining).length === 0) {
      setResult("stuck");
    }
  };

  const pieces = [
    ...queens.map((square) => ({ square, type: "q", color: "w" as const })),
    { square: horse, type: "n", color: "b" as const },
  ];

  return (
    <section className="horse-layout">
      <div className="board-shell">
        <ChessBoard pieces={pieces} selected={horse} legalTargets={result === "playing" ? targets : []} onSquareClick={capture} disabled={result !== "playing"} />
      </div>
      <aside className="game-panel">
        <div className="eyebrow">MAGIC HORSE</div>
        <h2>Capture the queens</h2>
        <p className="muted">Move the horse in an L shape. Each move must capture a queen. Clear the target to unlock the next challenge.</p>
        <div className="horse-levels" aria-label="Challenge levels">
          {QUEEN_TARGETS.map((target, index) => (
            <button key={target} type="button" className={level === index + 1 ? "active" : ""} disabled={index + 1 > unlocked} onClick={() => start(index + 1)}>
              Level {index + 1}<span>{index + 1 > unlocked ? "Locked" : target === 0 ? "Clear all" : `Leave ${target}`}</span>
            </button>
          ))}
        </div>
        <p className="horse-progress">{queens.length} queens left · {moves} captures · goal: {goal === 0 ? "clear all" : `leave ${goal}`}</p>
        <p className="status" role="status">
          {result === "won" ? level === 4 ? "All queens captured!" : `Level ${level} complete. Level ${level + 1} unlocked.` :
            result === "stuck" ? "No queen is in reach. Try a different route." : "Choose a highlighted queen to capture."}
        </p>
        <button className="primary-action" onClick={() => start(level)}>Restart level</button>
        {result === "won" && level < 4 ? <button className="secondary-action horse-next" onClick={() => start(level + 1)}>Next level</button> : null}
      </aside>
    </section>
  );
}
