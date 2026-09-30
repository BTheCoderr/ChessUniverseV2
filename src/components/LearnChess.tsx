import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { PieceSchools } from "./PieceSchools";
import { OpponentResponseTrainer } from "./OpponentResponseTrainer";
import { ACADEMY_POSITIONS, academyMoveParts } from "../lib/academyLessons";
import { OPENING_LESSONS, openingMoveParts } from "../lib/openingLessons";

type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
type BoardPiece = { square: Square; type: string; color: "w" | "b" };

type Props = {
  onPractice: () => void;
  onHistory: () => void;
  onPuzzles: () => void;
  onBack: () => void;
};

type PieceLesson = {
  name: string;
  type: PieceType;
  square: Square;
  targets: Square[];
  description: string;
  tip: string;
};

const PIECE_LESSONS: PieceLesson[] = [
  {
    name: "Pawn",
    type: "p",
    square: "d2",
    targets: ["d3", "d4"],
    description: "Pawns move straight ahead. From their starting square they may move one or two squares.",
    tip: "They capture one square diagonally instead of straight ahead.",
  },
  {
    name: "Knight",
    type: "n",
    square: "d4",
    targets: ["b3", "b5", "c2", "c6", "e2", "e6", "f3", "f5"],
    description: "Knights move in an L shape: two squares one way, then one square sideways.",
    tip: "Knights are the only pieces that can jump over other pieces.",
  },
  {
    name: "Bishop",
    type: "b",
    square: "d4",
    targets: ["a1", "b2", "c3", "e5", "f6", "g7", "h8", "a7", "b6", "c5", "e3", "f2", "g1"],
    description: "Bishops slide diagonally for as many open squares as they want.",
    tip: "A bishop always stays on the same color square.",
  },
  {
    name: "Rook",
    type: "r",
    square: "d4",
    targets: ["d1", "d2", "d3", "d5", "d6", "d7", "d8", "a4", "b4", "c4", "e4", "f4", "g4", "h4"],
    description: "Rooks slide in straight lines: up, down, left, or right.",
    tip: "Rooks become especially powerful on open files.",
  },
  {
    name: "Queen",
    type: "q",
    square: "d4",
    targets: [
      "d1", "d2", "d3", "d5", "d6", "d7", "d8",
      "a4", "b4", "c4", "e4", "f4", "g4", "h4",
      "a1", "b2", "c3", "e5", "f6", "g7", "h8",
      "a7", "b6", "c5", "e3", "f2", "g1",
    ],
    description: "The queen combines rook and bishop movement.",
    tip: "She is powerful, but bringing her out without support can make her a target.",
  },
  {
    name: "King",
    type: "k",
    square: "d4",
    targets: ["c3", "c4", "c5", "d3", "d5", "e3", "e4", "e5"],
    description: "The king moves one square in any direction.",
    tip: "You may never move your king onto a square attacked by the opponent.",
  },
];

const STRATEGY_CARDS = [
  {
    title: "Center",
    body: "Central pawns and pieces influence more squares. Control the center so your pieces can reach both wings quickly.",
  },
  {
    title: "Development with purpose",
    body: "Do not develop because a rule says so. Put each piece on a square where it attacks, defends, or prepares your next plan.",
  },
  {
    title: "King safety",
    body: "Before launching an attack, scan the checks your opponent has. An unsafe king can make every other advantage irrelevant.",
  },
  {
    title: "Piece activity",
    body: "A rook behind pawns, a bishop behind its own chain, or a knight on the rim may be technically alive but strategically absent.",
  },
  {
    title: "Pawn structure",
    body: "Pawn moves create permanent strengths and weaknesses. Ask what squares a pawn move opens, closes, protects, and abandons.",
  },
  {
    title: "Trade the right piece",
    body: "A bishop pair loves open boards. A knight loves stable outposts and closed centers. Compare the future squares, not only piece values.",
  },
];

