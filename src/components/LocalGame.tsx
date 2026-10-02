import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { getComputerMove, type Difficulty } from "../lib/stockfish";
import { makeLocalGameId, saveGameToLibrary, type StoredGame } from "../lib/gameLibrary";
import { reviewStoredMove, type ReviewedMove } from "../lib/gameReview";
import {
  coachHeadline,
  summarizeCoachReviews,
  type TrainingMoment,
} from "../lib/postGameCoach";
import { supabase } from "../lib/supabase";
import type { Json } from "../lib/database.types";
import { loadFeedbackSettings, normalizeFeedbackSettings, playChessFeedback, saveFeedbackSettings } from "../lib/feedback";
import {
  PRACTICE_TIME_OPTIONS,
  formatClock,
  initialClocks,
  practiceMoveLabel,
  practiceUndoPlies,
  type PracticeColor,
  type PracticeMode,
} from "../lib/practice";

type ClockState = Record<PracticeColor, number>;

type RecordedMove = {
  from: Square;
  to: Square;
  promotion?: string;
  san: string;
  color: PracticeColor;
  clocksBefore: ClockState;
};

type SavedPractice = {
  gameId: string;
  mode: PracticeMode;
  difficulty: Difficulty;
  timeControlMinutes: number;
  learningHelp: boolean;
  moves: RecordedMove[];
  clocks: ClockState;
  paused: boolean;
  timedOutColor: PracticeColor | null;
};

const PRACTICE_STORAGE_KEY = "chess-universe-practice-v2";
const AI_MOVE_REVEAL_DELAY_MS = 650;
const AI_MOVE_ANIMATION_MS = 700;
const DIFFICULTY_COPY: Record<Difficulty, string> = {
  beginner: "Slower search and the gentlest Stockfish setting.",
  easy: "A forgiving opponent that still sees basic tactics.",
  medium: "Balanced play for improving players.",
  hard: "Full-strength challenge with deeper calculation.",
};

// Chess Universe starts with Black. The normal starting position remains intact.
function newUniverseGame() {
  const game = new Chess();
  game.load(game.fen().replace(" w ", " b "));
  return game;
}

function boardPieces(game: Chess) {
  return game.board().flatMap((rank, rankIndex) =>
    rank.flatMap((piece, fileIndex) => {
      if (!piece) return [];
      const file = String.fromCharCode(97 + fileIndex);
      const square = `${file}${8 - rankIndex}` as Square;
      return [{ square, type: piece.type, color: piece.color }];
    })
  );
}

function rebuildGame(moves: RecordedMove[]) {
  const game = newUniverseGame();
  for (const move of moves) {
    game.move({
      from: move.from,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
    });
  }
  return game;
}

function statusTextFor(game: Chess) {
  if (game.isCheckmate()) return `Checkmate — ${game.turn() === "w" ? "Black" : "White"} wins`;
  if (game.isDraw()) return "Draw";
  return `${game.turn() === "w" ? "White" : "Black"} to move${game.inCheck() ? " — check" : ""}`;
}

function validDifficulty(value: unknown): value is Difficulty {
  return value === "beginner" || value === "easy" || value === "medium" || value === "hard";
}

function validMode(value: unknown): value is PracticeMode {
  return value === "ai" || value === "local";
}

function validTimeControl(value: unknown): value is number {
  return typeof value === "number" && PRACTICE_TIME_OPTIONS.some((option) => option.minutes === value);
}

function freshPractice(): SavedPractice & { game: Chess } {
  return {
    game: newUniverseGame(),
    gameId: makeLocalGameId(),
    mode: "ai",
    difficulty: "beginner",
    timeControlMinutes: 0,
    learningHelp: true,
    moves: [],
    clocks: initialClocks(0),
    paused: false,
    timedOutColor: null,
  };
}

