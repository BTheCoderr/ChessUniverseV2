import { useRef, useState, type CSSProperties } from "react";
import type { Square } from "chess.js";

type Piece = { square: Square; type: string; color: "w" | "b" };

type Props = {
  pieces: Piece[];
  selected: Square | null;
  legalTargets: Square[];
  lastMove?: { from: Square; to: Square } | null;
  animatedMove?: { from: Square; to: Square } | null;
  onSquareClick: (square: Square) => void;
  onMoveAttempt?: (from: Square, to: Square) => void;
  disabled?: boolean;
  orientation?: "w" | "b";
};

type DragVisual = {
  square: Square;
  src: string;
  x: number;
  y: number;
};

const files = ["a","b","c","d","e","f","g","h"] as const;

function displayedPosition(square: Square, orientation: "w" | "b") {
  const fileIndex = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);

  return orientation === "b"
    ? { col: 7 - fileIndex, row: rank - 1 }
    : { col: fileIndex, row: 8 - rank };
}

function squareAtDisplayedPosition(col: number, row: number, orientation: "w" | "b") {
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const displayedFiles = orientation === "b" ? [...files].reverse() : [...files];
  const file = displayedFiles[col];
  const rank = orientation === "b" ? row + 1 : 8 - row;
  return `${file}${rank}` as Square;
}

function pieceName(type: string) {
  if (type === "p") return "pawn";
  if (type === "n") return "knight";
  if (type === "b") return "bishop";
  if (type === "r") return "rook";
  if (type === "q") return "queen";
  if (type === "k") return "king";
  return "piece";
}

function aiMoveStyle(
  move: { from: Square; to: Square },
  orientation: "w" | "b"
): CSSProperties {
  const from = displayedPosition(move.from, orientation);
  const to = displayedPosition(move.to, orientation);
  const imageToSquareRatio = 100 / 0.86;

  return {
    "--ai-move-x": `${(from.col - to.col) * imageToSquareRatio}%`,
    "--ai-move-y": `${(from.row - to.row) * imageToSquareRatio}%`,
  } as CSSProperties;
}

export function ChessBoard({
  pieces,
  selected,
  legalTargets,
  lastMove,
  animatedMove,
  onSquareClick,
  onMoveAttempt,
  disabled,
  orientation = "w",
}: Props) {
  const pieceMap = new Map(pieces.map((p) => [p.square, p]));
  const displayedFiles = orientation === "b" ? [...files].reverse() : files;
  const dragFrom = useRef<Square | null>(null);
  const suppressClick = useRef(false);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);

  const beginDrag = (
    event: React.PointerEvent<HTMLImageElement>,
    square: Square,
    src: string
  ) => {
    if (disabled || !onMoveAttempt) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    dragFrom.current = square;
    setDragVisual({ square, src, x: event.clientX, y: event.clientY });

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not required for click-to-move fallback.
    }
  };

  const moveDrag = (event: React.PointerEvent<HTMLImageElement>) => {
    if (!dragFrom.current) return;
    event.preventDefault();
    setDragVisual((current) =>
      current ? { ...current, x: event.clientX, y: event.clientY } : current
    );
  };

  const endDrag = (event: React.PointerEvent<HTMLImageElement>) => {
    const from = dragFrom.current;
    if (!from || !onMoveAttempt) return;

    event.preventDefault();
    const targetElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-square]");
    const target = targetElement?.dataset.square as Square | undefined;

    dragFrom.current = null;
    setDragVisual(null);

    if (target && target !== from) {
      suppressClick.current = true;
      onMoveAttempt(from, target);
    }
  };

  const cancelDrag = () => {
    dragFrom.current = null;
    setDragVisual(null);
  };

  const moveKeyboardFocus = (square: Square, key: string) => {
    const position = displayedPosition(square, orientation);
    const delta = key === "ArrowLeft"
      ? { col: -1, row: 0 }
      : key === "ArrowRight"
        ? { col: 1, row: 0 }
        : key === "ArrowUp"
          ? { col: 0, row: -1 }
          : key === "ArrowDown"
            ? { col: 0, row: 1 }
            : null;

    if (!delta) return false;
    const target = squareAtDisplayedPosition(position.col + delta.col, position.row + delta.row, orientation);
    if (!target) return true;

    document.querySelector<HTMLButtonElement>(`[data-square="${target}"]`)?.focus();
    return true;
  };

  return (
    <div
      className="board"
      role="group"
      aria-label={`Chess board, ${orientation === "w" ? "White" : "Black"} perspective. Use arrow keys to move between squares and Enter or Space to select.`}
    >
      {Array.from({ length: 8 }, (_, row) =>
        displayedFiles.map((file, col) => {
          const rank = orientation === "b" ? row + 1 : 8 - row;
          const square = `${file}${rank}` as Square;
          const piece = pieceMap.get(square);
          const dark = (row + col) % 2 === 1;
          const isSelected = selected === square;
          const isTarget = legalTargets.includes(square);
          const isLastMove = lastMove?.from === square || lastMove?.to === square;
          const isAnimatedFrom = animatedMove?.from === square;
          const isAnimatedTo = animatedMove?.to === square;
          const pieceSrc = piece
            ? `/images/pieces/${piece.color}${piece.type.toUpperCase()}.svg`
            : "";

          return (
            <button
              key={square}
              type="button"
              data-square={square}
              className={`square ${dark ? "dark" : "light"} ${isLastMove ? "last-move" : ""} ${isAnimatedFrom ? "ai-move-origin" : ""} ${isAnimatedTo ? "ai-move-destination" : ""} ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""}`}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onSquareClick(square);
              }}
              onKeyDown={(event) => {
                if (moveKeyboardFocus(square, event.key)) {
                  event.preventDefault();
                }
              }}
              disabled={disabled}
              aria-label={`${square}, ${piece ? `${piece.color === "w" ? "White" : "Black"} ${pieceName(piece.type)}` : "empty"}${isTarget ? ", legal move" : ""}${isLastMove ? ", last move" : ""}`}
              aria-pressed={isSelected}
            >
              {piece ? (
                <img
                  draggable={false}
                  className={[
                    "piece-image",
                    dragVisual?.square === square ? "dragging-origin" : "",
                    isAnimatedTo ? "ai-piece-move" : "",
                  ].filter(Boolean).join(" ")}
                  style={isAnimatedTo && animatedMove ? aiMoveStyle(animatedMove, orientation) : undefined}
                  src={pieceSrc}
                  alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                  onPointerDown={(event) => beginDrag(event, square, pieceSrc)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={cancelDrag}
                />
              ) : null}
              {col === 0 ? <span className="rank-label">{rank}</span> : null}
              {row === 7 ? <span className="file-label">{file}</span> : null}
            </button>
          );
        })
      )}

      {dragVisual ? (
        <img
          className="drag-ghost"
          src={dragVisual.src}
          alt=""
          aria-hidden="true"
          style={{ left: dragVisual.x, top: dragVisual.y }}
        />
      ) : null}
    </div>
  );
}
