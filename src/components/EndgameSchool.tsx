import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import {
  ENDGAME_LESSONS,
  ENDGAME_PROGRESS_KEY,
  normalizeEndgameProgress,
} from "../lib/endgameLessons";
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
    const raw = window.localStorage.getItem(ENDGAME_PROGRESS_KEY);
    return raw ? normalizeEndgameProgress(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function saveProgress(progress: string[]) {
  try {
    window.localStorage.setItem(ENDGAME_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Keep lessons playable when browser storage is unavailable.
  }
}

export function EndgameSchool() {
  const [index, setIndex] = useState(0);
  const lesson = ENDGAME_LESSONS[index];
  const [game, setGame] = useState(() => new Chess(lesson.fen));
  const [selected, setSelected] = useState<Square | null>(null);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState(lesson.prompt);
  const [mistake, setMistake] = useState("");
  const [progress, setProgress] = useState(loadProgress);

  const pieces = useMemo(() => boardPieces(game), [game]);
  const legalTargets = useMemo(() => {
    if (!selected || complete) return [];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [complete, game, selected]);

  const resetLesson = (nextIndex = index) => {
    const next = ENDGAME_LESSONS[nextIndex];
    setIndex(nextIndex);
    setGame(new Chess(next.fen));
    setSelected(null);
    setComplete(false);
    setMessage(next.prompt);
    setMistake("");
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
        setMistake(`${made.san}: ${lesson.mistakeLesson}`);
        setMessage("Legal move — but not the endgame move that best uses the position.");
        return;
      }

      recordReviewAttempt(lesson.id, true, uci);
      setGame(next);
      setSelected(null);
      setComplete(true);
      setMistake("");
      setMessage(lesson.why);
      finish();
    } catch {
      setSelected(null);
      setMessage("That move is not legal in this position.");
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

  const themes = Array.from(new Set(ENDGAME_LESSONS.map((item) => item.theme)));
  const currentTheme = lesson.theme;

  return (
    <div className="endgame-school">
      <div className="piece-school-header">
        <div>
          <div className="eyebrow">ENDGAME SCHOOL</div>
          <h2>Finish games with a plan, not hope.</h2>
          <p>
            Learn king activity, opposition, key squares, rook technique, passed pawns,
            and basic mating structure on interactive boards.
          </p>
        </div>
        <div className="piece-school-score">
          <strong>{progress.length}<span>/{ENDGAME_LESSONS.length}</span></strong>
          <small>endgames mastered</small>
        </div>
      </div>

      <div className="puzzle-theme-filter" aria-label="Endgame themes">
        {themes.map((theme) => (
          <button
            key={theme}
            className={currentTheme === theme ? "active" : ""}
            onClick={() => {
              const nextIndex = ENDGAME_LESSONS.findIndex((item) => item.theme === theme);
              if (nextIndex >= 0) resetLesson(nextIndex);
            }}
          >
            {theme}
          </button>
        ))}
      </div>

      <div className="academy-card-picker endgame-picker">
        {ENDGAME_LESSONS.map((item, lessonIndex) => (
          <button
            key={item.id}
            className={lessonIndex === index ? "active" : ""}
            onClick={() => resetLesson(lessonIndex)}
          >
            <span>{progress.includes(item.id) ? "MASTERED" : item.theme}</span>
            <strong>{item.title}</strong>
            <small>{item.principle}</small>
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
          <div className="eyebrow">{lesson.theme.toUpperCase()} · {index + 1}/{ENDGAME_LESSONS.length}</div>
          <h2>{lesson.title}</h2>
          <p>{lesson.prompt}</p>

          <div className="academy-concept-card">
            <strong>Endgame principle</strong>
            <span>{lesson.principle}</span>
          </div>

          {mistake ? (
            <div className="mistake-explanation">
              <strong>Why that move is weaker</strong>
              <span>{mistake}</span>
            </div>
          ) : null}

          <p className={complete ? "tutorial-feedback success" : "tutorial-feedback"}>{message}</p>

          {complete ? (
            <>
              <div className="academy-explanation">
                <strong>What the opponent wants</strong>
                <span>{lesson.opponentPlan}</span>
              </div>
              <div className="academy-explanation takeaway">
                <strong>Pattern to remember</strong>
                <span>{lesson.takeaway}</span>
              </div>
              <button
                className="primary-action"
                onClick={() => resetLesson((index + 1) % ENDGAME_LESSONS.length)}
              >
                Next endgame
              </button>
            </>
          ) : (
            <button className="secondary-action" onClick={() => setMessage(lesson.why)}>
              Explain the endgame idea
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
