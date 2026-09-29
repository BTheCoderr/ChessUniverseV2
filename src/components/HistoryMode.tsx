import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { FAMOUS_GAMES, famousGameHistory, famousPosition, type FamousGame } from "../lib/famousGames";
import { getComputerMove } from "../lib/stockfish";
import {
  HISTORY_PROGRESS_KEY,
  awardHistoryMedal,
  emptyHistoryProgress,
  gameMedalCount,
  medalCount,
  normalizeHistoryProgress,
  recordHistoryAttempt,
  rewriteChallengeComplete,
  type HistoryMedal,
  type HistoryProgress,
} from "../lib/historyProgress";

type Props = {
  onBack: () => void;
  onLearn: () => void;
  onPractice: () => void;
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

function moveLabel(index: number) {
  const moveNumber = Math.floor(index / 2) + 1;
  return index % 2 === 0 ? `${moveNumber}.` : `${moveNumber}...`;
}

function sameMove(actual: string, historical: string) {
  const normalize = (value: string) => value.replace(/[+#]/g, "");
  return normalize(actual) === normalize(historical);
}

function loadProgress() {
  if (typeof window === "undefined") return emptyHistoryProgress();
  try {
    const raw = window.localStorage.getItem(HISTORY_PROGRESS_KEY);
    return raw ? normalizeHistoryProgress(JSON.parse(raw)) : emptyHistoryProgress();
  } catch {
    return emptyHistoryProgress();
  }
}

const MEDAL_COPY: Record<HistoryMedal, { title: string; description: string }> = {
  replay: {
    title: "Replay",
    description: "Reach the end of the original score.",
  },
  historical: {
    title: "Find the Move",
    description: "Play the move made in the real game.",
  },
  rewrite: {
    title: "Rewrite",
    description: "Choose another move and establish a new timeline.",
  },
};

export function HistoryMode({ onBack, onLearn, onPractice }: Props) {
  const [gameId, setGameId] = useState<FamousGame["id"]>("opera");
  const [campaignOpen, setCampaignOpen] = useState(true);
  const [ply, setPly] = useState(0);
  const [scenarioActive, setScenarioActive] = useState(false);
  const [scenarioFen, setScenarioFen] = useState("");
  const [scenarioSelected, setScenarioSelected] = useState<Square | null>(null);
  const [scenarioThinking, setScenarioThinking] = useState(false);
  const [scenarioMessage, setScenarioMessage] = useState("");
  const [branchMoves, setBranchMoves] = useState<string[]>([]);
  const [firstScenarioMoveHistorical, setFirstScenarioMoveHistorical] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<HistoryProgress>(loadProgress);
  const [toast, setToast] = useState("");
  const scenarioToken = useRef(0);

  const famous = FAMOUS_GAMES.find((item) => item.id === gameId) ?? FAMOUS_GAMES[0];
  const history = useMemo(() => famousGameHistory(famous), [famous]);
  const replay = useMemo(() => famousPosition(famous, ply), [famous, ply]);
  const replayPieces = useMemo(() => boardPieces(replay), [replay]);
  const replayLastMove = ply > 0
    ? { from: history[ply - 1].from as Square, to: history[ply - 1].to as Square }
    : null;

  const criticalPosition = useMemo(
    () => famousPosition(famous, famous.criticalPly),
    [famous]
  );
  const heroColor = criticalPosition.turn();
  const scenario = useMemo(
    () => new Chess(scenarioFen || criticalPosition.fen()),
    [scenarioFen, criticalPosition]
  );
  const scenarioPieces = useMemo(() => boardPieces(scenario), [scenario]);
  const scenarioTargets = useMemo(() => {
    if (!scenarioSelected || scenarioThinking || scenario.turn() !== heroColor) return [];
    return scenario.moves({ square: scenarioSelected, verbose: true }).map((move) => move.to as Square);
  }, [scenario, scenarioSelected, scenarioThinking, heroColor]);

  const totalMedals = medalCount(progress);
  const completedLegends = FAMOUS_GAMES.filter((item) => gameMedalCount(progress, item.id) === 3).length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HISTORY_PROGRESS_KEY, JSON.stringify(progress));
      window.dispatchEvent(new CustomEvent("chess-universe-local-sync-needed"));
    } catch {
      // Campaign still works if browser storage is unavailable.
    }
  }, [progress]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (
      campaignOpen ||
      scenarioActive ||
      history.length === 0 ||
      ply !== history.length ||
      progress[gameId].replay
    ) {
      return;
    }

    setProgress((current) => awardHistoryMedal(current, gameId, "replay"));
    setToast("Replay medal earned · Original game completed");
  }, [campaignOpen, scenarioActive, history.length, ply, progress, gameId]);

  const award = (medal: HistoryMedal, message: string) => {
    if (progress[gameId][medal]) return;
    setProgress((current) => awardHistoryMedal(current, gameId, medal));
    setToast(message);
  };

  const selectGame = (next: FamousGame["id"]) => {
    scenarioToken.current += 1;
    setGameId(next);
    setPly(0);
    setScenarioActive(false);
    setScenarioFen("");
    setScenarioSelected(null);
    setScenarioThinking(false);
    setScenarioMessage("");
    setBranchMoves([]);
    setFirstScenarioMoveHistorical(null);
  };

  const openChapter = (next: FamousGame["id"]) => {
    selectGame(next);
    setCampaignOpen(false);
  };

  const startScenario = () => {
    scenarioToken.current += 1;
    const position = famousPosition(famous, famous.criticalPly);
    setPly(famous.criticalPly);
    setScenarioFen(position.fen());
    setScenarioSelected(null);
    setScenarioThinking(false);
    setBranchMoves([]);
    setFirstScenarioMoveHistorical(null);
    setProgress((current) => recordHistoryAttempt(current, gameId));
    setScenarioMessage(
      `You are ${famous.heroName} playing ${position.turn() === "w" ? "White" : "Black"}. Can you find the historical move?`
    );
    setScenarioActive(true);
  };

  const resetScenario = () => {
    startScenario();
  };

  const applyAiReply = async (
    gameAfterUser: Chess,
    movesAfterUser: string[],
    firstMoveWasHistorical: boolean
  ) => {
    if (gameAfterUser.isGameOver()) return;

    const token = ++scenarioToken.current;
    setScenarioThinking(true);
    try {
      const uci = await getComputerMove(gameAfterUser, "medium");
      if (token !== scenarioToken.current) return;

      const reply = new Chess(gameAfterUser.fen());
      const made = reply.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] ?? "q",
      });
      const nextBranch = [...movesAfterUser, made.san];

      setScenarioFen(reply.fen());
      setBranchMoves(nextBranch);

      if (rewriteChallengeComplete(nextBranch.length, firstMoveWasHistorical, reply.isGameOver())) {
        award("rewrite", "Rewrite medal earned · New timeline established");
      }

      setScenarioMessage(
        reply.isCheckmate()
          ? `Checkmate — ${reply.turn() === "w" ? "Black" : "White"} wins this timeline.`
          : reply.isDraw()
            ? "This new timeline ended in a draw."
            : "History has changed. Your move."
      );
    } catch (error) {
      if (token !== scenarioToken.current) return;
      setScenarioMessage(
        error instanceof Error
          ? `Stockfish could not answer: ${error.message}`
          : "Stockfish could not answer this position."
      );
    } finally {
      if (token === scenarioToken.current) setScenarioThinking(false);
    }
  };

  const onScenarioSquare = (square: Square) => {
    if (
      scenarioThinking ||
      scenario.isGameOver() ||
      scenario.turn() !== heroColor
    ) {
      return;
    }

    const piece = scenario.get(square);
    if (!scenarioSelected) {
      if (piece?.color === heroColor) setScenarioSelected(square);
      return;
    }

    const next = new Chess(scenario.fen());
    try {
      const made = next.move({
        from: scenarioSelected,
        to: square,
        promotion: "q",
      });
      const isFirstChoice = branchMoves.length === 0;
      const foundHistory = isFirstChoice && sameMove(made.san, famous.historicalMove);
      const historicalFlag = isFirstChoice
        ? foundHistory
        : firstScenarioMoveHistorical === true;
      const nextBranch = [...branchMoves, made.san];

      if (isFirstChoice) {
        setFirstScenarioMoveHistorical(foundHistory);
        if (foundHistory) {
          award("historical", "Find the Move medal earned · You matched history");
        }
      }

      setScenarioSelected(null);
      setScenarioFen(next.fen());
      setBranchMoves(nextBranch);

      if (rewriteChallengeComplete(nextBranch.length, historicalFlag, next.isGameOver())) {
        award("rewrite", "Rewrite medal earned · New timeline established");
      }

      if (next.isCheckmate()) {
        setScenarioMessage(`Checkmate — you rewrote history with ${made.san}.`);
        return;
      }
      if (next.isDraw()) {
        setScenarioMessage("Your new timeline ended in a draw.");
        return;
      }

      setScenarioMessage(
        foundHistory
          ? `You found it: ${made.san}. That's the move played in the original game.`
          : isFirstChoice
            ? `${made.san} is legal — but history just changed. Stockfish will play the other side.`
            : `${made.san} played. Stockfish is responding…`
      );

      void applyAiReply(next, nextBranch, historicalFlag);
    } catch {
      if (piece?.color === heroColor) setScenarioSelected(square);
      else setScenarioSelected(null);
    }
  };

  if (campaignOpen && !scenarioActive) {
    const campaignGames = [...FAMOUS_GAMES].sort((a, b) => a.year - b.year);

    return (
      <section className="legends-page">
        <button className="text-button back-link" onClick={onBack}>← Home</button>

        {toast ? <div className="achievement-toast" role="status">{toast}</div> : null}

        <div className="legends-hero">
          <div>
            <div className="eyebrow">LEGENDS · CAMPAIGN 01</div>
            <h1>Relive it. Beat it. Rewrite it.</h1>
            <p>
              Step into legendary positions like a historical sports challenge. Study what happened,
              find the move that made the game famous, then create your own timeline against Stockfish.
            </p>
          </div>
          <div className="campaign-score">
            <strong>{totalMedals}<span>/9</span></strong>
            <small>campaign medals</small>
            <b>{completedLegends}/3 legends mastered</b>
          </div>
        </div>

        <div className="campaign-progress-track" aria-label={`${totalMedals} of 9 medals earned`}>
          <span style={{ width: `${(totalMedals / 9) * 100}%` }} />
        </div>

        <div className="campaign-how">
          <div>
            <strong>① Replay</strong>
            <span>Watch the original game through the final move.</span>
          </div>
          <div>
            <strong>② Find the Move</strong>
            <span>Take over at the turning point and match history.</span>
          </div>
          <div>
            <strong>③ Rewrite</strong>
            <span>Choose another move and build a real alternate line.</span>
          </div>
        </div>

        <div className="legend-campaign-list">
          {campaignGames.map((item, index) => {
            const chapter = progress[item.id];
            const earned = gameMedalCount(progress, item.id);
            return (
              <article className={earned === 3 ? "legend-chapter mastered" : "legend-chapter"} key={item.id}>
                <div className="legend-chapter-number">0{index + 1}</div>
                <div className="legend-chapter-copy">
                  <div className="legend-chapter-meta">
                    <span>{item.year}</span>
                    <span>{item.event}</span>
                    {earned === 3 ? <b>MASTERED</b> : null}
                  </div>
                  <h2>{item.title}</h2>
                  <p className="legend-matchup">{item.white} vs. {item.black}</p>
                  <p>{item.summary}</p>

                  <div className="legend-objectives">
                    {(Object.keys(MEDAL_COPY) as HistoryMedal[]).map((medal) => (
                      <div className={chapter[medal] ? "legend-objective complete" : "legend-objective"} key={medal}>
                        <span>{chapter[medal] ? "✓" : "○"}</span>
                        <div>
                          <strong>{MEDAL_COPY[medal].title}</strong>
                          <small>{MEDAL_COPY[medal].description}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="legend-chapter-action">
                  <div className="legend-medal-count">
                    <strong>{earned}/3</strong>
                    <span>medals</span>
                  </div>
                  <button className="primary-action" onClick={() => openChapter(item.id)}>
                    {earned === 3 ? "Replay Legend" : earned > 0 ? "Continue" : "Enter Moment"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {totalMedals === 9 ? (
          <div className="campaign-complete">
            <div>
              <div className="eyebrow">CAMPAIGN COMPLETE</div>
              <h2>Legend status earned.</h2>
              <p>You completed all nine objectives in the first Chess Universe history campaign.</p>
            </div>
            <button className="secondary-action" onClick={onPractice}>Take it to Practice</button>
          </div>
        ) : null}

        <div className="history-footer-actions campaign-footer">
          <button className="secondary-action" onClick={onLearn}>Learn the basics</button>
          <button className="secondary-action" onClick={onPractice}>Practice</button>
        </div>
      </section>
    );
  }

  if (scenarioActive) {
    const lastBranchMove = branchMoves.length > 0 ? branchMoves[branchMoves.length - 1] : null;
    const chapter = progress[gameId];

    return (
      <section className="history-page">
        <button
          className="text-button back-link"
          onClick={() => {
            scenarioToken.current += 1;
            setScenarioActive(false);
            setScenarioThinking(false);
            setScenarioSelected(null);
          }}
        >
          ← Original replay
        </button>

        {toast ? <div className="achievement-toast" role="status">{toast}</div> : null}

        <div className="history-scenario-heading">
          <div>
            <div className="eyebrow">PLAY THE MOMENT · REWRITE HISTORY</div>
            <h1>{famous.title}</h1>
            <p>
              Take over as <strong>{famous.heroName}</strong> from the famous moment and play the position against Stockfish.
            </p>
          </div>
          <span className="history-year">{famous.year}</span>
        </div>

        <div className="scenario-objectives">
          <div className={chapter.historical ? "scenario-objective complete" : "scenario-objective"}>
            <span>{chapter.historical ? "✓" : "1"}</span>
            <div><strong>Find the Move</strong><small>Match {famous.heroName}'s historical move.</small></div>
          </div>
          <div className={chapter.rewrite ? "scenario-objective complete" : "scenario-objective"}>
            <span>{chapter.rewrite ? "✓" : "2"}</span>
            <div><strong>Rewrite</strong><small>Choose another first move and make three decisions in the new line.</small></div>
          </div>
        </div>

        <div className="play-layout">
          <div className="board-column">
            <div className="board-shell">
              <ChessBoard
                pieces={scenarioPieces}
                selected={scenarioSelected}
                legalTargets={scenarioTargets}
                onSquareClick={onScenarioSquare}
                disabled={scenarioThinking || scenario.isGameOver()}
                orientation={heroColor}
              />
            </div>
            <div className="history-scenario-note">
              <strong>You are {heroColor === "w" ? "White" : "Black"}</strong>
              <span>{famous.criticalLabel}</span>
            </div>
          </div>

          <aside className="game-panel history-scenario-panel">
            <div className="eyebrow">THE MOMENT</div>
            <h2>{famous.criticalLabel}</h2>
            <p className="muted">{famous.lesson}</p>

            <div className="tutorial-tip">
              <strong>Historical move</strong>
              <span>
                {branchMoves.length === 0
                  ? "Try it before revealing the answer."
                  : `${famous.heroName} played ${famous.historicalMove}.`}
              </span>
            </div>

            <p className="status">
              {scenarioThinking ? "Stockfish is answering your new timeline…" : scenarioMessage}
            </p>

            {branchMoves.length > 0 ? (
              <div className="branch-history">
                <strong>New timeline</strong>
                <div>
                  {branchMoves.map((move, index) => (
                    <span key={`${index}-${move}`}>{move}</span>
                  ))}
                </div>
                {lastBranchMove ? <small>Latest: {lastBranchMove}</small> : null}
              </div>
            ) : null}

            <button
              className="secondary-action reveal-history"
              onClick={() => setScenarioMessage(`The original move was ${famous.historicalMove}.`)}
            >
              Reveal historical move
            </button>
            <button className="primary-action" onClick={resetScenario}>Restart moment</button>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="history-page">
      <button
        className="text-button back-link"
        onClick={() => {
          setCampaignOpen(true);
          setPly(0);
        }}
      >
        ← Legends
      </button>

      {toast ? <div className="achievement-toast" role="status">{toast}</div> : null}

      <div className="history-heading">
        <div>
          <div className="eyebrow">LEGEND REPLAY · {gameMedalCount(progress, gameId)}/3 MEDALS</div>
          <h1>{famous.title}</h1>
          <p>
            Replay the original score, earn the study medal, then jump into the famous moment and take control.
          </p>
        </div>
      </div>

      <div className="history-rule-note">
        <strong>Historical mode uses the original rules.</strong>
        <span>These classic games begin with White, exactly as they were played. Chess Universe modes still begin with Black.</span>
      </div>

      <div className="history-replay-layout">
        <div className="board-column">
          <div className="board-shell">
            <ChessBoard
              pieces={replayPieces}
              selected={null}
              legalTargets={[]}
              lastMove={replayLastMove}
              onSquareClick={() => {}}
              orientation="w"
            />
          </div>

          <div className="replay-controls" aria-label="Replay controls">
            <button onClick={() => setPly(0)} disabled={ply === 0}>|←</button>
            <button onClick={() => setPly((value) => Math.max(0, value - 1))} disabled={ply === 0}>←</button>
            <span>{ply} / {history.length} plies</span>
            <button onClick={() => setPly((value) => Math.min(history.length, value + 1))} disabled={ply === history.length}>→</button>
            <button onClick={() => setPly(history.length)} disabled={ply === history.length}>→|</button>
          </div>
        </div>

        <aside className="game-panel history-panel">
          <div className="eyebrow">{famous.year} · {famous.event}</div>
          <h2>{famous.title}</h2>
          <p className="history-players">
            <strong>{famous.white}</strong>
            <span>vs.</span>
            <strong>{famous.black}</strong>
          </p>
          <p className="muted">{famous.lesson}</p>

          <div className="chapter-medals">
            <div className={progress[gameId].replay ? "chapter-medal earned" : "chapter-medal"}>
              <span>{progress[gameId].replay ? "✓" : "○"}</span>
              <div><strong>Replay</strong><small>Reach the final move.</small></div>
            </div>
            <div className={progress[gameId].historical ? "chapter-medal earned" : "chapter-medal"}>
              <span>{progress[gameId].historical ? "✓" : "○"}</span>
              <div><strong>Find the Move</strong><small>Match the historical choice.</small></div>
            </div>
            <div className={progress[gameId].rewrite ? "chapter-medal earned" : "chapter-medal"}>
              <span>{progress[gameId].rewrite ? "✓" : "○"}</span>
              <div><strong>Rewrite</strong><small>Build an alternate timeline.</small></div>
            </div>
          </div>

          <div className="history-moment-card">
            <strong>{famous.criticalLabel}</strong>
            <span>Jump to the position immediately before {famous.heroName}'s famous move.</span>
            <button className="secondary-action" onClick={() => setPly(famous.criticalPly)}>
              Jump to moment
            </button>
            <button className="primary-action" onClick={startScenario}>
              Play the Moment
            </button>
          </div>

          <div className="move-history history-moves">
            <div className="move-history-heading">
              <strong>Original moves</strong>
              <span>{famous.result}</span>
            </div>
            <div className="move-history-list">
              {history.map((move, index) => (
                <button
                  className={ply === index + 1 ? "history-move active" : "history-move"}
                  key={`${index}-${move.san}`}
                  onClick={() => setPly(index + 1)}
                >
                  <span>{moveLabel(index)}</span>
                  <strong>{move.san}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="history-footer-actions">
            <button className="secondary-action" onClick={onLearn}>Learn</button>
            <button className="secondary-action" onClick={onPractice}>Practice</button>
          </div>
        </aside>
      </div>
    </section>
  );
}
