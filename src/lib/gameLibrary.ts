import { Chess, type Color, type Square } from "chess.js";
import type { Difficulty } from "./stockfish";
import type { PracticeMode } from "./practice";

export const GAME_LIBRARY_KEY = "chess-universe-game-library-v1";
export const MAX_LOCAL_GAMES = 50;

export type LibraryMove = {
  from: Square;
  to: Square;
  promotion?: string;
  san: string;
  color: Color;
};

export type StoredGame = {
  id: string;
  completedAt: string;
  mode: PracticeMode;
  difficulty: Difficulty;
  timeControlMinutes: number;
  result: string;
  moves: LibraryMove[];
};

export function createUniverseGame() {
  const game = new Chess();
  game.load(game.fen().replace(" w ", " b "));
  return game;
}

export function buildUniversePosition(moves: LibraryMove[], ply = moves.length) {
  const game = createUniverseGame();
  const capped = Math.max(0, Math.min(ply, moves.length));

  for (const move of moves.slice(0, capped)) {
    game.move({
      from: move.from,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
    });
  }

  return game;
}

function validMove(value: unknown): value is LibraryMove {
  if (!value || typeof value !== "object") return false;
  const move = value as Record<string, unknown>;
  return (
    typeof move.from === "string" &&
    typeof move.to === "string" &&
    typeof move.san === "string" &&
    (move.color === "w" || move.color === "b") &&
    (move.promotion === undefined || typeof move.promotion === "string")
  );
}

function validMode(value: unknown): value is PracticeMode {
  return value === "ai" || value === "local";
}

function validDifficulty(value: unknown): value is Difficulty {
  return value === "beginner" || value === "easy" || value === "medium" || value === "hard";
}

export function normalizeGameLibrary(value: unknown): StoredGame[] {
  if (!Array.isArray(value)) return [];

  const normalized: StoredGame[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const game = item as Record<string, unknown>;
    if (
      typeof game.id !== "string" ||
      typeof game.completedAt !== "string" ||
      !validMode(game.mode) ||
      !validDifficulty(game.difficulty) ||
      typeof game.timeControlMinutes !== "number" ||
      typeof game.result !== "string" ||
      !Array.isArray(game.moves) ||
      !game.moves.every(validMove)
    ) {
      continue;
    }

    normalized.push({
      id: game.id,
      completedAt: game.completedAt,
      mode: game.mode,
      difficulty: game.difficulty,
      timeControlMinutes: Math.max(0, Math.floor(game.timeControlMinutes)),
      result: game.result,
      moves: game.moves as LibraryMove[],
    });
  }

  return normalized
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, MAX_LOCAL_GAMES);
}

export function loadGameLibrary(): StoredGame[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GAME_LIBRARY_KEY);
    return raw ? normalizeGameLibrary(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveGameToLibrary(game: StoredGame): StoredGame[] {
  const current = loadGameLibrary();
  const next = normalizeGameLibrary([
    game,
    ...current.filter((item) => item.id !== game.id),
  ]);
  try {
    window.localStorage.setItem(GAME_LIBRARY_KEY, JSON.stringify(next));
  } catch {
    // The finished game still exists in memory when storage is unavailable.
  }
  return next;
}

export function deleteGameFromLibrary(gameId: string): StoredGame[] {
  const next = loadGameLibrary().filter((game) => game.id !== gameId);
  try {
    window.localStorage.setItem(GAME_LIBRARY_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
  return next;
}

export function makeLocalGameId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
