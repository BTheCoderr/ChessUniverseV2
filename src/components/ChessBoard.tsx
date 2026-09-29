import { useRef, useState } from "react";
import type { Square } from "chess.js";

type Piece = { square: Square; type: string; color: "w" | "b" };

type Props = {
  pieces: Piece[];
  selected: Square | null;
  legalTargets: Square[];
  lastMove?: { from: Square; to: Square } | null;
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

export function ChessBoard({
  pieces,
  selected,
  legalTargets,
  lastMove,
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

  return (
    <div className="board" aria-label="Chess board">
      {Array.from({ length: 8 }, (_, row) =>
        displayedFiles.map((file, col) => {
          const rank = orientation === "b" ? row + 1 : 8 - row;
          const square = `${file}${rank}` as Square;
          const piece = pieceMap.get(square);
          const dark = (row + col) % 2 === 1;
          const isSelected = selected === square;
          const isTarget = legalTargets.includes(square);
          const isLastMove = lastMove?.from === square || lastMove?.to === square;
          const pieceSrc = piece
            ? `/images/pieces/${piece.color}${piece.type.toUpperCase()}.svg`
            : "";

          return (
            <button
              key={square}
              type="button"
              data-square={square}
              className={`square ${dark ? "dark" : "light"} ${isLastMove ? "last-move" : ""} ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""}`}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onSquareClick(square);
              }}
              disabled={disabled}
              aria-label={`${square}${isTarget ? ", legal move" : ""}`}
            >
              {piece ? (
                <img
                  draggable={false}
                  className={dragVisual?.square === square ? "piece-image dragging-origin" : "piece-image"}
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
