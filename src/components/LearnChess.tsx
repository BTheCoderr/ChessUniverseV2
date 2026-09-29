import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";

type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
type BoardPiece = { square: Square; type: string; color: "w" | "b" };

type Props = {
  onPractice: () => void;
  onHistory: () => void;
  onBack: () => void;
};

type PieceLesson = {
  name: string;
  type: PieceType;
  square: Square;
  targets: Square[];
  description: string;
  tip: string;
};

const PIECE_LESSONS: PieceLesson[] = [
  {
    name: "Pawn",
    type: "p",
    square: "d2",
    targets: ["d3", "d4"],
    description: "Pawns move straight ahead. From their starting square they may move one or two squares.",
    tip: "They capture one square diagonally instead of straight ahead.",
  },
  {
    name: "Knight",
    type: "n",
    square: "d4",
    targets: ["b3", "b5", "c2", "c6", "e2", "e6", "f3", "f5"],
    description: "Knights move in an L shape: two squares one way, then one square sideways.",
    tip: "Knights are the only pieces that can jump over other pieces.",
  },
  {
    name: "Bishop",
    type: "b",
    square: "d4",
    targets: ["a1", "b2", "c3", "e5", "f6", "g7", "h8", "a7", "b6", "c5", "e3", "f2", "g1"],
    description: "Bishops slide diagonally for as many open squares as they want.",
    tip: "A bishop always stays on the same color square.",
  },
  {
    name: "Rook",
    type: "r",
    square: "d4",
    targets: ["d1", "d2", "d3", "d5", "d6", "d7", "d8", "a4", "b4", "c4", "e4", "f4", "g4", "h4"],
    description: "Rooks slide in straight lines: up, down, left, or right.",
    tip: "Rooks become especially powerful on open files.",
  },
  {
    name: "Queen",
    type: "q",
    square: "d4",
    targets: [
      "d1", "d2", "d3", "d5", "d6", "d7", "d8",
      "a4", "b4", "c4", "e4", "f4", "g4", "h4",
      "a1", "b2", "c3", "e5", "f6", "g7", "h8",
      "a7", "b6", "c5", "e3", "f2", "g1",
    ],
    description: "The queen combines rook and bishop movement.",
    tip: "She is powerful, but bringing her out too early can make her a target.",
  },
  {
    name: "King",
    type: "k",
    square: "d4",
    targets: ["c3", "c4", "c5", "d3", "d5", "e3", "e4", "e5"],
    description: "The king moves one square in any direction.",
    tip: "You may never move your king onto a square attacked by the opponent.",
  },
];

function standardPieces() {
  const game = new Chess();
  return game.board().flatMap((rank, rankIndex) =>
    rank.flatMap((piece, fileIndex) => {
      if (!piece) return [];
      const file = String.fromCharCode(97 + fileIndex);
      return [{
        square: `${file}${8 - rankIndex}` as Square,
        type: piece.type,
        color: piece.color,
      }];
    })
  );
}

