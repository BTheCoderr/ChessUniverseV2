import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { getComputerMove, type Difficulty } from "../lib/stockfish";
import {
  BATTLE_FORMATIONS,
  newBattleChessGame,
  unlockedBattleFormations,
  type BattleFormation,
} from "../lib/battleChess";

type RecordedMove = {
  from: Square;
  to: Square;
  san: string;
};

const AI_MOVE_REVEAL_DELAY_MS = 650;
const AI_MOVE_ANIMATION_MS = 700;

function boardPieces(game: Chess) {
  return game.board().flatMap((rank, rankIndex) =>
    rank.flatMap((piece, fileIndex) => {
      if (!piece) return [];
      const square = `${String.fromCharCode(97 + fileIndex)}${8 - rankIndex}` as Square;
      return [{ square, type: piece.type, color: piece.color }];
    })
  );
}

function statusFor(game: Chess) {
  if (game.isCheckmate()) {
    return `Checkmate — ${game.turn() === "w" ? "Black" : "White"} wins`;
  }
  if (game.isDraw()) return "Draw";
  return `${game.turn() === "b" ? "Black" : "White"} to move${game.inCheck() ? " — check" : ""}`;
}

export function BattleChessGame({
  unlockKeys,
  onBack,
}: {
  unlockKeys: string[];
  onBack: () => void;
}) {
  const unlocks = useMemo(() => new Set(unlockKeys), [unlockKeys]);
  const availableFormations = useMemo(() => unlockedBattleFormations(unlocks), [unlocks]);
  const initialFormation = availableFormations[0] ?? BATTLE_FORMATIONS[0];
  const [formationKey, setFormationKey] = useState(initialFormation.key);
  const [mode, setMode] = useState<"ai" | "local">("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [game, setGame] = useState(() => newBattleChessGame(initialFormation));
  const [selected, setSelected] = useState<Square | null>(null);
  const [moves, setMoves] = useState<RecordedMove[]>([]);
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState(statusFor(game));
  const [animatedMove, setAnimatedMove] = useState<{ from: Square; to: Square } | null>(null);
  const gameToken = useRef(0);

  const formation =
    BATTLE_FORMATIONS.find((item) => item.key === formationKey) ??
    BATTLE_FORMATIONS[0];

  const pieces = useMemo(() => boardPieces(game), [game]);
  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to as Square);
  }, [game, selected]);

  const lastMove = moves.length
    ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to }
    : null;

  const startGame = (nextFormation: BattleFormation = formation, nextMode = mode) => {
    gameToken.current += 1;
    const next = newBattleChessGame(nextFormation);
    setFormationKey(nextFormation.key);
    setMode(nextMode);
    setGame(next);
    setMoves([]);
    setSelected(null);
    setThinking(false);
    setAnimatedMove(null);
    setMessage(statusFor(next));
  };

  const applyComputerMove = async (next: Chess, nextMoves: RecordedMove[]) => {
    if (mode !== "ai" || next.isGameOver() || next.turn() !== "w") return;

    const token = ++gameToken.current;
    const revealStartedAt = Date.now();
    setThinking(true);
    setAnimatedMove(null);
    setMessage("Battle opponent is thinking…");

    try {
      const uci = await getComputerMove(next, difficulty);
      if (token !== gameToken.current) return;

      const remainingDelay = Math.max(
        0,
        AI_MOVE_REVEAL_DELAY_MS - (Date.now() - revealStartedAt)
      );
      if (remainingDelay > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, remainingDelay);
        });
      }
      if (token !== gameToken.current) return;

      const aiGame = new Chess(next.fen());
      const made = aiGame.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] ?? "q",
      });

      const recorded = {
        from: made.from as Square,
        to: made.to as Square,
        san: made.san,
      };

      setAnimatedMove({ from: recorded.from, to: recorded.to });
      setGame(aiGame);
      setMoves([...nextMoves, recorded]);
      setMessage(statusFor(aiGame));

      window.setTimeout(() => {
        if (token === gameToken.current) setAnimatedMove(null);
      }, AI_MOVE_ANIMATION_MS);
    } catch (error) {
      if (token !== gameToken.current) return;
      setMessage(error instanceof Error ? error.message : "Battle opponent could not move.");
    } finally {
      if (token === gameToken.current) setThinking(false);
    }
  };

  const attemptMove = (from: Square, to: Square) => {
    if (thinking || game.isGameOver()) return false;
    if (mode === "ai" && game.turn() === "w") return false;

    try {
      const next = new Chess(game.fen());
      const made = next.move({ from, to, promotion: "q" });
      const recorded = {
        from: made.from as Square,
        to: made.to as Square,
        san: made.san,
      };
      const nextMoves = [...moves, recorded];

      setSelected(null);
      setAnimatedMove(null);
      setGame(next);
      setMoves(nextMoves);
      setMessage(statusFor(next));
      void applyComputerMove(next, nextMoves);
      return true;
    } catch {
      setMessage("That move isn't legal in this formation.");
      return false;
    }
  };

  const onSquareClick = (square: Square) => {
    if (thinking || game.isGameOver()) return;
    if (mode === "ai" && game.turn() === "w") return;

    const piece = game.get(square);
    if (!selected) {
      if (piece?.color === game.turn()) setSelected(square);
      return;
    }

    if (piece?.color === game.turn()) {
      setSelected(square);
      return;
    }

    if (!attemptMove(selected, square)) setSelected(null);
  };

  useEffect(() => {
    if (!availableFormations.some((item) => item.key === formationKey)) {
      startGame(availableFormations[0] ?? BATTLE_FORMATIONS[0], mode);
    }
  }, [availableFormations, formationKey]);

  return (
    <section className="play-layout battle-layout">
      <div className="board-shell battle-board">
        <ChessBoard
          pieces={pieces}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          animatedMove={animatedMove}
          onSquareClick={onSquareClick}
          onMoveAttempt={attemptMove}
          orientation="b"
          disabled={thinking || game.isGameOver()}
        />
      </div>

      <aside className="game-panel battle-panel">
        <button className="text-button back-link" onClick={onBack}>← Universe</button>
        <div className="eyebrow">BATTLE CHESS · LEVEL 1</div>
        <h2>Formation Clash</h2>
        <p className="muted">
          Normal chess movement. Black moves first. The battle starts from an unlocked alternate back rank, with castling disabled.
        </p>

        <div className="battle-mode-switch segmented">
          <button
            className={mode === "ai" ? "active" : ""}
            onClick={() => startGame(formation, "ai")}
          >
            Vs AI
          </button>
          <button
            className={mode === "local" ? "active" : ""}
            onClick={() => startGame(formation, "local")}
          >
            2 Player
          </button>
        </div>

        {mode === "ai" ? (
          <div className="game-settings">
            <label htmlFor="battle-difficulty">AI difficulty</label>
            <select
              id="battle-difficulty"
              value={difficulty}
              disabled={thinking}
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            >
              <option value="beginner">Beginner</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        ) : null}

        <div className="battle-formations">
          {BATTLE_FORMATIONS.map((item) => {
            const unlocked = !item.requires || unlocks.has(item.requires);
            return (
              <button
                type="button"
                key={item.key}
                className={formationKey === item.key ? "battle-formation active" : "battle-formation"}
                disabled={!unlocked}
                onClick={() => startGame(item)}
              >
                <strong>{item.name}</strong>
                <span>{unlocked ? item.description : "Locked by Universe progression"}</span>
              </button>
            );
          })}
        </div>

        <div className="battle-formation-detail">
          <div>
            <span>Current formation</span>
            <strong>{formation.name}</strong>
          </div>
          <code>{formation.backRank.toUpperCase()}</code>
        </div>

        <p className={game.isGameOver() ? "status finished" : "status"}>
          {thinking ? "Battle opponent is thinking…" : message}
        </p>

        <button className="primary-action" onClick={() => startGame(formation)}>
          New battle
        </button>

        <div className="move-history battle-history">
          <div className="move-history-heading">
            <strong>Battle log</strong>
            <span>{moves.length} move{moves.length === 1 ? "" : "s"}</span>
          </div>
          <div className="move-history-list">
            {moves.length === 0 ? (
              <p className="muted">Black opens the battle.</p>
            ) : (
              moves.map((move, index) => (
                <div className="move-entry" key={`${index}-${move.from}-${move.to}`}>
                  <span>{index + 1}</span>
                  <strong>{move.san}</strong>
                  <small>{move.from} → {move.to}</small>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
