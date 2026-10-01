import { Chess, type Color, type Move, type Square } from "chess.js";

export const PUZZLE_PROGRESS_KEY = "chess-universe-puzzles-v1";

export type PuzzleTheme =
  | "Queen"
  | "Rook"
  | "Bishop"
  | "Knight"
  | "Defense"
  | "Checkmate"
  | "Promotion"
  | "Strategy"
  | "Fork"
  | "Discovered attack";

export type Puzzle = {
  id: string;
  title: string;
  level: "Starter" | "Easy" | "Intermediate";
  theme: PuzzleTheme;
  fen: string;
  solution: string;
  goal: string;
  hint: string;
  explanation: string;
  opponentIdea: string;
  takeaway: string;
  mistakeLesson: string;
  expectsMate?: boolean;
};

export const OFFLINE_PUZZLES: Puzzle[] = [
  {
    id: "queen-mate-white",
    title: "Close the Net",
    level: "Starter",
    theme: "Checkmate",
    fen: "6k1/8/6KQ/8/8/8/8/8 w - - 0 1",
    solution: "h6g7",
    goal: "White to move. Find checkmate in one.",
    hint: "Bring the queen next to the king where your own king protects her.",
    explanation: "Qg7# works because the queen covers every escape square and the king on g6 protects the queen.",
    opponentIdea: "Black's only hope before this position would have been to keep checking distance or trade queens before the king was boxed in.",
    takeaway: "A queen mates best when the king or another piece protects the queen's checking square.",
    expectsMate: true,
    mistakeLesson: "A quiet move gives Black another turn and loses the forced mate. When the king is boxed in, check forcing moves before improving anything else.",
  },
  {
    id: "queen-mate-black",
    title: "Black Strikes",
    level: "Starter",
    theme: "Checkmate",
    fen: "8/8/8/8/8/6kq/8/6K1 b - - 0 1",
    solution: "h3g2",
    goal: "Black to move. Find checkmate in one.",
    hint: "The black king can protect the queen on the second rank.",
    explanation: "Qg2# checks the king on g1 while Black's king on g3 protects the queen.",
    opponentIdea: "White needed more space around the king before the mating net was complete.",
    takeaway: "Solve tactics from both colors. The pattern matters more than which side owns the pieces.",
    expectsMate: true,
    mistakeLesson: "Black has mate now. Any slower queen move gives White a chance to escape the mating net, so calculate checks before making a non-forcing move.",
  },
  {
    id: "win-the-queen",
    title: "Take the Gift",
    level: "Starter",
    theme: "Bishop",
    fen: "4k3/8/8/3q4/2B5/8/8/4K3 w - - 0 1",
    solution: "c4d5",
    goal: "White to move. Win the hanging queen.",
    hint: "Look at the bishop on c4.",
    explanation: "Bxd5 simply captures the undefended queen. Tactics begin with checking whether an enemy piece is actually protected.",
    opponentIdea: "Black should have moved or defended the queen before making another plan.",
    takeaway: "Before calculating something fancy, scan for loose pieces.",
    mistakeLesson: "The queen on d5 is hanging right now. A move that does not capture it gives Black a chance to save the most valuable piece on the board.",
  },
  {
    id: "block-the-rook",
    title: "Stop the Check",
    level: "Easy",
    theme: "Defense",
    fen: "k3r3/8/8/8/8/3B4/8/4K3 w - - 0 1",
    solution: "d3e2",
    goal: "White is in check. Block the rook with the bishop.",
    hint: "The e-file needs one defender between the rook and your king.",
    explanation: "Be2 blocks the rook's line from e8 to e1. Defense is often about changing a line, not running with the king.",
    opponentIdea: "Black's rook wants to stay on the open e-file and keep the king tied down.",
    takeaway: "When checked by a sliding piece, remember all three answers: move the king, capture the attacker, or block the line.",
    mistakeLesson: "White is in check, so the move must answer the rook's e-file attack immediately. A move that does not block, capture, or move the king cannot solve the position.",
  },
  {
    id: "promotion",
    title: "New Queen",
    level: "Starter",
    theme: "Promotion",
    fen: "7k/P7/8/8/8/8/8/4K3 w - - 0 1",
    solution: "a7a8q",
    goal: "White to move. Promote the pawn to a queen.",
    hint: "Push the pawn one more square.",
    explanation: "a8=Q turns the pawn into a queen. Passed pawns become tactical threats when they get this close.",
    opponentIdea: "Black needed to get the king in front of the pawn earlier.",
    takeaway: "A passed pawn on the seventh rank can be worth more than its normal pawn value.",
    mistakeLesson: "The pawn is one step from promotion. Any move that delays a8=Q wastes the immediate chance to turn a pawn into a decisive material advantage.",
  },
  {
    id: "queen-pressure",
    title: "Queen Joins the Attack",
    level: "Easy",
    theme: "Queen",
    fen: "6k1/5ppp/8/8/2B5/8/5PPP/3Q2K1 w - - 0 1",
    solution: "d1h5",
    goal: "Put the queen where she works with the bishop instead of attacking alone.",
    hint: "The bishop already looks toward f7. Find a queen square that joins the same kingside pressure.",
    explanation: "Qh5 coordinates queen and bishop. The queen is strongest when she arrives where another piece already supports the attack.",
    opponentIdea: "Black should look for development, queen harassment, or a defensive pawn move that breaks the battery.",
    takeaway: "Queen activity is about coordination, not simply moving the queen closer to the king.",
    mistakeLesson: "The lesson is coordination: the queen belongs on h5 because the bishop already points toward f7. A different queen move may be legal but does not build the same battery.",
  },
  {
    id: "rook-open-file",
    title: "Activate the Rook",
    level: "Easy",
    theme: "Rook",
    fen: "4k3/pp3ppp/8/8/8/8/PP3PPP/R5K1 w - - 0 1",
    solution: "a1e1",
    goal: "Move the rook from the corner onto the open file facing the king.",
    hint: "Rooks want files without pawns.",
    explanation: "Re1 activates the rook immediately. A rook trapped behind pawns may be worth five points on paper and almost nothing in practice.",
    opponentIdea: "Black should contest the e-file or move the king before the rook controls the position.",
    takeaway: "When your rook feels useless, search for an open or half-open file.",
    mistakeLesson: "The rook is passive on a1. A move that keeps it away from the open e-file misses the chance to activate it with tempo against the king.",
  },
  {
    id: "knight-outpost",
    title: "Build an Outpost",
    level: "Easy",
    theme: "Knight",
    fen: "6k1/pp3ppp/8/8/8/4N3/PP3PPP/6K1 w - - 0 1",
    solution: "e3d5",
    goal: "Put the knight on a central square where a pawn cannot easily chase it.",
    hint: "Knights love permanent central squares.",
    explanation: "Nd5 creates a strong outpost. A knight can outperform a bishop when it owns a stable central square and the bishop has no useful targets.",
    opponentIdea: "Black should trade the knight, challenge its support, or change the pawn structure before the outpost becomes permanent.",
    takeaway: "Piece value depends on squares. A great knight can be worth more than a bad bishop.",
    mistakeLesson: "The point is to reach d5, a stable central outpost. Other legal knight moves give up the square quality that makes the knight hard to challenge.",
  },
  {
    id: "open-for-bishops",
    title: "Open the Board",
    level: "Intermediate",
    theme: "Strategy",
    fen: "6k1/ppp2ppp/2n2n2/8/2B2B2/8/PPPP1PPP/6K1 w - - 0 1",
    solution: "d2d4",
    goal: "You own the bishop pair. Change the position so long-range pieces become stronger.",
    hint: "Open the center.",
    explanation: "d4 opens lines. Two bishops often become a long-term advantage when the board opens because together they control both color complexes.",
    opponentIdea: "The knights want a closed center and stable outposts where bishop range matters less.",
    takeaway: "Bishop pair versus knight pair is about the position, not a universal rule.",
    mistakeLesson: "Keeping the center closed favors the knights. The bishop pair needs open lines, so a move that does not challenge the center misses the strategic reason for the position.",
  },
  {
    id: "free-the-bishop",
    title: "Free Your Own Bishop",
    level: "Easy",
    theme: "Bishop",
    fen: "6k1/pp3ppp/8/8/8/4P3/PP1P1PPP/2B3K1 w - - 0 1",
    solution: "d2d4",
    goal: "Your bishop is blocked by your own pawn structure. Fix the structure.",
    hint: "Sometimes the best piece move is actually a pawn move.",
    explanation: "d4 clears the c1 bishop's diagonal. A bad bishop is often bad because its own pawns are in its way.",
    opponentIdea: "Black would like to close the center again and keep the bishop restricted.",
    takeaway: "Improve the board around a piece instead of forcing the piece to move through a bad position.",
    mistakeLesson: "The bishop is not the real problem—the pawn structure is. Moving the bishop around without playing d4 leaves the diagonal blocked by your own pawn.",
  },
  {
    id: "rook-wins-queen",
    title: "Save the Rook",
    level: "Starter",
    theme: "Defense",
    fen: "r6k/8/8/3Q4/8/8/8/6K1 b - - 0 1",
    solution: "a8b8",
    goal: "Black to move. White's queen attacks your rook on a8. Save the rook before looking for counterplay.",
    hint: "Step off the d5-c6-b7-a8 diagonal onto a square the queen does not control.",
    explanation: "Rb8 moves the rook off the queen's diagonal and keeps the material balance intact. This is a defensive win: first remove the immediate threat.",
    opponentIdea: "White's queen on d5 attacks a8. If Black ignores the threat, Qxa8 wins the rook.",
    takeaway: "Defense is a move too. Before attacking, scan which of your pieces are under direct attack and solve the most urgent threat.",
    mistakeLesson: "White's queen is already attacking the rook on a8. Any move that leaves the rook on that diagonal—or moves it onto another square the queen can immediately capture—loses material.",
  },
  {
    id: "knight-wins-queen",
    title: "Knight Finds the Queen",
    level: "Starter",
    theme: "Knight",
    fen: "6k1/8/8/4q3/8/5N2/8/6K1 w - - 0 1",
    solution: "f3e5",
    goal: "Use the knight's unusual movement to win the queen.",
    hint: "The knight on f3 can jump to e5.",
    explanation: "Nxe5 wins the queen. Knights are dangerous because their attack pattern is easy to overlook and cannot be blocked.",
    opponentIdea: "Black should track every knight jump before placing a valuable piece on a forkable or capturable square.",
    takeaway: "When a knight is nearby, scan all eight possible jumps — not just the squares on a straight line.",
    mistakeLesson: "The queen on e5 is available to the knight right now. A move that does not take it gives Black a chance to move the queen and the tactic disappears.",
  },
  {
    id: "back-rank-rook-mate",
    title: "Back-Rank Door Slams",
    level: "Easy",
    theme: "Checkmate",
    fen: "6k1/5ppp/8/8/8/8/6PP/4R1K1 w - - 0 1",
    solution: "e1e8",
    goal: "White to move. Use the boxed-in king to deliver a back-rank mate.",
    hint: "The pawns on f7, g7, and h7 take away the king's flight squares.",
    explanation: "Re8# works because the rook controls the entire eighth rank while Black's own pawns remove the escape squares.",
    opponentIdea: "Black needed luft — an escape square such as ...h6 or ...g6 — before allowing a rook onto the back rank.",
    takeaway: "Before attacking the king, count its escape squares. A strong back-rank pattern often begins with a king trapped by its own pawns.",
    expectsMate: true,
    mistakeLesson: "The king has no flight square and mate is available immediately. A slower rook move gives Black time to create luft or defend the back rank.",
  },
  {
    id: "queen-rook-fork",
    title: "Queen Forks King and Rook",
    level: "Easy",
    theme: "Fork",
    fen: "r5k1/8/8/8/8/8/8/3Q2K1 w - - 0 1",
    solution: "d1d5",
    goal: "Find a queen move that checks the king and attacks the rook on a8 at the same time.",
    hint: "Look for a square that lines up with g8 on one diagonal and a8 on another.",
    explanation: "Qd5+ checks the king along d5-e6-f7-g8 and simultaneously attacks the rook on a8 along d5-c6-b7-a8.",
    opponentIdea: "Black must answer the check first, which gives White time to win the rook next.",
    takeaway: "Forks are about move priority: when one target is the king, the opponent must answer the check before saving the second target.",
    mistakeLesson: "The strength of Qd5+ is that the check forces Black to respond before saving the rook. A move without that forcing check loses the move-order advantage.",
  },
  {
    id: "discovered-rook-attack",
    title: "Move the Pawn, Reveal the Rook",
    level: "Intermediate",
    theme: "Discovered attack",
    fen: "3q2k1/8/8/4n3/3P4/8/8/3R2K1 w - - 0 1",
    solution: "d4e5",
    goal: "Capture the knight while uncovering the rook's attack on the queen.",
    hint: "The pawn on d4 is blocking your rook from seeing d8.",
    explanation: "dxe5 removes the knight and clears the d-file. The rook on d1 now attacks the queen on d8, creating two gains with one pawn move.",
    opponentIdea: "Black must react to the newly opened rook line and move the queen before White wins even more material.",
    takeaway: "A discovered attack happens when one piece moves away and reveals the line of another piece. Always ask what your move uncovers behind it.",
    mistakeLesson: "The pawn move must both capture the knight and clear the d-file. A move that leaves the d-file blocked fails to reveal the rook's attack on the queen.",
  },
];

