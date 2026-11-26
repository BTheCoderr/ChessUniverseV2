/**
 * VoiceOver labels and stable test IDs for every native chess board square.
 * Kept free of React Native imports so it can be unit tested in Node.
 */
export type A11yPiece = { color: "w" | "b"; type: "p" | "n" | "b" | "r" | "q" | "k" };

const PIECE_NAMES: Record<A11yPiece["type"], string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export function pieceName(piece: A11yPiece) {
  return `${piece.color === "w" ? "White" : "Black"} ${PIECE_NAMES[piece.type]}`;
}

export type SquareA11yState = {
  selected?: boolean;
  target?: boolean;
  lastMove?: boolean;
  check?: boolean;
};

/** e.g. "e4, White knight, selected" or "d5, empty, legal move". */
export function squareAccessibilityLabel(square: string, piece: A11yPiece | null | undefined, state: SquareA11yState = {}) {
  const parts = [square, piece ? pieceName(piece) : "empty"];
  if (state.check) parts.push("in check");
  if (state.selected) parts.push("selected");
  if (state.target) parts.push(piece ? "capture available" : "legal move");
  if (state.lastMove) parts.push("last move");
  return parts.join(", ");
}

/** Stable Maestro / XCUITest identifier for a board square. */
export function squareTestId(square: string) {
  return `square-${square}`;
}
