import type { Chess } from "chess.js";

const ENGINE_TIMEOUT_MS = 20000;

export type Difficulty = "beginner" | "easy" | "medium" | "hard";

export const STOCKFISH_LEVELS: Record<Difficulty, { depth: number; skill: number }> = {
  beginner: { depth: 3, skill: 0 },
  easy: { depth: 6, skill: 4 },
  medium: { depth: 10, skill: 10 },
  hard: { depth: 15, skill: 20 },
};

export async function getComputerMove(game: Chess, difficulty: Difficulty): Promise<string> {
  if (typeof Worker === "undefined") throw new Error("This browser cannot run the chess engine.");

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let worker: Worker;
    let timer: number;

    const finish = (move?: string, error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker?.terminate();
      if (error || !move) reject(error ?? new Error("Stockfish returned no move."));
      else resolve(move);
    };

    try {
      worker = new Worker("/stockfish.js");
      timer = window.setTimeout(
        () => finish(undefined, new Error("Stockfish did not respond. Try a lower difficulty or reload.")),
        ENGINE_TIMEOUT_MS
      );
      worker.onmessage = (event) => {
        const line = String(event.data ?? "");
        if (line === "uciok") {
          worker.postMessage(`setoption name Skill Level value ${STOCKFISH_LEVELS[difficulty].skill}`);
          worker.postMessage("isready");
        } else if (line === "readyok") {
          worker.postMessage(`position fen ${game.fen()}`);
          worker.postMessage(`go depth ${STOCKFISH_LEVELS[difficulty].depth}`);
        } else if (line.startsWith("bestmove ")) {
          const move = line.split(/\s+/)[1];
          if (!move || move === "(none)") finish(undefined, new Error("Stockfish returned no move."));
          else finish(move);
        }
      };
      worker.onerror = () => finish(undefined, new Error("Stockfish could not load in this browser."));
      worker.postMessage("uci");
    } catch {
      finish(undefined, new Error("Stockfish could not start in this browser."));
    }
  });
}