function loadSavedPractice(): SavedPractice & { game: Chess } {
  if (typeof window === "undefined") return freshPractice();

  try {
    const raw = window.localStorage.getItem(PRACTICE_STORAGE_KEY);
    if (!raw) return freshPractice();

    const parsed = JSON.parse(raw) as Partial<SavedPractice>;
    const mode = validMode(parsed.mode) ? parsed.mode : "ai";
    const difficulty = validDifficulty(parsed.difficulty) ? parsed.difficulty : "beginner";
    const timeControlMinutes = validTimeControl(parsed.timeControlMinutes) ? parsed.timeControlMinutes : 0;
    const moves = Array.isArray(parsed.moves) ? (parsed.moves as RecordedMove[]) : [];
    const game = rebuildGame(moves);
    const baseClocks = initialClocks(timeControlMinutes);
    const clocks = {
      w: typeof parsed.clocks?.w === "number" ? Math.max(0, parsed.clocks.w) : baseClocks.w,
      b: typeof parsed.clocks?.b === "number" ? Math.max(0, parsed.clocks.b) : baseClocks.b,
    };
    const timedOutColor = parsed.timedOutColor === "w" || parsed.timedOutColor === "b"
      ? parsed.timedOutColor
      : null;

    // Any saved in-progress practice returns paused so a local clock never starts
    // running again until the user explicitly resumes.
    const paused = Boolean(parsed.paused) || (moves.length > 0 && !game.isGameOver() && !timedOutColor);

    return {
      game,
      gameId: typeof parsed.gameId === "string" && parsed.gameId ? parsed.gameId : makeLocalGameId(),
      mode,
      difficulty,
      timeControlMinutes,
      learningHelp: parsed.learningHelp !== false,
      moves,
      clocks,
      paused,
      timedOutColor,
    };
  } catch {
    return freshPractice();
  }
}

type LocalGameProps = {
  onOpenLibrary?: (gameId?: string) => void;
  onTrainMoment?: (moment: TrainingMoment) => void;
  userId?: string | null;
};