export function LearnChess({ onPractice, onHistory, onBack }: Props) {
  const [lesson, setLesson] = useState<"pieces" | "mate" | "universe">("pieces");
  const [pieceIndex, setPieceIndex] = useState(0);
  const [pieceComplete, setPieceComplete] = useState(false);
  const [mateSelected, setMateSelected] = useState<Square | null>(null);
  const [mateComplete, setMateComplete] = useState(false);
  const [universeSelected, setUniverseSelected] = useState<Square | null>(null);
  const [universeComplete, setUniverseComplete] = useState(false);

  const currentPiece = PIECE_LESSONS[pieceIndex];

  const pieceBoard = useMemo<BoardPiece[]>(() => [
    { square: currentPiece.square, type: currentPiece.type, color: "w" },
  ], [currentPiece]);

  const mateBoard = useMemo<BoardPiece[]>(() => (
    mateComplete
      ? [
          { square: "g6", type: "k", color: "w" },
          { square: "g7", type: "q", color: "w" },
          { square: "g8", type: "k", color: "b" },
        ]
      : [
          { square: "g6", type: "k", color: "w" },
          { square: "h6", type: "q", color: "w" },
          { square: "g8", type: "k", color: "b" },
        ]
  ), [mateComplete]);

  const universeBoard = useMemo<BoardPiece[]>(() => {
    const pieces = standardPieces();
    if (!universeComplete) return pieces;
    return pieces.map((piece) =>
      piece.square === "e7" ? { ...piece, square: "e5" as Square } : piece
    );
  }, [universeComplete]);

  const pieceClick = (square: Square) => {
    if (currentPiece.targets.includes(square)) setPieceComplete(true);
  };

  const nextPiece = () => {
    if (pieceIndex === PIECE_LESSONS.length - 1) {
      setLesson("mate");
      return;
    }
    setPieceIndex((index) => index + 1);
    setPieceComplete(false);
  };

  const mateClick = (square: Square) => {
    if (mateComplete) return;
    if (!mateSelected) {
      if (square === "h6") setMateSelected("h6");
      return;
    }
    if (mateSelected === "h6" && square === "g7") {
      setMateSelected(null);
      setMateComplete(true);
    } else {
      setMateSelected(square === "h6" ? "h6" : null);
    }
  };

  const universeClick = (square: Square) => {
    if (universeComplete) return;
    if (!universeSelected) {
      if (square === "e7") setUniverseSelected("e7");
      return;
    }
    if (universeSelected === "e7" && square === "e5") {
      setUniverseSelected(null);
      setUniverseComplete(true);
    } else {
      setUniverseSelected(square === "e7" ? "e7" : null);
    }
  };

  return (
    <section className="learn-page">
      <button className="text-button back-link" onClick={onBack}>← Home</button>

      <div className="learn-heading">
        <div>
          <div className="eyebrow">LEARN CHESS</div>
          <h1>Learn it by playing it.</h1>
          <p>
            No textbook required. Tap the board, see the legal squares, and learn the ideas one move at a time.
          </p>
        </div>
        <div className="learn-progress" aria-label="Tutorial progress">
          <button className={lesson === "pieces" ? "active" : ""} onClick={() => setLesson("pieces")}>1 · Pieces</button>
          <button className={lesson === "mate" ? "active" : ""} onClick={() => setLesson("mate")}>2 · Checkmate</button>
          <button className={lesson === "universe" ? "active" : ""} onClick={() => setLesson("universe")}>3 · Universe</button>
        </div>
      </div>

      {lesson === "pieces" ? (
        <div className="learn-layout">
          <div className="board-shell tutorial-board">
            <ChessBoard
              pieces={pieceBoard}
              selected={currentPiece.square}
              legalTargets={currentPiece.targets}
              onSquareClick={pieceClick}
              orientation="w"
            />
          </div>

          <aside className="game-panel tutorial-panel">
            <div className="eyebrow">LESSON 1 OF 3</div>
            <h2>{currentPiece.name}</h2>
            <p>{currentPiece.description}</p>
            <div className="tutorial-tip">
              <strong>Remember</strong>
              <span>{currentPiece.tip}</span>
            </div>
            <p className={pieceComplete ? "tutorial-feedback success" : "tutorial-feedback"}>
              {pieceComplete
                ? "Nice — that's a legal square."
                : "Tap any highlighted square to practice the movement."}
            </p>
            <div className="piece-lesson-dots" aria-label="Piece lessons">
              {PIECE_LESSONS.map((item, index) => (
                <button
                  key={item.name}
                  className={index === pieceIndex ? "active" : ""}
                  onClick={() => {
                    setPieceIndex(index);
                    setPieceComplete(false);
                  }}
                  aria-label={item.name}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button className="primary-action" onClick={nextPiece} disabled={!pieceComplete}>
              {pieceIndex === PIECE_LESSONS.length - 1 ? "Next: Checkmate" : "Next piece"}
            </button>
          </aside>
        </div>
      ) : null}

      {lesson === "mate" ? (
        <div className="learn-layout">
          <div className="board-shell tutorial-board">
            <ChessBoard
              pieces={mateBoard}
              selected={mateSelected}
              legalTargets={mateSelected === "h6" && !mateComplete ? ["g7"] : []}
              lastMove={mateComplete ? { from: "h6", to: "g7" } : null}
              onSquareClick={mateClick}
              orientation="w"
            />
          </div>

          <aside className="game-panel tutorial-panel">
            <div className="eyebrow">LESSON 2 OF 3</div>
            <h2>Check vs. checkmate</h2>
            <p>
              <strong>Check</strong> means the king is under attack. <strong>Checkmate</strong> means the king is attacked and has no legal escape.
            </p>
            <div className="tutorial-tip">
              <strong>Your mission</strong>
              <span>Tap the white queen on h6, then move it to g7.</span>
            </div>
            <p className={mateComplete ? "tutorial-feedback success" : "tutorial-feedback"}>
              {mateComplete
                ? "Checkmate. The queen attacks g8 and the white king protects the queen."
                : "Find the one-move checkmate."}
            </p>
            <button
              className="primary-action"
              onClick={() => setLesson("universe")}
              disabled={!mateComplete}
            >
              Next: Chess Universe
            </button>
          </aside>
        </div>
      ) : null}

      {lesson === "universe" ? (
        <div className="learn-layout">
          <div className="board-shell tutorial-board">
            <ChessBoard
              pieces={universeBoard}
              selected={universeSelected}
              legalTargets={universeSelected === "e7" && !universeComplete ? ["e6", "e5"] : []}
              lastMove={universeComplete ? { from: "e7", to: "e5" } : null}
              onSquareClick={universeClick}
              orientation="b"
            />
          </div>

          <aside className="game-panel tutorial-panel">
            <div className="eyebrow">LESSON 3 OF 3</div>
            <h2>Welcome to Chess Universe</h2>
            <p>
              Traditional chess history normally begins with White. <strong>Chess Universe flips the opening turn: Black moves first.</strong>
            </p>
            <div className="tutorial-tip">
              <strong>Your first Universe move</strong>
              <span>From Black's view, tap the pawn on e7 and move it to e5.</span>
            </div>
            <p className={universeComplete ? "tutorial-feedback success" : "tutorial-feedback"}>
              {universeComplete
                ? "You're ready. Black has made the opening move."
                : "Make Black's first move to finish the tutorial."}
            </p>

            {universeComplete ? (
              <div className="tutorial-finish-actions">
                <button className="primary-action" onClick={onPractice}>Start Practice</button>
                <button className="secondary-action" onClick={onHistory}>Play Through History</button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
