import { useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { FAMOUS_GAMES, famousGameHistory, famousPosition, type FamousGame } from "../lib/famousGames";
import { getComputerMove } from "../lib/stockfish";

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

export function HistoryMode({ onBack, onLearn, onPractice }: Props) {
  const [gameId, setGameId] = useState<FamousGame["id"]>("opera");
  const [ply, setPly] = useState(0);
  const [scenarioActive, setScenarioActive] = useState(false);
  const [scenarioFen, setScenarioFen] = useState("");
  const [scenarioSelected, setScenarioSelected] = useState<Square | null>(null);
  const [scenarioThinking, setScenarioThinking] = useState(false);
  const [scenarioMessage, setScenarioMessage] = useState("");
  const [branchMoves, setBranchMoves] = useState<string[]>([]);
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
  };

  const startScenario = () => {
    scenarioToken.current += 1;
    const position = famousPosition(famous, famous.criticalPly);
    setPly(famous.criticalPly);
    setScenarioFen(position.fen());
    setScenarioSelected(null);
    setScenarioThinking(false);
    setBranchMoves([]);
    setScenarioMessage(
      `You are ${famous.heroName} playing ${position.turn() === "w" ? "White" : "Black"}. Can you find the historical move?`
    );
    setScenarioActive(true);
  };

  const resetScenario = () => {
    startScenario();
  };

  const applyAiReply = async (gameAfterUser: Chess, movesAfterUser: string[]) => {
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

      setScenarioFen(reply.fen());
      setBranchMoves([...movesAfterUser, made.san]);
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
      const nextBranch = [...branchMoves, made.san];

      setScenarioSelected(null);
      setScenarioFen(next.fen());
      setBranchMoves(nextBranch);

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

      void applyAiReply(next, nextBranch);
    } catch {
      if (piece?.color === heroColor) setScenarioSelected(square);
      else setScenarioSelected(null);
    }
  };

  if (scenarioActive) {
    const lastBranchMove = branchMoves.length > 0 ? branchMoves[branchMoves.length - 1] : null;
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

        <div className="history-scenario-heading">
          <div>
            <div className="eyebrow">REWRITE HISTORY</div>
            <h1>{famous.title}</h1>
            <p>
              Take over as <strong>{famous.heroName}</strong> from the famous moment and play the position against Stockfish.
            </p>
          </div>
          <span className="history-year">{famous.year}</span>
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
      <button className="text-button back-link" onClick={onBack}>← Home</button>

      <div className="history-heading">
        <div>
          <div className="eyebrow">CHESS HISTORY</div>
          <h1>Step into the games that became legend.</h1>
          <p>
            Replay the original moves, jump to the turning point, then take over and see whether you can reproduce—or rewrite—the finish.
          </p>
        </div>
      </div>

      <div className="history-rule-note">
        <strong>Historical mode uses the original rules.</strong>
        <span>These classic games begin with White, exactly as they were played. Chess Universe modes still begin with Black.</span>
      </div>

      <div className="history-library">
        {FAMOUS_GAMES.map((item) => (
          <button
            key={item.id}
            className={item.id === famous.id ? "history-card active" : "history-card"}
            onClick={() => selectGame(item.id)}
          >
            <span>{item.year}</span>
            <strong>{item.title}</strong>
            <small>{item.white} vs. {item.black}</small>
            <p>{item.summary}</p>
          </button>
        ))}
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

          <div className="history-moment-card">
            <strong>{famous.criticalLabel}</strong>
            <span>Jump to the position immediately before {famous.heroName}'s famous move.</span>
            <button className="secondary-action" onClick={() => setPly(famous.criticalPly)}>
              Jump to moment
            </button>
            <button className="primary-action" onClick={startScenario}>
              Rewrite History
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
            <button className="secondary-action" onClick={onLearn}>Learn the basics</button>
            <button className="secondary-action" onClick={onPractice}>Practice</button>
          </div>
        </aside>
      </div>
    </section>
  );
}