const TACTIC_CARDS = [
  { title: "Checks", body: "Forcing moves shrink the opponent's choices. Scan checks before quieter moves." },
  { title: "Captures", body: "Look for loose or overloaded pieces before calculating complicated combinations." },
  { title: "Threats", body: "If there is no immediate check or capture, ask what move creates a problem the opponent must answer." },
  { title: "Forks", body: "One piece attacks two targets. Knights are famous for forks because their attacks cannot be blocked." },
  { title: "Pins & skewers", body: "Line pieces become dangerous when one target sits behind another on the same file, rank, or diagonal." },
  { title: "Remove the defender", body: "Sometimes the target is protected — so the real tactic is eliminating the piece that protects it." },
];

function boardPieces(game: Chess): BoardPiece[] {
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

function standardPieces() {
  return boardPieces(new Chess());
}

export function LearnChess({ onPractice, onHistory, onPuzzles, onBack }: Props) {
  const [lesson, setLesson] = useState<"pieces" | "decisions" | "schools" | "responses" | "openings" | "strategy" | "universe">("pieces");

  const [pieceIndex, setPieceIndex] = useState(0);
  const [pieceComplete, setPieceComplete] = useState(false);

  const [decisionIndex, setDecisionIndex] = useState(0);
  const [decisionGame, setDecisionGame] = useState(() => new Chess(ACADEMY_POSITIONS[0].fen));
  const [decisionSelected, setDecisionSelected] = useState<Square | null>(null);
  const [decisionComplete, setDecisionComplete] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState(ACADEMY_POSITIONS[0].question);

  const [openingIndex, setOpeningIndex] = useState(0);
  const [openingStepIndex, setOpeningStepIndex] = useState(0);
  const [openingSelected, setOpeningSelected] = useState<Square | null>(null);
  const [openingStepComplete, setOpeningStepComplete] = useState(false);
  const [openingMessage, setOpeningMessage] = useState("Play the guided move, then read why it belongs in the opening.");

  const [universeSelected, setUniverseSelected] = useState<Square | null>(null);
  const [universeComplete, setUniverseComplete] = useState(false);

  const currentPiece = PIECE_LESSONS[pieceIndex];
  const currentDecision = ACADEMY_POSITIONS[decisionIndex];
  const currentOpening = OPENING_LESSONS[openingIndex];
  const currentOpeningStep = currentOpening.steps[openingStepIndex];

  const pieceBoard = useMemo<BoardPiece[]>(() => [
    { square: currentPiece.square, type: currentPiece.type, color: "w" },
  ], [currentPiece]);

  const decisionPieces = useMemo(() => boardPieces(decisionGame), [decisionGame]);
  const decisionTargets = useMemo(() => {
    if (!decisionSelected || decisionComplete) return [];
    return decisionGame.moves({ square: decisionSelected, verbose: true }).map((move) => move.to as Square);
  }, [decisionComplete, decisionGame, decisionSelected]);

  const openingGame = useMemo(() => {
    const game = new Chess();
    for (let i = 0; i < openingStepIndex; i += 1) {
      const step = openingMoveParts(currentOpening.steps[i].uci);
      game.move({
        from: step.from,
        to: step.to,
        ...(step.promotion ? { promotion: step.promotion } : {}),
      });
    }
    if (openingStepComplete) {
      const step = openingMoveParts(currentOpeningStep.uci);
      game.move({
        from: step.from,
        to: step.to,
        ...(step.promotion ? { promotion: step.promotion } : {}),
      });
    }
    return game;
  }, [currentOpening, currentOpeningStep, openingStepComplete, openingStepIndex]);

  const openingPieces = useMemo(() => boardPieces(openingGame), [openingGame]);
  const openingTargets = useMemo(() => {
    if (!openingSelected || openingStepComplete) return [];
    return openingGame.moves({ square: openingSelected, verbose: true }).map((move) => move.to as Square);
  }, [openingGame, openingSelected, openingStepComplete]);

  const universeBoard = useMemo<BoardPiece[]>(() => {
    const pieces = standardPieces();
    if (!universeComplete) return pieces;
    return pieces.map((piece) =>
      piece.square === "e7" ? { ...piece, square: "e5" as Square } : piece
    );
  }, [universeComplete]);

  const pieceClick = (square: Square) => {
    if (currentPiece.targets.includes(square)) setPieceComplete(true);
  };

  const chooseDecision = (index: number) => {
    const next = ACADEMY_POSITIONS[index];
    setDecisionIndex(index);
    setDecisionGame(new Chess(next.fen));
    setDecisionSelected(null);
    setDecisionComplete(false);
    setDecisionMessage(next.question);
  };

  const attemptDecisionMove = (from: Square, to: Square) => {
    if (decisionComplete) return;
    const next = new Chess(decisionGame.fen());

    try {
      const move = next.move({ from, to, promotion: "q" });
      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
      if (uci !== currentDecision.expectedMove) {
        setDecisionSelected(null);
        setDecisionMessage(
          `${move.san} is legal, but it does not solve this positional problem. Ask what job the ${currentDecision.piece.toLowerCase()} needs to do.`
        );
        return;
      }

      setDecisionGame(next);
      setDecisionSelected(null);
      setDecisionComplete(true);
      setDecisionMessage(currentDecision.why);
    } catch {
      setDecisionSelected(null);
      setDecisionMessage("That move is not legal in this position. Recheck the piece's path and king safety.");
    }
  };

  const decisionClick = (square: Square) => {
    if (decisionComplete) return;
    const piece = decisionGame.get(square);

    if (!decisionSelected) {
      if (piece?.color === decisionGame.turn()) setDecisionSelected(square);
      return;
    }

    if (piece?.color === decisionGame.turn()) {
      setDecisionSelected(square);
      return;
    }

    attemptDecisionMove(decisionSelected, square);
  };

  const chooseOpening = (index: number) => {
    setOpeningIndex(index);
    setOpeningStepIndex(0);
    setOpeningSelected(null);
    setOpeningStepComplete(false);
    setOpeningMessage("Play the guided move, then read why it belongs in the opening.");
  };

  const attemptOpeningMove = (from: Square, to: Square) => {
    if (openingStepComplete) return;
    const parts = openingMoveParts(currentOpeningStep.uci);
    const expected = `${parts.from}${parts.to}${parts.promotion ?? ""}`;

    const trial = new Chess(openingGame.fen());
    try {
      const made = trial.move({ from, to, promotion: "q" });
      const uci = `${made.from}${made.to}${made.promotion ?? ""}`;

      if (uci !== expected) {
        setOpeningSelected(null);
        setOpeningMessage(
          `${made.san} is legal, but this walkthrough is teaching ${currentOpeningStep.sanLabel}. Read the purpose, then try the guided move.`
        );
        return;
      }

      setOpeningSelected(null);
      setOpeningStepComplete(true);
      setOpeningMessage(currentOpeningStep.purpose);
    } catch {
      setOpeningSelected(null);
      setOpeningMessage("That move is not legal from this position.");
    }
  };

  const openingClick = (square: Square) => {
    if (openingStepComplete) return;
    const piece = openingGame.get(square);

    if (!openingSelected) {
      if (piece?.color === openingGame.turn()) setOpeningSelected(square);
      return;
    }

    if (piece?.color === openingGame.turn()) {
      setOpeningSelected(square);
      return;
    }

    attemptOpeningMove(openingSelected, square);
  };

  const nextOpeningStep = () => {
    if (openingStepIndex >= currentOpening.steps.length - 1) {
      setOpeningStepIndex(0);
      setOpeningSelected(null);
      setOpeningStepComplete(false);
      setOpeningMessage("Run it again without rushing. Try to remember the purpose before the move.");
      return;
    }

    setOpeningStepIndex((index) => index + 1);
    setOpeningSelected(null);
    setOpeningStepComplete(false);
    setOpeningMessage("Now play the next move and explain to yourself what problem it solves.");
  };

  const universeClick = (square: Square) => {
    if (universeComplete) return;
    if (!universeSelected) {
      if (square === "e7") setUniverseSelected("e7");
      return;
    }
    if (universeSelected === "e7" && square === "e5") {
      setUniverseSelected(null);
      setUniverseComplete(true);
    } else {
      setUniverseSelected(square === "e7" ? "e7" : null);
    }
  };

  return (
    <section className="learn-page">
      <button className="text-button back-link" onClick={onBack}>← Home</button>

      <div className="learn-heading academy-heading">
        <div>
          <div className="eyebrow">CHESS ACADEMY</div>
          <h1>Learn what the piece is trying to do.</h1>
          <p>
            Move the pieces on real boards, learn the plan behind openings, compare piece quality,
            understand the opponent's idea, and turn the lesson into something you can recognize in your own games.
          </p>
        </div>
      </div>

      <div className="academy-tabs academy-tabs-expanded" aria-label="Chess Academy sections">
        <button className={lesson === "pieces" ? "active" : ""} onClick={() => setLesson("pieces")}>1 · Piece basics</button>
        <button className={lesson === "decisions" ? "active" : ""} onClick={() => setLesson("decisions")}>2 · Piece decisions</button>
        <button className={lesson === "schools" ? "active" : ""} onClick={() => setLesson("schools")}>3 · Piece Schools</button>
        <button className={lesson === "responses" ? "active" : ""} onClick={() => setLesson("responses")}>4 · Opponent response</button>
        <button className={lesson === "openings" ? "active" : ""} onClick={() => setLesson("openings")}>5 · Opening Lab</button>
        <button className={lesson === "strategy" ? "active" : ""} onClick={() => setLesson("strategy")}>6 · Strategy & tactics</button>
        <button className={lesson === "universe" ? "active" : ""} onClick={() => setLesson("universe")}>7 · Universe</button>
      </div>

      {lesson === "pieces" ? (
        <div className="learn-layout">
          <div className="board-shell tutorial-board">
            <ChessBoard
              pieces={pieceBoard}
              selected={currentPiece.square}
              legalTargets={currentPiece.targets}
              onSquareClick={pieceClick}
              orientation="w"
            />
          </div>

          <aside className="game-panel tutorial-panel">
            <div className="eyebrow">PIECE BASICS</div>
            <h2>{currentPiece.name}</h2>
            <p>{currentPiece.description}</p>
            <div className="tutorial-tip">
              <strong>How to think about it</strong>
              <span>{currentPiece.tip}</span>
            </div>
            <p className={pieceComplete ? "tutorial-feedback success" : "tutorial-feedback"}>
              {pieceComplete
                ? "Good. Now remember the movement pattern without the highlights."
                : "Tap any highlighted square to practice the movement."}
            </p>
            <div className="piece-lesson-dots" aria-label="Piece lessons">
              {PIECE_LESSONS.map((item, index) => (
                <button
                  key={item.name}
                  className={index === pieceIndex ? "active" : ""}
                  onClick={() => {
                    setPieceIndex(index);
                    setPieceComplete(false);
                  }}
                  aria-label={item.name}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button
              className="primary-action"
              onClick={() => {
                if (pieceIndex === PIECE_LESSONS.length - 1) {
                  setLesson("decisions");
                } else {
                  setPieceIndex((index) => index + 1);
                  setPieceComplete(false);
                }
              }}
              disabled={!pieceComplete}
            >
              {pieceIndex === PIECE_LESSONS.length - 1 ? "Next: Piece decisions" : "Next piece"}
            </button>
          </aside>
        </div>
      ) : null}

      {lesson === "decisions" ? (
        <>
          <div className="academy-card-picker">
            {ACADEMY_POSITIONS.map((item, index) => (
              <button
                key={item.id}
                className={index === decisionIndex ? "active" : ""}
                onClick={() => chooseDecision(index)}
              >
                <span>{item.piece}</span>
                <strong>{item.title}</strong>
                <small>{item.concept}</small>
              </button>
            ))}
          </div>

          <div className="learn-layout">
            <div className="board-shell tutorial-board">
              <ChessBoard
                pieces={decisionPieces}
                selected={decisionSelected}
                legalTargets={decisionTargets}
                onSquareClick={decisionClick}
                onMoveAttempt={attemptDecisionMove}
                disabled={decisionComplete}
                orientation={currentDecision.orientation}
              />
            </div>

            <aside className="game-panel tutorial-panel">
              <div className="eyebrow">{currentDecision.piece.toUpperCase()} DECISION</div>
              <h2>{currentDecision.title}</h2>
              <p>{currentDecision.question}</p>

              <div className="academy-concept-card">
                <strong>Concept</strong>
                <span>{currentDecision.concept}</span>
              </div>

              <p className={decisionComplete ? "tutorial-feedback success" : "tutorial-feedback"}>
                {decisionMessage}
              </p>

              {decisionComplete ? (
                <>
                  <div className="academy-explanation">
                    <strong>What the opponent wants</strong>
                    <span>{currentDecision.opponentPlan}</span>
                  </div>
                  <div className="academy-explanation">
                    <strong>Take this into your games</strong>
                    <span>{currentDecision.takeaway}</span>
                  </div>
                  <button
                    className="primary-action"
                    onClick={() => chooseDecision((decisionIndex + 1) % ACADEMY_POSITIONS.length)}
                  >
                    Next position
                  </button>
                </>
              ) : (
                <button className="secondary-action" onClick={() => setDecisionMessage(currentDecision.why)}>
                  Explain the plan
                </button>
              )}
            </aside>
          </div>
        </>
      ) : null}

      {lesson === "schools" ? <PieceSchools /> : null}

      {lesson === "responses" ? <OpponentResponseTrainer /> : null}

      {lesson === "openings" ? (
        <>
          <div className="academy-card-picker openings">
            {OPENING_LESSONS.map((opening, index) => (
              <button
                key={opening.id}
                className={index === openingIndex ? "active" : ""}
                onClick={() => chooseOpening(index)}
              >
                <span>{opening.family}</span>
                <strong>{opening.name}</strong>
                <small>{opening.summary}</small>
              </button>
            ))}
          </div>

          <div className="opening-overview">
            <div>
              <strong>The big idea</strong>
              <span>{currentOpening.bigIdea}</span>
            </div>
            <div>
              <strong>Why learn it</strong>
              <span>{currentOpening.whenToUse}</span>
            </div>
          </div>

          <div className="learn-layout">
            <div className="board-shell tutorial-board">
              <ChessBoard
                pieces={openingPieces}
                selected={openingSelected}
                legalTargets={openingTargets}
                onSquareClick={openingClick}
                onMoveAttempt={attemptOpeningMove}
                disabled={openingStepComplete}
                orientation="w"
              />
            </div>

            <aside className="game-panel tutorial-panel">
              <div className="eyebrow">OPENING LAB · STEP {openingStepIndex + 1}/{currentOpening.steps.length}</div>
              <h2>{currentOpeningStep.sanLabel} · {currentOpeningStep.side}</h2>
              <p>{openingMessage}</p>

              <div className="academy-explanation">
                <strong>Purpose of this move</strong>
                <span>{currentOpeningStep.purpose}</span>
              </div>
              <div className="academy-explanation">
                <strong>What the other side is thinking</strong>
                <span>{currentOpeningStep.opponentIdea}</span>
              </div>

              <div className="opening-step-track">
                {currentOpening.steps.map((step, index) => (
                  <button
                    key={`${currentOpening.id}-${index}`}
                    className={index === openingStepIndex ? "active" : index < openingStepIndex ? "complete" : ""}
                    onClick={() => {
                      setOpeningStepIndex(index);
                      setOpeningSelected(null);
                      setOpeningStepComplete(false);
                      setOpeningMessage("Play the move, then connect it to the plan.");
                    }}
                  >
                    {step.sanLabel}
                  </button>
                ))}
              </div>

              <button className="primary-action" disabled={!openingStepComplete} onClick={nextOpeningStep}>
                {openingStepIndex === currentOpening.steps.length - 1 ? "Run opening again" : "Next move"}
              </button>
            </aside>
          </div>

          <div className="academy-note">
            <strong>Opening Lab uses the standard White-first move order.</strong>
            <span>
              Chess Universe still starts with Black. The point here is to learn reusable ideas — center control,
              development, piece coordination, pawn breaks, and king safety — then recognize them from either color.
            </span>
          </div>
        </>
      ) : null}

      {lesson === "strategy" ? (
        <div className="strategy-school">
          <div className="strategy-school-intro">
            <div>
              <div className="eyebrow">STRATEGY SCHOOL</div>
              <h2>Plans tell you where to move. Tactics tell you when it works.</h2>
              <p>
                Strategy improves your position over several moves. Tactics exploit something concrete right now.
                Strong play uses both: build better pieces, then notice the forcing moment.
              </p>
            </div>
            <button className="primary-action" onClick={onPuzzles}>Practice today's puzzle</button>
          </div>

          <div className="strategy-grid">
            {STRATEGY_CARDS.map((card) => (
              <article key={card.title}>
                <span>STRATEGY</span>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </div>

          <div className="strategy-grid tactics">
            {TACTIC_CARDS.map((card) => (
              <article key={card.title}>
                <span>TACTIC</span>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </div>

          <div className="candidate-move-checklist">
            <div className="eyebrow">EVERY POSITION</div>
            <h3>Use this decision loop before you move.</h3>
            <ol>
              <li><strong>Opponent first:</strong> What are they threatening? What changed on their last move?</li>
              <li><strong>Forcing moves:</strong> What checks, captures, and threats do I have?</li>
              <li><strong>Worst piece:</strong> Which of my pieces is doing the least, and what square would improve it?</li>
              <li><strong>King safety:</strong> Are either king's files, diagonals, or escape squares becoming weak?</li>
              <li><strong>Pawn breaks:</strong> Can I change the structure to open a file, diagonal, or outpost?</li>
              <li><strong>Only then move:</strong> Compare your best two candidate moves before committing.</li>
            </ol>
          </div>
        </div>
      ) : null}

      {lesson === "universe" ? (
        <div className="learn-layout">
          <div className="board-shell tutorial-board">
            <ChessBoard
              pieces={universeBoard}
              selected={universeSelected}
              legalTargets={universeSelected === "e7" && !universeComplete ? ["e6", "e5"] : []}
              lastMove={universeComplete ? { from: "e7", to: "e5" } : null}
              onSquareClick={universeClick}
              orientation="b"
            />
          </div>

          <aside className="game-panel tutorial-panel">
            <div className="eyebrow">CHESS UNIVERSE</div>
            <h2>Now flip the opening perspective.</h2>
            <p>
              Standard opening lessons usually begin with White. <strong>Chess Universe begins with Black.</strong>
              The strategic questions stay the same: center, development, king safety, activity, and pawn structure.
            </p>
            <div className="tutorial-tip">
              <strong>Your first Universe move</strong>
              <span>From Black's view, tap the pawn on e7 and move it to e5.</span>
            </div>
            <p className={universeComplete ? "tutorial-feedback success" : "tutorial-feedback"}>
              {universeComplete
                ? "Good. Now ask the real question: what did ...e5 accomplish? It claimed the center and opened Black's queen and bishop."
                : "Make Black's first move, then explain what changed on the board."}
            </p>

            {universeComplete ? (
              <div className="tutorial-finish-actions">
                <button className="primary-action" onClick={onPuzzles}>Puzzle of the Day</button>
                <button className="secondary-action" onClick={onPractice}>Start Practice</button>
                <button className="secondary-action" onClick={onHistory}>Enter Legends</button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
