import type { Chess } from "chess.js";

const ENGINE_TIMEOUT_MS = 20000;

export type Difficulty = "beginner" | "easy" | "medium" | "hard";

export type EngineAnalysis = {
  bestMove: string;
  scoreCp: number;
  depth: number;
};

export const STOCKFISH_LEVELS: Record<Difficulty, { depth: number; skill: number }> = {
  beginner: { depth: 3, skill: 0 },
  easy: { depth: 6, skill: 4 },
  medium: { depth: 10, skill: 10 },
  hard: { depth: 15, skill: 20 },
};

function ensureWorkerSupport() {
  if (typeof Worker === "undefined") {
    throw new Error("This browser cannot run the chess engine.");
  }
}

function parseEngineScore(line: string) {
  const match = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  if (!match) return null;

  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;

  if (match[1] === "mate") {
    if (value === 0) return 0;
    return value > 0 ? 100000 - Math.min(value, 999) : -100000 - Math.max(value, -999);
  }

  return value;
}

export async function analyzePosition(game: Chess, depth = 6): Promise<EngineAnalysis> {
  ensureWorkerSupport();

  return new Promise<EngineAnalysis>((resolve, reject) => {
    let settled = false;
    let worker: Worker;
    let timer = 0;
    let latestScore = 0;
    let latestDepth = 0;

    const finish = (analysis?: EngineAnalysis, error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker?.terminate();
      if (error || !analysis) reject(error ?? new Error("Stockfish returned no analysis."));
      else resolve(analysis);
    };

    try {
      worker = new Worker("/stockfish.js");
      timer = window.setTimeout(
        () => finish(undefined, new Error("Stockfish analysis timed out.")),
        ENGINE_TIMEOUT_MS
      );

      worker.onmessage = (event) => {
        const line = String(event.data ?? "");

        if (line === "uciok") {
          worker.postMessage("setoption name Skill Level value 20");
          worker.postMessage("isready");
          return;
        }

        if (line === "readyok") {
          worker.postMessage(`position fen ${game.fen()}`);
          worker.postMessage(`go depth ${Math.max(1, Math.min(18, Math.floor(depth)))}`);
          return;
        }

        if (line.startsWith("info ")) {
          const score = parseEngineScore(line);
          const depthMatch = line.match(/\bdepth\s+(\d+)/);
          if (score !== null) latestScore = score;
          if (depthMatch) latestDepth = Number(depthMatch[1]);
          return;
        }

        if (line.startsWith("bestmove ")) {
          const bestMove = line.split(/\s+/)[1];
          if (!bestMove || bestMove === "(none)") {
            finish(undefined, new Error("Stockfish returned no best move."));
            return;
          }
          finish({
            bestMove,
            scoreCp: latestScore,
            depth: latestDepth || depth,
          });
        }
      };

      worker.onerror = () => finish(undefined, new Error("Stockfish could not load in this browser."));
      worker.postMessage("uci");
    } catch {
      finish(undefined, new Error("Stockfish could not start in this browser."));
    }
  });
}

export async function getComputerMove(game: Chess, difficulty: Difficulty): Promise<string> {
  ensureWorkerSupport();

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let worker: Worker;
    let timer = 0;

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
