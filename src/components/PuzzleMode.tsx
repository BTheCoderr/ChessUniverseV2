import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { MultiMovePuzzleMode } from "./MultiMovePuzzleMode";
import {
  OFFLINE_PUZZLES,
  PUZZLE_LEVELS,
  PUZZLE_PROGRESS_KEY,
  explainWrongPuzzleMove,
  dailyPuzzleIndex,
  normalizePuzzleProgress,
  puzzleDifficultyRank,
  puzzleMoveUci,
  puzzleOrientation,
  puzzlePosition,
  puzzleScanPrompt,
  puzzleSideLabel,
  type PuzzleLevel,
  type PuzzleTheme,
} from "../lib/puzzles";
import { loadFeedbackSettings, playChessFeedback } from "../lib/feedback";
import { mergePuzzleProgress } from "../lib/progressMerge";
import { supabase } from "../lib/supabase";
import type { Json } from "../lib/database.types";
import {
  PUZZLE_MASTERY_KEY,
  PUZZLE_STREAK_KEY,
  firstTryRate,
  masteryStatus,
  normalizePuzzleMastery,
  normalizePuzzleStreak,
  recordPuzzleSolve,
  updatePuzzleSession,
  updatePuzzleStreak,
  type PuzzleMasteryStatus,
  type PuzzleSessionStats,
} from "../lib/puzzleMastery";

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

