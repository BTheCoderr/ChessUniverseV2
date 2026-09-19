import type { Square } from "chess.js";

type Piece = { square: Square; type: string; color: "w" | "b" };

type Props = {
  pieces: Piece[];
  selected: Square | null;
  legalTargets: Square[];
  onSquareClick: (square: Square) => void;
  disabled?: boolean;
};

const files = ["a","b","c","d","e","f","g","h"] as const;

export function ChessBoard({ pieces, selected, legalTargets, onSquareClick, disabled }: Props) {
  const pieceMap = new Map(pieces.map((p) => [p.square, p]));

  return (
    <div className="board" aria-label="Chess board">
      {Array.from({ length: 8 }, (_, row) =>
        files.map((file, col) => {
          const rank = 8 - row;
          const square = `${file}${rank}` as Square;
          const piece = pieceMap.get(square);
          const dark = (row + col) % 2 === 1;
          const isSelected = selected === square;
          const isTarget = legalTargets.includes(square);
          return (
            <button
              key={square}
              type="button"
              className={`square ${dark ? "dark" : "light"} ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""}`}
              onClick={() => onSquareClick(square)}
              disabled={disabled}
              aria-label={square}
            >
              {piece ? (
                <img
                  draggable={false}
                  src={`/images/pieces/${piece.color}${piece.type.toUpperCase()}.svg`}
                  alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                />
              ) : null}
              {col === 0 ? <span className="rank-label">{rank}</span> : null}
              {row === 7 ? <span className="file-label">{file}</span> : null}
            </button>
          );
        })
      )}
    </div>
  );
}
