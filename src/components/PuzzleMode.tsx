import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { MultiMovePuzzleMode } from "./MultiMovePuzzleMode";
import {
  OFFLINE_PUZZLES,
  PUZZLE_PROGRESS_KEY,
  dailyPuzzleIndex,
  normalizePuzzleProgress,
  puzzleMoveUci,
  puzzleOrientation,
  puzzlePosition,
  type PuzzleTheme,
} from "../lib/puzzles";
import { loadFeedbackSettings, playChessFeedback } from "../lib/feedback";
import { mergePuzzleProgress } from "../lib/progressMerge";
import { supabase } from "../lib/supabase";
import type { Json } from "../lib/database.types";

type Props = {
  onBack: () => void;
  onPractice: () => void;
  userId?: string | null;
};

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
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.localStorage.getItem(PUZZLE_PROGRESS_KEY);
    return raw ? normalizePuzzleProgress(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function todayLabel() {
  return new Date().toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function PuzzleMode({ onBack, onPractice, userId }: Props) {
  const todayIndex = useMemo(() => dailyPuzzleIndex(), []);
  const [index, setIndex] = useState(todayIndex);
  const puzzle = OFFLINE_PUZZLES[index];
  const [game, setGame] = useState(() => puzzlePosition(OFFLINE_PUZZLES[todayIndex]));
  const [selected, setSelected] = useState<Square | null>(null);
  const [message, setMessage] = useState(OFFLINE_PUZZLES[todayIndex].goal);
  const [complete, setComplete] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const [cloudReady, setCloudReady] = useState(false);
  const [theme, setTheme] = useState<"All" | PuzzleTheme>("All");

  const pieces = useMemo(() => boardPieces(game), [game]);
  const legalTargets = useMemo(() => {
    if (!selected || complete) return [];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [game, selected, complete]);

  const themes = useMemo(
    () => ["All", ...Array.from(new Set(OFFLINE_PUZZLES.map((item) => item.theme)))] as Array<"All" | PuzzleTheme>,
    []
  );

  const visiblePuzzles = useMemo(
    () =>
      OFFLINE_PUZZLES.map((item, puzzleIndex) => ({ item, puzzleIndex }))
        .filter(({ item }) => theme === "All" || item.theme === theme),
    [theme]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(PUZZLE_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Puzzle progress remains usable for this session.
    }
  }, [progress]);

  useEffect(() => {
    if (!userId || !supabase) {
      setCloudReady(false);
      return;
    }

    let cancelled = false;
    setCloudReady(false);

    void supabase
      .from("player_progress")
      .select("puzzle_progress")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setProgress((current) => mergePuzzleProgress(current, data.puzzle_progress));
        }
        setCloudReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!cloudReady || !userId || !supabase) return;

    void supabase
      .from("player_progress")
      .upsert(
        {
          user_id: userId,
          puzzle_progress: progress as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  }, [cloudReady, progress, userId]);

  const resetPuzzle = (nextIndex = index) => {
    const nextPuzzle = OFFLINE_PUZZLES[nextIndex];
    setIndex(nextIndex);
    setGame(puzzlePosition(nextPuzzle));
    setSelected(null);
    setMessage(nextPuzzle.goal);
    setComplete(false);
    setHintShown(false);
  };

  const attemptMove = (from: Square, to: Square) => {
    if (complete) return;
    const next = new Chess(game.fen());

    try {
      const made = next.move({ from, to, promotion: "q" });
      const uci = puzzleMoveUci(made.from as Square, made.to as Square, made.promotion);
      const correct = uci === puzzle.solution;

      if (!correct) {
        setSelected(null);
        setMessage(
          `${made.san} is legal, but it misses the best idea here. Ask what your opponent is threatening and which piece needs a better job.`
        );
        return;
      }

      setGame(next);
      setSelected(null);
      setComplete(true);
      setProgress((current) => current.includes(puzzle.id) ? current : [...current, puzzle.id]);

      const kind = next.isCheckmate() ? "mate" : next.inCheck() ? "check" : made.captured ? "capture" : "move";
      playChessFeedback(kind, loadFeedbackSettings());
      setMessage(puzzle.explanation);
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

  const nextPuzzle = () => {
    resetPuzzle((index + 1) % OFFLINE_PUZZLES.length);
  };

  return (
    <section className="puzzle-page">
      <button className="text-button back-link" onClick={onBack}>← Back</button>

      <div className="puzzle-heading">
        <div>
          <div className="eyebrow">TACTICS LAB · OFFLINE</div>
          <h1>Do not just find a move. Understand the position.</h1>
          <p>
            Daily queen, rook, bishop, knight, defense, strategy, and mating challenges.
            Solve from both colors, then learn what your opponent wanted and the pattern you should remember.
          </p>
        </div>
        <div className="puzzle-score">
          <strong>{progress.length}<span>/{OFFLINE_PUZZLES.length}</span></strong>
          <small>solved</small>
        </div>
      </div>

      <button className={index === todayIndex ? "daily-puzzle-card active" : "daily-puzzle-card"} onClick={() => resetPuzzle(todayIndex)}>
        <span>
          <b>PUZZLE OF THE DAY</b>
          <small>{todayLabel()}</small>
        </span>
        <strong>{OFFLINE_PUZZLES[todayIndex].title}</strong>
        <em>{OFFLINE_PUZZLES[todayIndex].theme} · {OFFLINE_PUZZLES[todayIndex].level}</em>
      </button>

      <div className="puzzle-theme-filter" aria-label="Puzzle themes">
        {themes.map((item) => (
          <button
            key={item}
            className={theme === item ? "active" : ""}
            onClick={() => setTheme(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="puzzle-picker">
        {visiblePuzzles.map(({ item, puzzleIndex }) => (
          <button
            key={item.id}
            className={puzzleIndex === index ? "active" : ""}
            onClick={() => resetPuzzle(puzzleIndex)}
          >
            <span>{progress.includes(item.id) ? "✓" : puzzleIndex + 1}</span>
            <strong>{item.title}</strong>
            <small>{item.theme}</small>
          </button>
        ))}
      </div>

      <div className="play-layout">
        <div className="board-column">
          <div className="board-shell">
            <ChessBoard
              pieces={pieces}
              selected={selected}
              legalTargets={legalTargets}
              onSquareClick={onSquareClick}
              onMoveAttempt={attemptMove}
              disabled={complete}
              orientation={puzzleOrientation(puzzle)}
            />
          </div>
        </div>

        <aside className="game-panel puzzle-panel">
          <div className="eyebrow">{puzzle.level} · {puzzle.theme.toUpperCase()}</div>
          <h2>{puzzle.title}</h2>
          <p className={complete ? "puzzle-message success" : "puzzle-message"}>{message}</p>

          <div className="puzzle-objective">
            <strong>Position question</strong>
            <span>{puzzle.goal}</span>
          </div>

          <div className="academy-explanation">
            <strong>What is the opponent trying to do?</strong>
            <span>{puzzle.opponentIdea}</span>
          </div>

          {!complete ? (
            <>
              {hintShown ? <div className="puzzle-hint">{puzzle.hint}</div> : null}
              <button className="secondary-action" onClick={() => setHintShown(true)} disabled={hintShown}>
                {hintShown ? "Hint shown" : "Show hint"}
              </button>
              <button className="secondary-action" onClick={() => resetPuzzle()}>Reset puzzle</button>
            </>
          ) : (
            <>
              <div className="puzzle-complete">
                <strong>✓ Solved · Why it works</strong>
                <span>{puzzle.explanation}</span>
              </div>
              <div className="academy-explanation takeaway">
                <strong>Pattern to remember</strong>
                <span>{puzzle.takeaway}</span>
              </div>
              <button className="primary-action" onClick={nextPuzzle}>Next puzzle</button>
            </>
          )}

          <button className="text-button puzzle-practice-link" onClick={onPractice}>Take the idea into Practice</button>
        </aside>
      </div>

      <MultiMovePuzzleMode />
    </section>
  );
}
