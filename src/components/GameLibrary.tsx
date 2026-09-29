import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Color, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import {
  buildUniversePosition,
  deleteGameFromLibrary,
  loadGameLibrary,
  loadGameLibraryTombstones,
  normalizeGameLibrary,
  replaceGameLibrary,
  replaceGameLibraryTombstones,
  type StoredGame,
} from "../lib/gameLibrary";
import {
  reviewStoredMove,
  uciForMove,
  type ReviewedMove,
} from "../lib/gameReview";
import { getComputerMove } from "../lib/stockfish";
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

function gameLabel(game: StoredGame) {
  if (game.mode === "ai") return `Vs AI · ${game.difficulty}`;
  return "Local 2 Player";
}

function clockLabel(minutes: number) {
  return minutes > 0 ? `${minutes} min` : "No timer";
}

function formatCompletedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved game";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function gradeClass(grade: ReviewedMove["grade"]) {
  return grade.toLowerCase().replaceAll(" ", "-");
}

export function GameLibrary({ onBack, onPractice, userId }: Props) {
  const initialGames = useMemo(() => loadGameLibrary(), []);
  const [games, setGames] = useState(initialGames);
  const [selectedId, setSelectedId] = useState<string | null>(initialGames[0]?.id ?? null);
  const [ply, setPly] = useState(initialGames[0]?.moves.length ?? 0);
  const [reviews, setReviews] = useState<Record<number, ReviewedMove>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const analysisToken = useRef(0);

  const [tryFen, setTryFen] = useState<string | null>(null);
  const [tryStartFen, setTryStartFen] = useState<string | null>(null);
  const [tryHero, setTryHero] = useState<Color>("b");
  const [trySelected, setTrySelected] = useState<Square | null>(null);
  const [tryThinking, setTryThinking] = useState(false);
  const [tryMessage, setTryMessage] = useState("");
  const [tryMoves, setTryMoves] = useState<string[]>([]);
  const tryToken = useRef(0);

  useEffect(() => {
    if (!userId || !supabase) return;

    const client = supabase;
    let cancelled = false;

    const syncLibrary = async () => {
      const tombstones = loadGameLibraryTombstones();
      if (tombstones.length > 0) {
        const { error: deleteError } = await client
          .from("saved_practice_games")
          .delete()
          .eq("user_id", userId)
          .in("local_id", tombstones);

        if (!deleteError) replaceGameLibraryTombstones([]);
      }

      const { data, error } = await client
        .from("saved_practice_games")
        .select("local_id,completed_at,mode,difficulty,time_control_minutes,result,moves")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (cancelled || error) return;

      const remoteGames = normalizeGameLibrary(
        (data ?? []).map((row) => ({
          id: row.local_id,
          completedAt: row.completed_at,
          mode: row.mode,
          difficulty: row.difficulty,
          timeControlMinutes: row.time_control_minutes,
          result: row.result,
          moves: row.moves,
        }))
      );

      const localGames = loadGameLibrary();
      const merged = normalizeGameLibrary([
        ...localGames,
        ...remoteGames.filter(
          (remote) => !localGames.some((local) => local.id === remote.id)
        ),
      ]);

      replaceGameLibrary(merged);
      setGames(merged);
      setSelectedId((current) =>
        current && merged.some((game) => game.id === current)
          ? current
          : merged[0]?.id ?? null
      );

      if (merged.length > 0) {
        await client.from("saved_practice_games").upsert(
          merged.map((game) => ({
            user_id: userId,
            local_id: game.id,
            completed_at: game.completedAt,
            mode: game.mode,
            difficulty: game.difficulty,
            time_control_minutes: game.timeControlMinutes,
            result: game.result,
            moves: game.moves as unknown as Json,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,local_id" }
        );
      }
    };

    void syncLibrary();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selected = games.find((game) => game.id === selectedId) ?? games[0] ?? null;

  const replay = useMemo(
    () => selected ? buildUniversePosition(selected.moves, ply) : null,
    [selected, ply]
  );
  const replayPieces = useMemo(() => replay ? boardPieces(replay) : [], [replay]);
  const replayLastMove = selected && ply > 0
    ? {
        from: selected.moves[ply - 1].from,
        to: selected.moves[ply - 1].to,
      }
    : null;

  const currentMoveIndex = selected && ply > 0 ? ply - 1 : null;
  const currentReview = currentMoveIndex === null ? null : reviews[currentMoveIndex] ?? null;

  const tryGame = useMemo(
    () => tryFen ? new Chess(tryFen) : null,
    [tryFen]
  );
  const tryPieces = useMemo(() => tryGame ? boardPieces(tryGame) : [], [tryGame]);
  const tryTargets = useMemo(() => {
    if (!tryGame || !trySelected || tryThinking || tryGame.turn() !== tryHero) return [];
    return tryGame.moves({ square: trySelected, verbose: true }).map((move) => move.to as Square);
  }, [tryGame, trySelected, tryThinking, tryHero]);

  const chooseGame = (game: StoredGame) => {
    analysisToken.current += 1;
    tryToken.current += 1;
    setSelectedId(game.id);
    setPly(game.moves.length);
    setReviews({});
    setAnalyzing(false);
    setAnalysisProgress("");
    setTryFen(null);
    setTryStartFen(null);
    setTrySelected(null);
    setTryThinking(false);
    setTryMoves([]);
    setTryMessage("");
  };

  const removeGame = (gameId: string) => {
    analysisToken.current += 1;
    tryToken.current += 1;
    const next = deleteGameFromLibrary(gameId);
    setGames(next);

    if (userId && supabase) {
      void supabase
        .from("saved_practice_games")
        .delete()
        .eq("user_id", userId)
        .eq("local_id", gameId)
        .then(({ error }) => {
          if (!error) {
            replaceGameLibraryTombstones(
              loadGameLibraryTombstones().filter((id) => id !== gameId)
            );
          }
        });
    }

    if (selectedId === gameId) {
      setSelectedId(next[0]?.id ?? null);
      setPly(next[0]?.moves.length ?? 0);
      setReviews({});
      setTryFen(null);
    }
  };

  const analyzeOne = async (index: number) => {
    if (!selected || index < 0 || index >= selected.moves.length) return;
    const token = ++analysisToken.current;
    setAnalyzing(true);
    setAnalysisProgress(`Analyzing move ${index + 1}…`);

    try {
      const review = await reviewStoredMove(selected, index, 6);
      if (token !== analysisToken.current) return;
      setReviews((current) => ({ ...current, [index]: review }));
      setAnalysisProgress(`${review.grade} · ${review.cpLoss} cp lost`);
    } catch (error) {
      if (token !== analysisToken.current) return;
      setAnalysisProgress(error instanceof Error ? error.message : "Could not analyze this move.");
    } finally {
      if (token === analysisToken.current) setAnalyzing(false);
    }
  };

  const analyzeFullGame = async () => {
    if (!selected || !selected.moves.length) return;
    const token = ++analysisToken.current;
    setAnalyzing(true);

    try {
      for (let index = 0; index < selected.moves.length; index += 1) {
        if (token !== analysisToken.current) return;
        if (reviews[index]) {
          setAnalysisProgress(`Reviewed ${index + 1} / ${selected.moves.length}`);
          continue;
        }

        setAnalysisProgress(`Analyzing ${index + 1} / ${selected.moves.length}…`);
        const review = await reviewStoredMove(selected, index, 5);
        if (token !== analysisToken.current) return;
        setReviews((current) => ({ ...current, [index]: review }));
      }

      if (token === analysisToken.current) {
        setAnalysisProgress("Game review complete.");
      }
    } catch (error) {
      if (token === analysisToken.current) {
        setAnalysisProgress(error instanceof Error ? error.message : "Game review stopped.");
      }
    } finally {
      if (token === analysisToken.current) setAnalyzing(false);
    }
  };

  const cancelAnalysis = () => {
    analysisToken.current += 1;
    setAnalyzing(false);
    setAnalysisProgress("Analysis stopped.");
  };

  const startTryPosition = () => {
    if (!selected || currentMoveIndex === null) return;
    tryToken.current += 1;
    const position = buildUniversePosition(selected.moves, currentMoveIndex);
    setTryHero(position.turn());
    setTryFen(position.fen());
    setTryStartFen(position.fen());
    setTrySelected(null);
    setTryThinking(false);
    setTryMoves([]);
    setTryMessage(
      currentReview
        ? `Try a different move. Stockfish preferred ${currentReview.bestSan}.`
        : "Try this position again and build a better line."
    );
  };

  const restartTry = () => {
    if (!tryStartFen) return;
    tryToken.current += 1;
    setTryFen(tryStartFen);
    setTrySelected(null);
    setTryThinking(false);
    setTryMoves([]);
    setTryMessage("Position reset. Your move.");
  };

  const applyTryAi = async (afterUser: Chess, movesAfterUser: string[]) => {
    if (afterUser.isGameOver()) return;
    const token = ++tryToken.current;
    setTryThinking(true);

    try {
      const uci = await getComputerMove(afterUser, "medium");
      if (token !== tryToken.current) return;

      const reply = new Chess(afterUser.fen());
      const made = reply.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] ?? "q",
      });
      setTryFen(reply.fen());
      setTryMoves([...movesAfterUser, made.san]);
      setTryMessage(
        reply.isCheckmate()
          ? `Checkmate — ${reply.turn() === "w" ? "Black" : "White"} wins this practice line.`
          : reply.isDraw()
            ? "This practice line reached a draw."
            : "Stockfish replied. Your move."
      );
    } catch (error) {
      if (token !== tryToken.current) return;
      setTryMessage(error instanceof Error ? error.message : "Stockfish could not answer.");
    } finally {
      if (token === tryToken.current) setTryThinking(false);
    }
  };

  const onTrySquare = (square: Square) => {
    if (!tryGame || tryThinking || tryGame.isGameOver() || tryGame.turn() !== tryHero) return;

    const piece = tryGame.get(square);
    if (!trySelected) {
      if (piece?.color === tryHero) setTrySelected(square);
      return;
    }

    const next = new Chess(tryGame.fen());
    try {
      const made = next.move({ from: trySelected, to: square, promotion: "q" });
      const uci = uciForMove(made.from, made.to, made.promotion);
      const nextMoves = [...tryMoves, made.san];

      setTrySelected(null);
      setTryFen(next.fen());
      setTryMoves(nextMoves);

      if (next.isCheckmate()) {
        setTryMessage(`Checkmate — you found a winning line with ${made.san}.`);
        return;
      }
      if (next.isDraw()) {
        setTryMessage("Your new line reached a draw.");
        return;
      }

      setTryMessage(
        tryMoves.length === 0 && currentReview?.bestMove === uci
          ? `${made.san} matches Stockfish's preferred move. Stockfish is replying…`
          : `${made.san} played. Stockfish is replying…`
      );
      void applyTryAi(next, nextMoves);
    } catch {
      if (piece?.color === tryHero) setTrySelected(square);
      else setTrySelected(null);
    }
  };

  if (!selected) {
    return (
      <section className="card game-library-empty">
        <button className="text-button back-link" onClick={onBack}>← Back</button>
        <div className="eyebrow">MY GAMES</div>
        <h2>No finished games yet.</h2>
        <p>
          Completed Practice and local games will automatically save on this device so you can replay
          and review them offline.
        </p>
        <button className="primary-action" onClick={onPractice}>Play a game</button>
      </section>
    );
  }

  if (tryGame) {
    return (
      <section className="library-page">
        <button className="text-button back-link" onClick={() => {
          tryToken.current += 1;
          setTryFen(null);
          setTryThinking(false);
          setTrySelected(null);
        }}>← Game Review</button>

        <div className="library-heading">
          <div>
            <div className="eyebrow">TRY THIS POSITION</div>
            <h1>Replay the moment.</h1>
            <p>Take over from before move {currentMoveIndex !== null ? currentMoveIndex + 1 : ""} and test a better line against Stockfish.</p>
          </div>
        </div>

        <div className="play-layout">
          <div className="board-column">
            <div className="board-shell">
              <ChessBoard
                pieces={tryPieces}
                selected={trySelected}
                legalTargets={tryTargets}
                onSquareClick={onTrySquare}
                disabled={tryThinking || tryGame.isGameOver()}
                orientation={tryHero}
              />
            </div>
          </div>

          <aside className="game-panel">
            <div className="eyebrow">REPLAY</div>
            <h2>You are {tryHero === "w" ? "White" : "Black"}</h2>
            <p className="status">{tryThinking ? "Stockfish is thinking…" : tryMessage}</p>

            {tryMoves.length ? (
              <div className="branch-history">
                <strong>New line</strong>
                <div>{tryMoves.map((move, index) => <span key={`${index}-${move}`}>{move}</span>)}</div>
              </div>
            ) : null}

            <button className="secondary-action reveal-history" onClick={restartTry}>Restart position</button>
            <button className="primary-action" onClick={() => setTryFen(null)}>Back to review</button>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="library-page">
      <button className="text-button back-link" onClick={onBack}>← Back</button>

      <div className="library-heading">
        <div>
          <div className="eyebrow">MY GAMES · OFFLINE LIBRARY</div>
          <h1>Replay it. Review it. Fix it.</h1>
          <p>Finished Practice games stay on this device. Stockfish review also works offline once Chess Universe is cached.</p>
        </div>
        <button className="secondary-action" onClick={onPractice}>Play another</button>
      </div>

      <div className="library-layout">
        <aside className="library-list">
          {games.map((game) => (
            <article className={game.id === selected.id ? "library-game active" : "library-game"} key={game.id}>
              <button className="library-game-main" onClick={() => chooseGame(game)}>
                <span>{formatCompletedAt(game.completedAt)}</span>
                <strong>{game.result}</strong>
                <small>{gameLabel(game)} · {clockLabel(game.timeControlMinutes)} · {game.moves.length} plies</small>
              </button>
              <button className="library-delete" onClick={() => removeGame(game.id)} aria-label="Delete saved game">×</button>
            </article>
          ))}
        </aside>

        <div className="history-replay-layout library-review-layout">
          <div className="board-column">
            <div className="board-shell">
              <ChessBoard
                pieces={replayPieces}
                selected={null}
                legalTargets={[]}
                lastMove={replayLastMove}
                onSquareClick={() => {}}
                orientation="b"
              />
            </div>
            <div className="replay-controls" aria-label="Saved game replay controls">
              <button onClick={() => setPly(0)} disabled={ply === 0}>|←</button>
              <button onClick={() => setPly((value) => Math.max(0, value - 1))} disabled={ply === 0}>←</button>
              <span>{ply} / {selected.moves.length} plies</span>
              <button onClick={() => setPly((value) => Math.min(selected.moves.length, value + 1))} disabled={ply === selected.moves.length}>→</button>
              <button onClick={() => setPly(selected.moves.length)} disabled={ply === selected.moves.length}>→|</button>
            </div>
          </div>

          <aside className="game-panel library-review-panel">
            <div className="eyebrow">{gameLabel(selected)} · {clockLabel(selected.timeControlMinutes)}</div>
            <h2>{selected.result}</h2>
            <p className="muted">{formatCompletedAt(selected.completedAt)}</p>

            <div className="review-actions">
              <button className="primary-action" onClick={analyzeFullGame} disabled={analyzing}>
                Analyze game
              </button>
              {analyzing ? (
                <button className="secondary-action" onClick={cancelAnalysis}>Stop</button>
              ) : null}
            </div>
            {analysisProgress ? <p className="muted review-progress" role="status">{analysisProgress}</p> : null}

            <div className="move-history library-moves">
              <div className="move-history-heading">
                <strong>Moves</strong>
                <span>{Object.keys(reviews).length} reviewed</span>
              </div>
              <div className="move-history-list">
                {selected.moves.map((move, index) => {
                  const review = reviews[index];
                  return (
                    <button
                      className={ply === index + 1 ? "review-move active" : "review-move"}
                      key={`${index}-${move.from}-${move.to}`}
                      onClick={() => setPly(index + 1)}
                    >
                      <span>{index + 1}</span>
                      <strong>{move.san}</strong>
                      <small>{move.color === "b" ? "Black" : "White"}</small>
                      {review ? <b className={`grade-pill ${gradeClass(review.grade)}`}>{review.grade}</b> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {currentMoveIndex !== null ? (
              <div className="review-card">
                <div className="review-card-heading">
                  <div>
                    <span>Move {currentMoveIndex + 1}</span>
                    <strong>{selected.moves[currentMoveIndex].san}</strong>
                  </div>
                  {currentReview ? (
                    <b className={`grade-pill large ${gradeClass(currentReview.grade)}`}>{currentReview.grade}</b>
                  ) : null}
                </div>

                {currentReview ? (
                  <>
                    <p>
                      Stockfish preferred <strong>{currentReview.bestSan}</strong>.
                      {currentReview.grade === "Best"
                        ? " Your move matched or stayed within the best line."
                        : ` Estimated loss: ${currentReview.cpLoss} centipawns.`}
                    </p>
                    <button className="secondary-action" onClick={startTryPosition}>Try this position again</button>
                  </>
                ) : (
                  <button className="secondary-action" onClick={() => void analyzeOne(currentMoveIndex)} disabled={analyzing}>
                    Analyze this move
                  </button>
                )}
              </div>
            ) : (
              <div className="review-card">
                <strong>Starting position</strong>
                <p>Move forward to select a move for review.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
