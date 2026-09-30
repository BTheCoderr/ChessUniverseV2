import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import {
  PIECE_SCHOOLS,
  PIECE_SCHOOL_PROGRESS_KEY,
  normalizePieceSchoolProgress,
} from "../lib/pieceSchools";
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
    const raw = window.localStorage.getItem(PIECE_SCHOOL_PROGRESS_KEY);
    return raw ? normalizePieceSchoolProgress(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function saveProgress(progress: string[]) {
  try {
    window.localStorage.setItem(PIECE_SCHOOL_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Progress remains available for this session if browser storage is unavailable.
  }
}

export function PieceSchools() {
  const [schoolIndex, setSchoolIndex] = useState(0);
  const [lessonIndex, setLessonIndex] = useState(0);
  const school = PIECE_SCHOOLS[schoolIndex];
  const lesson = school.lessons[lessonIndex];

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

  const resetLesson = (nextSchoolIndex = schoolIndex, nextLessonIndex = lessonIndex) => {
    const nextLesson = PIECE_SCHOOLS[nextSchoolIndex].lessons[nextLessonIndex];
    setSchoolIndex(nextSchoolIndex);
    setLessonIndex(nextLessonIndex);
    setGame(new Chess(nextLesson.fen));
    setSelected(null);
    setComplete(false);
    setMessage(nextLesson.prompt);
  };

  const completeLesson = () => {
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
          `${made.san} is legal, but it misses the piece's main job here. ${lesson.opponentPlan} Ask: "${school.question}"`
        );
        return;
      }

      recordReviewAttempt(lesson.id, true, uci);
      setGame(next);
      setSelected(null);
      setComplete(true);
      setMessage(lesson.why);
      completeLesson();
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

  const nextLesson = () => {
    if (lessonIndex < school.lessons.length - 1) {
      resetLesson(schoolIndex, lessonIndex + 1);
      return;
    }

    const nextSchool = (schoolIndex + 1) % PIECE_SCHOOLS.length;
    resetLesson(nextSchool, 0);
  };

  const schoolSolved = school.lessons.filter((item) => progress.includes(item.id)).length;

  return (
    <div className="piece-school">
      <div className="piece-school-header">
        <div>
          <div className="eyebrow">PIECE SCHOOLS</div>
          <h2>Learn the job, not just the move.</h2>
          <p>
            Each course follows one piece through activation, targets, exchanges, and positional decisions.
            The goal is to recognize what that piece needs in your own games.
          </p>
        </div>
        <div className="piece-school-score">
          <strong>{progress.length}<span>/{PIECE_SCHOOLS.reduce((sum, item) => sum + item.lessons.length, 0)}</span></strong>
          <small>lessons mastered</small>
        </div>
      </div>

      <div className="piece-school-tabs">
        {PIECE_SCHOOLS.map((item, index) => {
          const solved = item.lessons.filter((lessonItem) => progress.includes(lessonItem.id)).length;
          return (
            <button
              key={item.id}
              className={schoolIndex === index ? "active" : ""}
              onClick={() => resetLesson(index, 0)}
            >
              <span>{item.icon}</span>
              <strong>{item.name}</strong>
              <small>{solved}/{item.lessons.length} mastered</small>
            </button>
          );
        })}
      </div>

      <div className="piece-school-summary">
        <div>
          <strong>{school.name}</strong>
          <span>{school.summary}</span>
        </div>
        <div>
          <strong>Question to ask</strong>
          <span>{school.question}</span>
        </div>
      </div>

      <div className="academy-card-picker piece-school-lessons">
        {school.lessons.map((item, index) => (
          <button
            key={item.id}
            className={lessonIndex === index ? "active" : ""}
            onClick={() => resetLesson(schoolIndex, index)}
          >
            <span>{progress.includes(item.id) ? "MASTERED" : `LESSON ${index + 1}`}</span>
            <strong>{item.title}</strong>
            <small>{item.concept}</small>
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
          <div className="eyebrow">{school.name.toUpperCase()} · {schoolSolved}/{school.lessons.length}</div>
          <h2>{lesson.title}</h2>
          <p>{lesson.prompt}</p>

          <div className="academy-concept-card">
            <strong>Piece concept</strong>
            <span>{lesson.concept}</span>
          </div>

          <p className={complete ? "tutorial-feedback success" : "tutorial-feedback"}>{message}</p>

          {complete ? (
            <>
              <div className="academy-explanation">
                <strong>What the opponent wants</strong>
                <span>{lesson.opponentPlan}</span>
              </div>
              <div className="academy-explanation takeaway">
                <strong>Remember this</strong>
                <span>{lesson.takeaway}</span>
              </div>
              <button className="primary-action" onClick={nextLesson}>Next lesson</button>
            </>
          ) : (
            <button className="secondary-action" onClick={() => setMessage(lesson.why)}>
              Explain what the piece needs
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