function loadMastery() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PUZZLE_MASTERY_KEY);
    return raw ? normalizePuzzleMastery(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function loadStreak() {
  if (typeof window === "undefined") return normalizePuzzleStreak(null);
  try {
    const raw = window.localStorage.getItem(PUZZLE_STREAK_KEY);
    return raw ? normalizePuzzleStreak(JSON.parse(raw)) : normalizePuzzleStreak(null);
  } catch {
    return normalizePuzzleStreak(null);
  }
}

const EMPTY_SESSION: PuzzleSessionStats = { solved: 0, firstTry: 0, hints: 0, misses: 0 };

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
  const [mistakeFeedback, setMistakeFeedback] = useState("");
  const [complete, setComplete] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [threatRevealed, setThreatRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [progress, setProgress] = useState(loadProgress);
  const [mastery, setMastery] = useState(loadMastery);
  const [streak, setStreak] = useState(loadStreak);
  const [sessionStats, setSessionStats] = useState<PuzzleSessionStats>(EMPTY_SESSION);
  const [cloudReady, setCloudReady] = useState(false);
  const [theme, setTheme] = useState<"All" | PuzzleTheme>("All");
  const [level, setLevel] = useState<"All" | PuzzleLevel>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | PuzzleMasteryStatus>("All");

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
        .filter(({ item }) => theme === "All" || item.theme === theme)
        .filter(({ item }) => level === "All" || item.level === level)
        .filter(({ item }) => statusFilter === "All" || masteryStatus(mastery[item.id]) === statusFilter)
        .sort((a, b) => puzzleDifficultyRank(a.item.level) - puzzleDifficultyRank(b.item.level) || a.puzzleIndex - b.puzzleIndex),
    [level, mastery, statusFilter, theme]
  );

  const masteryCounts = useMemo(() => {
    const counts = { mastered: 0, review: 0, learning: 0, fresh: 0 };
    for (const item of OFFLINE_PUZZLES) {
      const status = masteryStatus(mastery[item.id]);
      if (status === "mastered") counts.mastered += 1;
      else if (status === "needs-review") counts.review += 1;
      else if (status === "learning") counts.learning += 1;
      else counts.fresh += 1;
    }
    return counts;
  }, [mastery]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PUZZLE_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Puzzle progress remains usable for this session.
    }
  }, [progress]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PUZZLE_MASTERY_KEY, JSON.stringify(mastery));
      window.localStorage.setItem(PUZZLE_STREAK_KEY, JSON.stringify(streak));
    } catch {
      // Mastery and streaks still work in memory when storage is unavailable.
    }
  }, [mastery, streak]);

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
    setMistakeFeedback("");
    setComplete(false);
    setHintShown(false);
    setThreatRevealed(false);
    setAttempts(0);
  };

  const attemptMove = (from: Square, to: Square) => {
    if (complete) return;
    const next = new Chess(game.fen());

    try {
      const made = next.move({ from, to, promotion: "q" });
      const uci = puzzleMoveUci(made.from as Square, made.to as Square, made.promotion);
      const correct = uci === puzzle.solution;

      if (!correct) {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setSelected(null);
        setMessage(`Try another move — attempt ${nextAttempts}. The board is reset to the same decision.`);
        setMistakeFeedback(explainWrongPuzzleMove(puzzle, game, next, made));
        return;
      }

      setMistakeFeedback("");
      setGame(next);
      setSelected(null);
      setComplete(true);
      setThreatRevealed(true);
      setProgress((current) => current.includes(puzzle.id) ? current : [...current, puzzle.id]);
      const solveResult = { wrongAttempts: attempts, hintUsed: hintShown };
      setMastery((current) => recordPuzzleSolve(current, puzzle.id, solveResult));
      setStreak((current) => updatePuzzleStreak(current));
      setSessionStats((current) => updatePuzzleSession(current, solveResult));

      const kind = next.isCheckmate() ? "mate" : next.inCheck() ? "check" : made.captured ? "capture" : "move";
      playChessFeedback(kind, loadFeedbackSettings());
      setMessage(puzzle.explanation);
    } catch {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setSelected(null);
      setMessage(`Try another move — attempt ${nextAttempts}. The board is reset to the same decision.`);
      setMistakeFeedback("That move is not legal in this position. Recheck how the piece moves, whether the path is blocked, and whether your king would be left in check.");
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
    if (visiblePuzzles.length > 1) {
      const position = visiblePuzzles.findIndex(({ puzzleIndex }) => puzzleIndex === index);
      const nextVisible = visiblePuzzles[(position + 1 + visiblePuzzles.length) % visiblePuzzles.length];
      resetPuzzle(nextVisible.puzzleIndex);
      return;
    }
    resetPuzzle((index + 1) % OFFLINE_PUZZLES.length);
  };

  const chooseTheme = (nextTheme: "All" | PuzzleTheme) => {
    setTheme(nextTheme);
    const match = OFFLINE_PUZZLES.findIndex((item) =>
      (nextTheme === "All" || item.theme === nextTheme) &&
      (level === "All" || item.level === level) &&
      (statusFilter === "All" || masteryStatus(mastery[item.id]) === statusFilter)
    );
    if (match >= 0) resetPuzzle(match);
  };

  const chooseLevel = (nextLevel: "All" | PuzzleLevel) => {
    setLevel(nextLevel);
    const match = OFFLINE_PUZZLES.findIndex((item) =>
      (theme === "All" || item.theme === theme) &&
      (nextLevel === "All" || item.level === nextLevel) &&
      (statusFilter === "All" || masteryStatus(mastery[item.id]) === statusFilter)
    );
    if (match >= 0) resetPuzzle(match);
  };

  const chooseStatus = (nextStatus: "All" | PuzzleMasteryStatus) => {
    setStatusFilter(nextStatus);
    const match = OFFLINE_PUZZLES.findIndex((item) =>
      (theme === "All" || item.theme === theme) &&
      (level === "All" || item.level === level) &&
      (nextStatus === "All" || masteryStatus(mastery[item.id]) === nextStatus)
    );
    if (match >= 0) resetPuzzle(match);
  };

  return (
    <section className="puzzle-page">
      <button className="text-button back-link" onClick={onBack}>← Back</button>

      <div className="puzzle-heading">
        <div>
          <div className="eyebrow">TACTICS LAB · OFFLINE</div>
          <h1>Do not just find a move. Understand the position.</h1>
          <p>
            Work from Starter through Advanced, solve from both colors, and learn why the wrong move fails before moving on.
          </p>
        </div>
        <div className="puzzle-score">
          <strong>{progress.length}<span>/{OFFLINE_PUZZLES.length}</span></strong>
          <small>solved</small>
        </div>
      </div>

      <div className="puzzle-progress-strip" aria-label="Puzzle training progress">
        <div><strong>{streak.current}</strong><span>day streak</span><small>Best {streak.best}</small></div>
        <div><strong>{masteryCounts.mastered}</strong><span>mastered</span><small>{masteryCounts.learning} learning</small></div>
        <div><strong>{masteryCounts.review}</strong><span>needs review</span><small>{masteryCounts.fresh} new</small></div>
        <div><strong>{firstTryRate(sessionStats)}%</strong><span>first try</span><small>{sessionStats.solved} this session</small></div>
      </div>

      <button className={index === todayIndex ? "daily-puzzle-card active" : "daily-puzzle-card"} onClick={() => resetPuzzle(todayIndex)}>
        <span>
          <b>PUZZLE OF THE DAY</b>
          <small>{todayLabel()}</small>
        </span>
        <strong>{OFFLINE_PUZZLES[todayIndex].title}</strong>
        <em>{OFFLINE_PUZZLES[todayIndex].theme} · {OFFLINE_PUZZLES[todayIndex].level}</em>
      </button>

      <div className="puzzle-filter-stack">
        <div className="puzzle-filter-label">Difficulty</div>
        <div className="puzzle-theme-filter" aria-label="Puzzle difficulty">
          {["All", ...PUZZLE_LEVELS].map((item) => (
            <button
              key={item}
              className={level === item ? "active" : ""}
              onClick={() => chooseLevel(item as "All" | PuzzleLevel)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="puzzle-filter-label">Mastery</div>
        <div className="puzzle-theme-filter" aria-label="Puzzle mastery">
          {[
            ["All", "All"],
            ["needs-review", "Needs review"],
            ["learning", "Learning"],
            ["mastered", "Mastered"],
            ["new", "New"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={statusFilter === value ? "active" : ""}
              onClick={() => chooseStatus(value as "All" | PuzzleMasteryStatus)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="puzzle-filter-label">Theme</div>
        <div className="puzzle-theme-filter" aria-label="Puzzle themes">
          {themes.map((item) => (
            <button
              key={item}
              className={theme === item ? "active" : ""}
              onClick={() => chooseTheme(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="puzzle-picker">
        {visiblePuzzles.length ? visiblePuzzles.map(({ item, puzzleIndex }) => {
          const status = masteryStatus(mastery[item.id]);
          const marker = status === "mastered" ? "★" : status === "needs-review" ? "↻" : progress.includes(item.id) ? "✓" : puzzleIndex + 1;
          const statusLabel = status === "needs-review" ? "Review" : status === "mastered" ? "Mastered" : status === "learning" ? "Learning" : "New";
          return (
            <button
              key={item.id}
              className={puzzleIndex === index ? "active" : ""}
              onClick={() => resetPuzzle(puzzleIndex)}
            >
              <span className={`mastery-mark ${status}`}>{marker}</span>
              <strong>{item.title}</strong>
              <small>{item.level} · {item.theme} · {statusLabel}</small>
            </button>
          );
        }) : (
          <div className="puzzle-filter-empty">No puzzles match this training filter yet.</div>
        )}
      </div>

      <div className="play-layout puzzle-play-layout">
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
          <div className="puzzle-side-row">
            <span className="puzzle-side-chip">{puzzleSideLabel(puzzle).toUpperCase()}</span>
            <span className="puzzle-level-chip">{puzzle.level}</span>
          </div>
          <div className="eyebrow">{puzzle.theme.toUpperCase()}</div>
          <h2>{puzzle.title}</h2>
          <p className={complete ? "puzzle-message success" : "puzzle-message"}>{message}</p>

          <div className="puzzle-scan-card">
            <strong>Scan first</strong>
            <span>{puzzleScanPrompt(puzzle)}</span>
          </div>

          <div className="puzzle-objective">
            <strong>Position question</strong>
            <span>{puzzle.goal}</span>
          </div>

          {!complete && !threatRevealed ? (
            <button className="secondary-action opponent-reveal" onClick={() => setThreatRevealed(true)}>
              Reveal opponent threat
            </button>
          ) : null}

          {threatRevealed ? (
            <div className="academy-explanation">
              <strong>What is the opponent trying to do?</strong>
              <span>{puzzle.opponentIdea}</span>
            </div>
          ) : null}

          {!complete && mistakeFeedback ? (
            <div className="puzzle-mistake-card" role="alert">
              <strong>Why that move does not work</strong>
              <span>{mistakeFeedback}</span>
            </div>
          ) : null}

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
              <div className="puzzle-session-recap">
                <strong>Session recap</strong>
                <div>
                  <span>{sessionStats.solved} solved</span>
                  <span>{firstTryRate(sessionStats)}% first try</span>
                  <span>{sessionStats.misses} misses</span>
                  <span>{sessionStats.hints} hints</span>
                </div>
                {masteryCounts.review > 0 ? (
                  <small>{masteryCounts.review} puzzle{masteryCounts.review === 1 ? "" : "s"} waiting in Needs review.</small>
                ) : (
                  <small>Nothing is due for review right now.</small>
                )}
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
