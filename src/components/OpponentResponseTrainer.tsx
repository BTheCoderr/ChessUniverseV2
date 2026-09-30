import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import {
  OPPONENT_RESPONSE_LESSONS,
  RESPONSE_PROGRESS_KEY,
  normalizeResponseProgress,
} from "../lib/opponentResponseLessons";
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

function loadProgress() {
  try {
    const raw = window.localStorage.getItem(RESPONSE_PROGRESS_KEY);
    return raw ? normalizeResponseProgress(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function saveProgress(progress: string[]) {
  try {
    window.localStorage.setItem(RESPONSE_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Keep training usable when storage is unavailable.
  }
}

export function OpponentResponseTrainer() {
  const [index, setIndex] = useState(0);
  const lesson = OPPONENT_RESPONSE_LESSONS[index];
  const [game, setGame] = useState(() => new Chess(lesson.fen));
  const [selected, setSelected] = useState<Square | null>(null);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState(lesson.prompt);
  const [progress, setProgress] = useState(loadProgress);

  const pieces = useMemo(() => boardPieces(game), [game]);
  const legalTargets = useMemo(() => {
    if (!selected || complete) return [];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [complete, game, selected]);

  const resetLesson = (nextIndex = index) => {
    const next = OPPONENT_RESPONSE_LESSONS[nextIndex];
    setIndex(nextIndex);
    setGame(new Chess(next.fen));
    setSelected(null);
    setComplete(false);
    setMessage(next.prompt);
  };

  const finish = () => {
    if (progress.includes(lesson.id)) return;
    const next = [...progress, lesson.id];
    setProgress(next);
    saveProgress(next);
  };

  const attemptMove = (from: Square, to: Square) => {
    if (complete) return;
    const next = new Chess(game.fen());

    try {
      const made = next.move({ from, to, promotion: "q" });
      const uci = `${made.from}${made.to}${made.promotion ?? ""}`;

      if (uci !== lesson.expectedMove) {
        recordReviewAttempt(lesson.id, false, uci);
        setSelected(null);
        setMessage(
          `${made.san} is legal, but it does not answer what changed. ${lesson.threat}`
        );
        return;
      }

      recordReviewAttempt(lesson.id, true, uci);
      setGame(next);
      setSelected(null);
      setComplete(true);
      setMessage(lesson.why);
      finish();
    } catch {
      setSelected(null);
      setMessage("That response is not legal in this position.");
    }
  };

  const onSquareClick = (square: Square) => {
    if (complete) return;
    const piece = game.get(square);

    if (!selected) {
      if (piece?.color === game.turn()) setSelected(square);
      return;
    }

    if (piece?.color === game.turn()) {
      setSelected(square);
      return;
    }

    attemptMove(selected, square);
  };

  return (
    <div className="response-trainer">
      <div className="piece-school-header">
        <div>
          <div className="eyebrow">OPPONENT RESPONSE</div>
          <h2>Their move changed something. Find it.</h2>
          <p>
            Instead of starting with your plan, read the opponent's last move first:
            what did it attack, open, pin, threaten, or improve?
          </p>
        </div>
        <div className="piece-school-score">
          <strong>{progress.length}<span>/{OPPONENT_RESPONSE_LESSONS.length}</span></strong>
          <small>responses mastered</small>
        </div>
      </div>

      <div className="academy-card-picker response-lessons">
        {OPPONENT_RESPONSE_LESSONS.map((item, lessonIndex) => (
          <button
            key={item.id}
            className={lessonIndex === index ? "active" : ""}
            onClick={() => resetLesson(lessonIndex)}
          >
            <span>{progress.includes(item.id) ? "MASTERED" : item.theme}</span>
            <strong>{item.title}</strong>
            <small>{item.lastMove}</small>
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
            disabled={complete}
            orientation={lesson.orientation}
          />
        </div>

        <aside className="game-panel tutorial-panel">
          <div className="eyebrow">READ THEIR MOVE · {index + 1}/{OPPONENT_RESPONSE_LESSONS.length}</div>
          <h2>{lesson.title}</h2>

          <div className="opponent-last-move">
            <strong>Opponent's last move</strong>
            <span>{lesson.lastMove}</span>
          </div>

          <div className="academy-explanation danger">
            <strong>What changed?</strong>
            <span>{lesson.threat}</span>
          </div>

          <p>{lesson.prompt}</p>
          <p className={complete ? "tutorial-feedback success" : "tutorial-feedback"}>{message}</p>

          {complete ? (
            <>
              <div className="academy-explanation">
                <strong>Your next plan</strong>
                <span>{lesson.nextPlan}</span>
              </div>
              <div className="academy-explanation takeaway">
                <strong>Pattern to remember</strong>
                <span>{lesson.takeaway}</span>
              </div>
              <button
                className="primary-action"
                onClick={() => resetLesson((index + 1) % OPPONENT_RESPONSE_LESSONS.length)}
              >
                Next response
              </button>
            </>
          ) : (
            <button className="secondary-action" onClick={() => setMessage(lesson.why)}>
              Explain the defensive idea
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