export function LocalGame({ onOpenLibrary, onTrainMoment, userId }: LocalGameProps) {
  const initial = useRef(loadSavedPractice()).current;
  const [game, setGame] = useState(initial.game);
  const [gameId, setGameId] = useState(initial.gameId);
  const [mode, setMode] = useState<PracticeMode>(initial.mode);
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState(initial.paused ? "Practice saved — press Resume when you're ready." : statusTextFor(initial.game));
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);
  const [engineStatus, setEngineStatus] = useState("Stockfish ready");
  const [timeControlMinutes, setTimeControlMinutes] = useState(initial.timeControlMinutes);
  const [learningHelp, setLearningHelp] = useState(initial.learningHelp);
  const [feedbackSettings, setFeedbackSettings] = useState(loadFeedbackSettings);
  const [moves, setMoves] = useState<RecordedMove[]>(initial.moves);
  const [clocks, setClocks] = useState<ClockState>(initial.clocks);
  const [paused, setPaused] = useState(initial.paused);
  const [timedOutColor, setTimedOutColor] = useState<PracticeColor | null>(initial.timedOutColor);
  const [animatedMove, setAnimatedMove] = useState<{ from: Square; to: Square } | null>(null);
  const gameToken = useRef(0);
  const clocksRef = useRef(clocks);
  const historyListRef = useRef<HTMLDivElement | null>(null);
  const [postGameReviews, setPostGameReviews] = useState<ReviewedMove[]>([]);
  const [postGameReviewStatus, setPostGameReviewStatus] = useState("");
  const postGameReviewToken = useRef(0);

  const pieces = useMemo(() => boardPieces(game), [game]);
  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [game, selected]);
  const lastMove = moves.length
    ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to }
    : null;

  const resultText = timedOutColor
    ? `${timedOutColor === "b" ? "Black" : "White"} ran out of time — ${timedOutColor === "b" ? "White" : "Black"} wins`
    : game.isGameOver()
      ? statusTextFor(game)
      : null;

  const completedGame = useMemo<StoredGame | null>(() => {
    if (!resultText || moves.length === 0) return null;
    return {
      id: gameId,
      completedAt: new Date().toISOString(),
      mode,
      difficulty,
      timeControlMinutes,
      result: resultText,
      moves: moves.map(({ from, to, promotion, san, color }) => ({
        from,
        to,
        promotion,
        san,
        color,
      })),
    };
  }, [difficulty, gameId, mode, moves, resultText, timeControlMinutes]);

  const postGameSummary = useMemo(
    () => summarizeCoachReviews(postGameReviews, mode === "ai" ? "b" : null),
    [mode, postGameReviews]
  );

  useEffect(() => {
    clocksRef.current = clocks;
  }, [clocks]);

  useEffect(() => {
    if (!userId || !supabase) return;

    let cancelled = false;

    void supabase
      .from("player_progress")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data?.preferences) return;
        if (typeof data.preferences !== "object" || Array.isArray(data.preferences)) return;

        const remoteFeedback = (data.preferences as Record<string, unknown>).feedback;
        if (!remoteFeedback) return;

        const next = normalizeFeedbackSettings(remoteFeedback);
        setFeedbackSettings(next);
        saveFeedbackSettings(next);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload: SavedPractice = {
        gameId,
        mode,
        difficulty,
        timeControlMinutes,
        learningHelp,
        moves,
        clocks,
        paused,
        timedOutColor,
      };
      window.localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Practice still works when browser storage is unavailable.
    }
  }, [gameId, mode, difficulty, timeControlMinutes, learningHelp, moves, clocks, paused, timedOutColor]);

  useEffect(() => {
    if (!completedGame) return;

    saveGameToLibrary(completedGame);

    if (userId && supabase) {
      void supabase
        .from("saved_practice_games")
        .upsert(
          {
            user_id: userId,
            local_id: completedGame.id,
            completed_at: completedGame.completedAt,
            mode: completedGame.mode,
            difficulty: completedGame.difficulty,
            time_control_minutes: completedGame.timeControlMinutes,
            result: completedGame.result,
            moves: completedGame.moves as unknown as Json,
            updated_at: completedGame.completedAt,
          },
          { onConflict: "user_id,local_id" }
        );
    }
  }, [completedGame, userId]);

  useEffect(() => {
    if (!completedGame) {
      postGameReviewToken.current += 1;
      setPostGameReviews([]);
      setPostGameReviewStatus("");
      return;
    }

    const token = ++postGameReviewToken.current;
    const reviewIndexes = completedGame.moves
      .map((move, index) => ({ move, index }))
      .filter(({ move }) => mode !== "ai" || move.color === "b")
      .map(({ index }) => index);

    setPostGameReviews([]);
    setPostGameReviewStatus("Finding the turning point…");

    void (async () => {
      const nextReviews: ReviewedMove[] = [];
      for (let offset = 0; offset < reviewIndexes.length; offset += 1) {
        const index = reviewIndexes[offset];
        const review = await reviewStoredMove(completedGame, index, 4);
        if (token !== postGameReviewToken.current) return;
        nextReviews.push(review);
        setPostGameReviewStatus(`Reviewing ${offset + 1} / ${reviewIndexes.length}…`);
      }

      if (token !== postGameReviewToken.current) return;
      setPostGameReviews(nextReviews);
      setPostGameReviewStatus("Post-game coach ready.");
    })().catch((error) => {
      if (token !== postGameReviewToken.current) return;
      setPostGameReviewStatus(error instanceof Error ? error.message : "Post-game review is unavailable.");
    });

    return () => {
      postGameReviewToken.current += 1;
    };
  }, [completedGame, mode]);

  useEffect(() => {
    const historyList = historyListRef.current;
    if (!historyList || moves.length === 0) return;

    // Keep move-history auto-scroll inside its own panel. scrollIntoView()
    // can move the entire page on mobile and pull the chessboard off-screen.
    const frame = window.requestAnimationFrame(() => {
      historyList.scrollTo({
        top: historyList.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [moves.length]);

  useEffect(() => {
    if (
      timeControlMinutes === 0 ||
      paused ||
      timedOutColor ||
      game.isGameOver()
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      const side = game.turn() as PracticeColor;
      setClocks((current) => ({
        ...current,
        [side]: Math.max(0, current[side] - 1),
      }));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [clocks, game, paused, timeControlMinutes, timedOutColor]);

  useEffect(() => {
    if (timeControlMinutes === 0 || timedOutColor || game.isGameOver()) return;
    const side = game.turn() as PracticeColor;
    if (clocks[side] > 0) return;

    gameToken.current += 1;
    setThinking(false);
    setSelected(null);
    setTimedOutColor(side);
    setMessage(`${side === "b" ? "Black" : "White"} ran out of time.`);
  }, [clocks, game, timeControlMinutes, timedOutColor]);

  const applyComputerMove = async (next: Chess, movesBeforeAi: RecordedMove[]) => {
    if (mode !== "ai" || next.isGameOver() || next.turn() !== "w" || timedOutColor) return;

    const token = ++gameToken.current;
    const revealStartedAt = Date.now();
    setThinking(true);
    setAnimatedMove(null);
    setEngineStatus(`Stockfish thinking · ${difficulty}`);

    try {
      const uci = await getComputerMove(next, difficulty);
      if (token !== gameToken.current) return;

      const remainingRevealDelay = Math.max(
        0,
        AI_MOVE_REVEAL_DELAY_MS - (Date.now() - revealStartedAt)
      );
      if (remainingRevealDelay > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, remainingRevealDelay);
        });
      }
      if (token !== gameToken.current) return;

      const aiGame = new Chess(next.fen());
      const made = aiGame.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] ?? "q",
      });
      const aiMove: RecordedMove = {
        from: made.from as Square,
        to: made.to as Square,
        promotion: made.promotion,
        san: made.san,
        color: made.color as PracticeColor,
        clocksBefore: { ...clocksRef.current },
      };

      const feedbackKind = aiGame.isCheckmate() ? "mate" : aiGame.inCheck() ? "check" : made.captured ? "capture" : "move";
      setAnimatedMove({ from: aiMove.from, to: aiMove.to });
      playChessFeedback(feedbackKind, feedbackSettings);
      setGame(aiGame);
      setMoves([...movesBeforeAi, aiMove]);
      setEngineStatus(`Stockfish active · ${difficulty}`);
      setMessage(statusTextFor(aiGame));

      window.setTimeout(() => {
        if (token === gameToken.current) setAnimatedMove(null);
      }, AI_MOVE_ANIMATION_MS);
    } catch (error) {
      if (token !== gameToken.current) return;
      setEngineStatus("Stockfish unavailable");
      setMessage(error instanceof Error ? error.message : "Stockfish could not make a move.");
    } finally {
      if (token === gameToken.current) setThinking(false);
    }
  };

  const attemptMove = (from: Square, to: Square) => {
    if (paused || thinking || timedOutColor || game.isGameOver()) return false;
    if (mode === "ai" && game.turn() === "w") return false;

    setAnimatedMove(null);
    const next = new Chess(game.fen());
    try {
      const made = next.move({ from, to, promotion: "q" });
      const recorded: RecordedMove = {
        from: made.from as Square,
        to: made.to as Square,
        promotion: made.promotion,
        san: made.san,
        color: made.color as PracticeColor,
        clocksBefore: { ...clocksRef.current },
      };
      const nextMoves = [...moves, recorded];
      const feedbackKind = next.isCheckmate() ? "mate" : next.inCheck() ? "check" : made.captured ? "capture" : "move";

      playChessFeedback(feedbackKind, feedbackSettings);
      setSelected(null);
      setGame(next);
      setMoves(nextMoves);
      setMessage(statusTextFor(next));
      void applyComputerMove(next, nextMoves);
      return true;
    } catch {
      if (learningHelp) setMessage("That move isn't legal. Choose another square.");
      return false;
    }
  };

  const onSquareClick = (square: Square) => {
    if (paused || thinking || timedOutColor || game.isGameOver()) return;
    if (mode === "ai" && game.turn() === "w") return;

    const piece = game.get(square);
    if (!selected) {
      if (piece && piece.color === game.turn()) {
        setSelected(square);
        if (learningHelp) {
          const count = game.moves({ square, verbose: true }).length;
          setMessage(`${count} legal move${count === 1 ? "" : "s"} available from ${square}.`);
        }
      }
      return;
    }

    if (piece && piece.color === game.turn()) {
      setSelected(square);
      if (learningHelp) {
        const count = game.moves({ square, verbose: true }).length;
        setMessage(`${count} legal move${count === 1 ? "" : "s"} available from ${square}.`);
      }
      return;
    }

    if (!attemptMove(selected, square)) {
      setSelected(null);
    }
  };

  const startNewGame = (minutes = timeControlMinutes) => {
    postGameReviewToken.current += 1;
    setPostGameReviews([]);
    setPostGameReviewStatus("");
    gameToken.current += 1;
    const next = newUniverseGame();
    const nextClocks = initialClocks(minutes);
    setGameId(makeLocalGameId());
    setGame(next);
    setMoves([]);
    setSelected(null);
    setThinking(false);
    setAnimatedMove(null);
    setPaused(false);
    setTimedOutColor(null);
    setClocks(nextClocks);
    clocksRef.current = nextClocks;
    setMessage("Black to move");
    setEngineStatus("Stockfish ready");
  };

  const changeMode = (nextMode: PracticeMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    startNewGame();
  };

  const changeTimeControl = (minutes: number) => {
    setTimeControlMinutes(minutes);
    startNewGame(minutes);
  };

  const togglePause = () => {
    if (resultText) return;

    if (paused) {
      setPaused(false);
      setMessage(statusTextFor(game));
      if (mode === "ai" && game.turn() === "w") {
        void applyComputerMove(game, moves);
      }
      return;
    }

    gameToken.current += 1;
    setThinking(false);
    setSelected(null);
    setPaused(true);
    setMessage("Practice paused. Your board is saved on this device.");
  };

  const undo = () => {
    const count = practiceUndoPlies(mode, thinking, game.turn() as PracticeColor, moves.length);
    if (!count) return;

    gameToken.current += 1;
    setThinking(false);
    setAnimatedMove(null);
    const targetLength = Math.max(0, moves.length - count);
    const firstRemoved = moves[targetLength];
    const nextMoves = moves.slice(0, targetLength);
    const next = rebuildGame(nextMoves);
    const restoredClocks = firstRemoved?.clocksBefore ?? initialClocks(timeControlMinutes);

    setMoves(nextMoves);
    setGame(next);
    setClocks({ ...restoredClocks });
    clocksRef.current = { ...restoredClocks };
    setTimedOutColor(null);
    setSelected(null);
    setMessage(statusTextFor(next));
    setEngineStatus("Move undone");
  };

  const retryComputer = () => {
    if (
      mode === "ai" &&
      game.turn() === "w" &&
      !thinking &&
      !paused &&
      !timedOutColor &&
      !game.isGameOver()
    ) {
      void applyComputerMove(game, moves);
    }
  };

  return (
    <section className="play-layout practice-layout">
      <div className="board-column">
        <div className={paused ? "board-shell practice-board paused" : "board-shell practice-board"}>
          <ChessBoard
            pieces={pieces}
            selected={selected}
            legalTargets={learningHelp ? legalTargets : []}
            lastMove={lastMove}
            animatedMove={animatedMove}
            onSquareClick={onSquareClick}
            onMoveAttempt={attemptMove}
            disabled={thinking || paused || Boolean(timedOutColor)}
            orientation="b"
          />
          {paused ? <div className="board-pause-overlay">PAUSED</div> : null}
        </div>

        {timeControlMinutes > 0 ? (
          <div className="clock-row practice-clocks">
            <div className={game.turn() === "b" && !paused && !resultText ? "clock active" : "clock"}>
              <span>{mode === "ai" ? "You · Black" : "Black"}</span>
              <strong>{formatClock(clocks.b)}</strong>
            </div>
            <div className={game.turn() === "w" && !paused && !resultText ? "clock active" : "clock"}>
              <span>{mode === "ai" ? "Stockfish · White" : "White"}</span>
              <strong>{formatClock(clocks.w)}</strong>
            </div>
          </div>
        ) : (
          <div className="practice-no-clock">
            <strong>No timer</strong>
            <span>Take your time. Practice is saved on this device.</span>
          </div>
        )}
      </div>

      <aside className="game-panel practice-panel">
        <div className="eyebrow">PRACTICE</div>
        <h2>{mode === "ai" ? "You play Black" : "Local 2 Player"}</h2>
        <p className="muted">Chess Universe rule: Black moves first.</p>

        <p className={resultText ? "status practice-status finished" : "status practice-status"}>
          {thinking ? "Computer is thinking…" : message}
        </p>

        {resultText ? (
          <>
            <div className="practice-result">
              <strong>{resultText}</strong>
              <span>{mode === "ai" ? "This game was saved locally. Review it with Stockfish or run it back." : "This game was saved locally. Replay or review it anytime."}</span>
            </div>
            {postGameSummary.turningPoint ? (
              <div className="post-game-coach">
                <div className="post-game-coach-heading">
                  <div>
                    <div className="eyebrow">POST-GAME COACH</div>
                    <strong>{coachHeadline(postGameSummary)}</strong>
                  </div>
                  <b className={`grade-pill large ${postGameSummary.turningPoint.grade.toLowerCase()}`}>
                    {postGameSummary.turningPoint.grade}
                  </b>
                </div>
                <div className="post-game-coach-grid">
                  <div>
                    <span>Turning point</span>
                    <strong>Move {postGameSummary.turningPoint.index + 1} · {postGameSummary.turningPoint.san}</strong>
                  </div>
                  <div>
                    <span>Better move</span>
                    <strong>{postGameSummary.turningPoint.bestSan}</strong>
                  </div>
                </div>
                <p>{postGameSummary.turningPoint.explanation}</p>
                <div className="review-teaching-card">
                  <strong>What changed?</strong>
                  <span>{postGameSummary.turningPoint.reviewCue}</span>
                </div>
                <div className="post-game-coach-stats">
                  <span>{postGameSummary.inaccuracies} inaccuracies</span>
                  <span>{postGameSummary.mistakes} mistakes</span>
                  <span>{postGameSummary.blunders} blunders</span>
                </div>
                <div className="post-game-coach-actions">
                  {onTrainMoment ? (
                    <button
                      className="primary-action"
                      onClick={() => onTrainMoment({ gameId, review: postGameSummary.turningPoint! })}
                    >
                      Train this mistake
                    </button>
                  ) : null}
                  {onOpenLibrary ? (
                    <button className="secondary-action" onClick={() => onOpenLibrary(gameId)}>
                      Full game review
                    </button>
                  ) : null}
                </div>
              </div>
            ) : postGameReviewStatus ? (
              <div className="post-game-coach loading" role="status">{postGameReviewStatus}</div>
            ) : null}
            {onOpenLibrary && !postGameSummary.turningPoint ? (
              <button className="secondary-action review-saved-game" onClick={() => onOpenLibrary(gameId)}>
                Review saved game
              </button>
            ) : null}
          </>
        ) : null}

        <div className="segmented">
          <button className={mode === "ai" ? "active" : ""} onClick={() => changeMode("ai")}>Vs AI</button>
          <button className={mode === "local" ? "active" : ""} onClick={() => changeMode("local")}>2 Player</button>
        </div>

        <div className="practice-settings">
          {mode === "ai" ? (
            <div className="setting-field">
              <label htmlFor="ai-difficulty">AI difficulty</label>
              <select
                id="ai-difficulty"
                value={difficulty}
                disabled={thinking}
                onChange={(event) => {
                  const next = event.target.value as Difficulty;
                  setDifficulty(next);
                  setEngineStatus(`Stockfish set to ${next}`);
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <small>{DIFFICULTY_COPY[difficulty]}</small>
            </div>
          ) : null}

          <div className="setting-field">
            <label htmlFor="practice-clock">Clock</label>
            <select
              id="practice-clock"
              value={timeControlMinutes}
              onChange={(event) => changeTimeControl(Number(event.target.value))}
            >
              {PRACTICE_TIME_OPTIONS.map((option) => (
                <option key={option.minutes} value={option.minutes}>{option.label}</option>
              ))}
            </select>
            <small>Changing the clock starts a fresh game. Practice defaults to no timer.</small>
          </div>

          <button
            type="button"
            className={learningHelp ? "learning-toggle active" : "learning-toggle"}
            onClick={() => setLearningHelp((current) => !current)}
          >
            <span>
              <strong>Learning Help</strong>
              <small>Legal move dots and beginner feedback.</small>
            </span>
            <b>{learningHelp ? "ON" : "OFF"}</b>
          </button>

          <button
            type="button"
            className={feedbackSettings.sound || feedbackSettings.haptics ? "learning-toggle active" : "learning-toggle"}
            onClick={() => {
              const enabled = !(feedbackSettings.sound || feedbackSettings.haptics);
              const next = { sound: enabled, haptics: enabled };
              setFeedbackSettings(next);
              saveFeedbackSettings(next);

              if (userId && supabase) {
                void supabase
                  .from("player_progress")
                  .upsert(
                    {
                      user_id: userId,
                      preferences: { feedback: next } as unknown as Json,
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" }
                  );
              }

              if (enabled) playChessFeedback("move", next);
            }}
          >
            <span>
              <strong>Sound & Haptics</strong>
              <small>Local move sounds and vibration when supported.</small>
            </span>
            <b>{feedbackSettings.sound || feedbackSettings.haptics ? "ON" : "OFF"}</b>
          </button>
        </div>

        {learningHelp ? (
          <div className="practice-help">
            <strong>{game.inCheck() ? "Your king is in check." : selected ? `${legalTargets.length} legal target${legalTargets.length === 1 ? "" : "s"} highlighted.` : "Tap a piece to see where it can move."}</strong>
            <span>Undo is available in Practice. Against AI, Undo rewinds the full round after Stockfish replies.</span>
          </div>
        ) : null}

        <div className="move-history practice-history">
          <div className="move-history-heading">
            <strong>Moves</strong>
            <span>{moves.length ? `${moves.length} played` : "Black opens"}</span>
          </div>
          <div className="move-history-list" ref={historyListRef}>
            {moves.length === 0 ? (
              <p className="muted">Your moves will appear here.</p>
            ) : (
              moves.map((move, index) => (
                <div className="move-entry" key={`${index}-${move.from}-${move.to}`}>
                  <span>{practiceMoveLabel(index, move.color)}</span>
                  <strong>{move.san}</strong>
                  <small>{move.from}→{move.to}</small>
                </div>
              ))
            )}
          </div>
        </div>

        {mode === "ai" ? <p className="muted engine-line" role="status">{engineStatus}</p> : null}

        <div className="practice-actions">
          <button className="secondary-action" onClick={togglePause} disabled={Boolean(resultText)}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button className="secondary-action" onClick={undo} disabled={moves.length === 0}>
            Undo
          </button>
        </div>

        {mode === "ai" && game.turn() === "w" && !thinking && !paused && !resultText ? (
          <button className="secondary-action retry-ai" onClick={retryComputer}>Retry AI move</button>
        ) : null}

        <button className="primary-action" onClick={() => startNewGame()}>
          {resultText ? "Rematch" : "New game"}
        </button>
      </aside>
    </section>
  );
}
