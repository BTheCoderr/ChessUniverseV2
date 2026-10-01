import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import {
  MULTI_MOVE_PROGRESS_KEY,
  MULTI_MOVE_PUZZLES,
  multiMoveParts,
  normalizeMultiMoveProgress,
} from "../lib/multiMovePuzzles";
import { recordReviewAttempt } from "../lib/academyReview";

function boardPieces(game: Chess) {
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

function pieceName(type: string) {
  if (type === "p") return "pawn";
  if (type === "n") return "knight";
  if (type === "b") return "bishop";
  if (type === "r") return "rook";
  if (type === "q") return "queen";
  if (type === "k") return "king";
  return "piece";
}

function explainWrongSequenceMove(gameAfterMove: Chess, made: ReturnType<Chess["move"]>, mistakeLesson?: string) {
  const movedType = made.promotion ?? made.piece;
  const captureReply = gameAfterMove
    .moves({ verbose: true })
    .find((reply) => reply.to === made.to && reply.captured === movedType);

  const consequence = captureReply
    ? `${captureReply.san} can immediately take your ${pieceName(movedType)} on ${made.to}.`
    : mistakeLesson ?? "That move does not carry out this step's plan.";

  return `${made.san} is legal, but it is not the training move. ${consequence}`;
}

function loadProgress() {
  try {
    const raw = window.localStorage.getItem(MULTI_MOVE_PROGRESS_KEY);
    return raw ? normalizeMultiMoveProgress(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function saveProgress(progress: string[]) {
  try {
    window.localStorage.setItem(MULTI_MOVE_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Keep the sequence usable when browser storage is unavailable.
  }
}

export function MultiMovePuzzleMode() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = MULTI_MOVE_PUZZLES[puzzleIndex];
  const [game, setGame] = useState(() => new Chess(puzzle.fen));
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState(puzzle.setup);
  const [progress, setProgress] = useState(loadProgress);

  const step = puzzle.steps[stepIndex] ?? null;
  const pieces = useMemo(() => boardPieces(game), [game]);
  const legalTargets = useMemo(() => {
    if (!selected || complete || !step || step.actor !== "player") return [];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [complete, game, selected, step]);

  const finishPuzzle = () => {
    setComplete(true);
    setSelected(null);
    setMessage(puzzle.takeaway);
    if (!progress.includes(puzzle.id)) {
      const next = [...progress, puzzle.id];
      setProgress(next);
      saveProgress(next);
    }
  };

  const resetPuzzle = (nextIndex = puzzleIndex) => {
    const next = MULTI_MOVE_PUZZLES[nextIndex];
    setPuzzleIndex(nextIndex);
    setGame(new Chess(next.fen));
    setStepIndex(0);
    setSelected(null);
    setComplete(false);
    setMessage(next.setup);
  };

  useEffect(() => {
    if (complete || !step || step.actor !== "opponent") return;

    const next = new Chess(game.fen());
    const parts = multiMoveParts(step.uci);

    try {
      next.move({
        from: parts.from,
        to: parts.to,
        ...(parts.promotion ? { promotion: parts.promotion } : {}),
      });
    } catch {
      setMessage("This training sequence could not continue because the scripted opponent move was invalid.");
      return;
    }

    const nextStepIndex = stepIndex + 1;
    setGame(next);
    setSelected(null);

    if (nextStepIndex >= puzzle.steps.length) {
      finishPuzzle();
      return;
    }

    const upcoming = puzzle.steps[nextStepIndex];
    setStepIndex(nextStepIndex);
    setMessage(`Opponent: ${step.label}. ${step.explanation} Your turn: ${upcoming.label}.`);
  }, [complete, game, puzzle, step, stepIndex]);

  const attemptMove = (from: Square, to: Square) => {
    if (complete || !step || step.actor !== "player") return;

    const next = new Chess(game.fen());

    try {
      const made = next.move({ from, to, promotion: "q" });
      const uci = `${made.from}${made.to}${made.promotion ?? ""}`;

      if (uci !== step.uci) {
        recordReviewAttempt(`multi-${puzzle.id}-${stepIndex}`, false, uci);
        setSelected(null);
        setMessage(explainWrongSequenceMove(next, made, step.mistakeLesson));
        return;
      }

      recordReviewAttempt(`multi-${puzzle.id}-${stepIndex}`, true, uci);
      const nextStepIndex = stepIndex + 1;
      setGame(next);
      setSelected(null);

      if (nextStepIndex >= puzzle.steps.length) {
        finishPuzzle();
        return;
      }

      const upcoming = puzzle.steps[nextStepIndex];
      setStepIndex(nextStepIndex);
      setMessage(
        upcoming.actor === "opponent"
          ? `Correct: ${step.explanation} Now predict what the opponent is about to do.`
          : `Correct: ${step.explanation} Next: ${upcoming.label}.`
      );
    } catch {
      setSelected(null);
      setMessage("That move is not legal in this position.");
    }
  };

  const onSquareClick = (square: Square) => {
    if (complete || !step || step.actor !== "player") return;
    const piece = game.get(square);

    if (!selected) {
      if (piece?.color === game.turn() && piece.color === puzzle.playerColor) setSelected(square);
      return;
    }

    if (piece?.color === game.turn()) {
      setSelected(square);
      return;
    }

    attemptMove(selected, square);
  };

  return (
    <section className="multi-move-lab">
      <div className="piece-school-header">
        <div>
          <div className="eyebrow">MULTI-MOVE LAB</div>
          <h2>Think past the first move.</h2>
          <p>
            Make your move, watch the opponent's best teaching response, then solve the next decision.
            These sequences train plans, combinations, and both sides of the position.
          </p>
        </div>
        <div className="piece-school-score">
          <strong>{progress.length}<span>/{MULTI_MOVE_PUZZLES.length}</span></strong>
          <small>sequences mastered</small>
        </div>
      </div>

      <div className="academy-card-picker multi-move-picker">
        {MULTI_MOVE_PUZZLES.map((item, index) => (
          <button
            key={item.id}
            className={index === puzzleIndex ? "active" : ""}
            onClick={() => resetPuzzle(index)}
          >
            <span>{progress.includes(item.id) ? "MASTERED" : item.theme}</span>
            <strong>{item.title}</strong>
            <small>{item.goal}</small>
          </button>
        ))}
      </div>

      <div className="learn-layout">
        <div className="board-shell tutorial-board">
          <ChessBoard
            pieces={pieces}
            selected={selected}
            legalTargets={legalTargets}
            onSquareClick={onSquareClick}
            onMoveAttempt={attemptMove}
            disabled={complete || step?.actor === "opponent"}
            orientation={puzzle.orientation}
          />
        </div>

        <aside className="game-panel tutorial-panel">
          <div className="eyebrow">
            {puzzle.theme.toUpperCase()} · STEP {Math.min(stepIndex + 1, puzzle.steps.length)}/{puzzle.steps.length}
          </div>
          <h2>{puzzle.title}</h2>
          <p>{puzzle.goal}</p>

          <div className="academy-concept-card">
            <strong>Sequence setup</strong>
            <span>{puzzle.setup}</span>
          </div>

          {step && !complete ? (
            <div className={step.actor === "opponent" ? "sequence-step opponent" : "sequence-step player"}>
              <span>{step.actor === "player" ? "YOUR MOVE" : "OPPONENT RESPONSE"}</span>
              <strong>{step.label}</strong>
            </div>
          ) : null}

          <p className={complete ? "tutorial-feedback success" : "tutorial-feedback"}>{message}</p>

          {complete ? (
            <>
              <div className="academy-explanation takeaway">
                <strong>Pattern to remember</strong>
                <span>{puzzle.takeaway}</span>
              </div>
              <button
                className="primary-action"
                onClick={() => resetPuzzle((puzzleIndex + 1) % MULTI_MOVE_PUZZLES.length)}
              >
                Next sequence
              </button>
            </>
          ) : (
            <div className="sequence-roadmap">
              {puzzle.steps.map((item, index) => (
                <span
                  key={`${puzzle.id}-${index}`}
                  className={index < stepIndex ? "done" : index === stepIndex ? "active" : ""}
                >
                  {item.actor === "player" ? "You" : "Them"} · {index + 1}
                </span>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
