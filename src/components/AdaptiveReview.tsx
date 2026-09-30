import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import {
  adaptiveQueue,
  loadReviewState,
  recordReviewAttempt,
  reviewCatalog,
} from "../lib/academyReview";

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

export function AdaptiveReview() {
  const [refreshKey, setRefreshKey] = useState(0);
  const queue = useMemo(() => adaptiveQueue(), [refreshKey]);
  const allState = useMemo(() => loadReviewState(), [refreshKey]);
  const catalog = useMemo(() => new Map(reviewCatalog().map((lesson) => [lesson.id, lesson])), []);
  const [queueIndex, setQueueIndex] = useState(0);

  const dueItem = queue[queueIndex] ?? queue[0] ?? null;
  const fallback = Object.values(allState)
    .filter((record) => record.misses > 0 && catalog.has(record.lessonId))
    .sort((a, b) => b.misses - a.misses)[0];
  const active = dueItem ?? (fallback ? { record: fallback, lesson: catalog.get(fallback.lessonId)! } : null);

  const lesson = active?.lesson ?? null;
  const [game, setGame] = useState(() => new Chess(lesson?.fen ?? "8/8/8/8/8/8/8/K6k w - - 0 1"));
  const [loadedLessonId, setLoadedLessonId] = useState(lesson?.id ?? "");
  const [selected, setSelected] = useState<Square | null>(null);
  const [message, setMessage] = useState(lesson?.prompt ?? "Miss a concept in Chess Academy and it will appear here for review.");
  const [mistake, setMistake] = useState("");
  const [complete, setComplete] = useState(false);

  if (lesson && lesson.id !== loadedLessonId) {
    setLoadedLessonId(lesson.id);
    setGame(new Chess(lesson.fen));
    setSelected(null);
    setMessage(lesson.prompt);
    setMistake("");
    setComplete(false);
  }

  const pieces = useMemo(() => boardPieces(game), [game]);
  const legalTargets = useMemo(() => {
    if (!selected || complete || !lesson) return [];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [complete, game, lesson, selected]);

  const advance = () => {
    setRefreshKey((value) => value + 1);
    setQueueIndex(0);
  };

  const attemptMove = (from: Square, to: Square) => {
    if (!lesson || complete) return;
    const next = new Chess(game.fen());

    try {
      const made = next.move({ from, to, promotion: "q" });
      const uci = `${made.from}${made.to}${made.promotion ?? ""}`;

      if (uci !== lesson.expectedMove) {
        recordReviewAttempt(lesson.id, false, uci);
        setSelected(null);
        setMistake(`${made.san}: ${lesson.mistakeLesson}`);
        setMessage("Still a legal chess move — but the same concept needs another look.");
        return;
      }

      recordReviewAttempt(lesson.id, true, uci);
      setGame(next);
      setSelected(null);
      setMistake("");
      setComplete(true);
      setMessage(lesson.why);
    } catch {
      setSelected(null);
      setMessage("That move is not legal in this position.");
    }
  };

  const onSquareClick = (square: Square) => {
    if (!lesson || complete) return;
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

  const records = Object.values(allState);
  const missedConcepts = records.filter((record) => record.misses > 0).length;
  const totalMisses = records.reduce((sum, record) => sum + record.misses, 0);
  const totalCorrect = records.reduce((sum, record) => sum + record.correct, 0);

  return (
    <div className="adaptive-review">
      <div className="piece-school-header">
        <div>
          <div className="eyebrow">ADAPTIVE REVIEW</div>
          <h2>Practice what you actually miss.</h2>
          <p>
            Chess Universe remembers missed concepts locally, prioritizes repeated mistakes,
            and schedules successful reviews farther into the future.
          </p>
        </div>
        <div className="review-summary">
          <div><strong>{queue.length}</strong><span>due now</span></div>
          <div><strong>{missedConcepts}</strong><span>concepts missed</span></div>
          <div><strong>{totalCorrect}/{totalCorrect + totalMisses || 0}</strong><span>review accuracy</span></div>
        </div>
      </div>

      {!lesson ? (
        <div className="review-empty">
          <span>✓</span>
          <div>
            <strong>No review queue yet</strong>
            <p>Keep using Piece Schools, Opponent Response, Piece Decisions, and Endgame School. Missed concepts will return here automatically.</p>
          </div>
        </div>
      ) : (
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
            <div className="eyebrow">{lesson.source.toUpperCase()} · ADAPTIVE</div>
            <h2>{lesson.title}</h2>
            <p>{lesson.prompt}</p>

            <div className="academy-concept-card">
              <strong>Concept under review</strong>
              <span>{lesson.concept}</span>
            </div>

            <div className="review-record-line">
              <span>Misses <b>{active?.record.misses ?? 0}</b></span>
              <span>Correct <b>{active?.record.correct ?? 0}</b></span>
            </div>

            {mistake ? (
              <div className="mistake-explanation">
                <strong>Why this still needs review</strong>
                <span>{mistake}</span>
              </div>
            ) : null}

            <p className={complete ? "tutorial-feedback success" : "tutorial-feedback"}>{message}</p>

            {complete ? (
              <>
                <div className="academy-explanation takeaway">
                  <strong>Remember this</strong>
                  <span>{lesson.takeaway}</span>
                </div>
                <button className="primary-action" onClick={advance}>
                  {queue.length > 1 ? "Next review" : "Review complete"}
                </button>
              </>
            ) : (
              <small className="muted">Correct reviews get spaced farther apart. Repeated misses come back sooner.</small>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
