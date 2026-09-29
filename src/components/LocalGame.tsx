import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { getComputerMove, type Difficulty } from "../lib/stockfish";
import { makeLocalGameId, saveGameToLibrary } from "../lib/gameLibrary";
import { loadFeedbackSettings, playChessFeedback, saveFeedbackSettings } from "../lib/feedback";
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

type LocalGameProps = { onOpenLibrary?: () => void };

export function LocalGame({ onOpenLibrary }: LocalGameProps) {
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
  const gameToken = useRef(0);
  const clocksRef = useRef(clocks);
  const historyEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    clocksRef.current = clocks;
  }, [clocks]);

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
    if (!resultText || moves.length === 0) return;
    saveGameToLibrary({
      id: gameId,
      completedAt: new Date().toISOString(),
      mode,
      difficulty,
      timeControlMinutes,
      result: resultText,
      moves: moves.map(({ from, to, promotion, san, color }) => ({ from, to, promotion, san, color })),
    });
  }, [gameId, resultText, moves, mode, difficulty, timeControlMinutes]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ block: "nearest" });
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
    setThinking(true);
    setEngineStatus(`Stockfish thinking · ${difficulty}`);

    try {
      const uci = await getComputerMove(next, difficulty);
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
      playChessFeedback(feedbackKind, feedbackSettings);
      setGame(aiGame);
      setMoves([...movesBeforeAi, aiMove]);
      setEngineStatus(`Stockfish active · ${difficulty}`);
      setMessage(statusTextFor(aiGame));
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
    gameToken.current += 1;
    const next = newUniverseGame();
    const nextClocks = initialClocks(minutes);
    setGameId(makeLocalGameId());
    setGame(next);
    setMoves([]);
    setSelected(null);
    setThinking(false);
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
            {onOpenLibrary ? (
              <button className="secondary-action review-saved-game" onClick={onOpenLibrary}>
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
          <div className="move-history-list">
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
            <div ref={historyEndRef} />
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
