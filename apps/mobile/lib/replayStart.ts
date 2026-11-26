/**
 * Starting positions for replaying server games. Mirrors
 * supabase/functions/online-game/rules.mjs so My Games replays begin from the
 * same Black-first (and Battle formation) position the server used.
 */
export const BLACK_FIRST_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";

export const BATTLE_START_FENS: Readonly<Record<string, string>> = Object.freeze({
  classic: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b - - 0 1",
  cavalry: "rnnqkbbr/pppppppp/8/8/8/8/PPPPPPPP/RNNQKBBR b - - 0 1",
  fortress: "rbnqknbr/pppppppp/8/8/8/8/PPPPPPPP/RBNQKNBR b - - 0 1",
  crest_guard: "nrbqkbrn/pppppppp/8/8/8/8/PPPPPPPP/NRBQKBRN b - - 0 1",
  crown_wall: "qrbnknbr/pppppppp/8/8/8/8/PPPPPPPP/QRBNKNBR b - - 0 1",
  master_grid: "bnrqkrnb/pppppppp/8/8/8/8/PPPPPPPP/BNRQKRNB b - - 0 1",
});

export function replayStartFen(game: { variant?: string | null; battle_formation_key?: string | null } | null | undefined) {
  if (!game || game.variant !== "battle") return BLACK_FIRST_FEN;
  return BATTLE_START_FENS[game.battle_formation_key ?? ""] ?? BATTLE_START_FENS.classic;
}