const PIECE_NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export function explainWrongPuzzleMove(
  puzzle: Puzzle,
  before: Chess,
  after: Chess,
  made: Move
) {
  const movedType = made.promotion ?? made.piece;
  const captureReply = after
    .moves({ verbose: true })
    .find((reply) => reply.to === made.to && reply.captured === movedType);

  if (captureReply) {
    return `${made.san} is legal, but ${captureReply.san} can immediately take your ${PIECE_NAMES[movedType] ?? "piece"} on ${made.to}. ${puzzle.mistakeLesson}`;
  }

  try {
    const solutionPosition = new Chess(before.fen());
    const solutionMove = solutionPosition.move({
      from: puzzle.solution.slice(0, 2),
      to: puzzle.solution.slice(2, 4),
      ...(puzzle.solution[4] ? { promotion: puzzle.solution[4] } : {}),
    });

    if (puzzle.expectsMate && solutionPosition.isCheckmate()) {
      return `${made.san} is legal, but it gives up a forced mate. ${puzzle.mistakeLesson}`;
    }

    if (solutionMove.captured && !made.captured) {
      return `${made.san} is legal, but it misses the immediate chance to win the ${PIECE_NAMES[solutionMove.captured] ?? "piece"} on ${solutionMove.to}. ${puzzle.mistakeLesson}`;
    }
  } catch {
    // Curated solutions are validated in the puzzle test suite.
  }

  return `${made.san} is legal, but it does not solve the position's main problem. ${puzzle.mistakeLesson}`;
}

export function puzzlePosition(puzzle: Puzzle) {
  return new Chess(puzzle.fen);
}

export function puzzleOrientation(puzzle: Puzzle): Color {
  return puzzlePosition(puzzle).turn();
}

export function puzzleMoveUci(from: Square, to: Square, promotion?: string) {
  return `${from}${to}${promotion ?? ""}`;
}

export function dailyPuzzleIndex(date = new Date()) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
  return ((dayNumber % OFFLINE_PUZZLES.length) + OFFLINE_PUZZLES.length) % OFFLINE_PUZZLES.length;
}

export function dailyPuzzle(date = new Date()) {
  return OFFLINE_PUZZLES[dailyPuzzleIndex(date)];
}

export function normalizePuzzleProgress(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const known = new Set(OFFLINE_PUZZLES.map((puzzle) => puzzle.id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
}
