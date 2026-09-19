import type { Chess } from "chess.js";

const ENGINE_TIMEOUT_MS = 5000;

function randomLegalMove(game: Chess): string | null {
  const moves = game.moves();
  if (!moves.length) return null;
  return moves[Math.floor(Math.random() * moves.length)] ?? null;
}

export async function getComputerMove(game: Chess, depth = 10): Promise<string | null> {
  if (typeof Worker === "undefined") return randomLegalMove(game);

  return new Promise((resolve) => {
    let settled = false;
    let worker: Worker | null = null;

    const finish = (move: string | null) => {
      if (settled) return;
      settled = true;
      if (worker) worker.terminate();
      resolve(move ?? randomLegalMove(game));
    };

    const timer = window.setTimeout(() => finish(null), ENGINE_TIMEOUT_MS);

    try {
      worker = new Worker("/stockfish.js");
      worker.onmessage = (event) => {
        const line = String(event.data ?? "");
        if (!line.startsWith("bestmove ")) return;
        window.clearTimeout(timer);
        const uci = line.split(/\s+/)[1];
        if (!uci || uci === "(none)") return finish(null);
        finish(uci);
      };
      worker.onerror = () => {
        window.clearTimeout(timer);
        finish(null);
      };
      worker.postMessage("uci");
      worker.postMessage(`position fen ${game.fen()}`);
      worker.postMessage(`go depth ${depth}`);
    } catch {
      window.clearTimeout(timer);
      finish(null);
    }
  });
}
