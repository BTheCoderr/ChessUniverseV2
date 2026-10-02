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

export type PuzzleLevel = "Starter" | "Easy" | "Intermediate" | "Advanced";

export const PUZZLE_LEVELS: PuzzleLevel[] = ["Starter", "Easy", "Intermediate", "Advanced"];

export type Puzzle = {
  id: string;
  title: string;
  level: PuzzleLevel;
  theme: PuzzleTheme;
  fen: string;
  solution: string;
  goal: string;
  hint: string;
  explanation: string;
  opponentIdea: string;
  takeaway: string;
  mistakeLesson: string;
  scanPrompt?: string;
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
    scanPrompt: "Before moving, count every square the Black king can legally escape to.",
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
    scanPrompt: "You are Black. Count White's escape squares before looking for a checking move.",
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
    scanPrompt: "Which enemy piece is attacked right now, and is anything protecting it?",
    mistakeLesson: "The queen on d5 is hanging right now. A move that does not capture it gives Black a chance to save the most valuable piece on the board.",
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
    scanPrompt: "What is the most forcing thing your passed pawn can do immediately?",
    mistakeLesson: "The pawn is one step from promotion. Any move that delays a8=Q wastes the immediate chance to turn a pawn into a decisive material advantage.",
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
    scanPrompt: "You are Black. Which of your pieces is under direct attack before you think about attacking White?",
    mistakeLesson: "White's queen is already attacking the rook on a8. Any move that leaves the rook on that diagonal—or moves it onto another square the queen can immediately capture—loses material.",
  },
  {
    id: "black-block-the-rook",
    title: "Black Blocks the File",
    level: "Starter",
    theme: "Defense",
    fen: "4k3/8/3b4/8/8/8/8/4R1K1 b - - 0 1",
    solution: "d6e7",
    goal: "Black is in check. Block the rook with the bishop.",
    hint: "The e-file needs one defender between White's rook and your king.",
    explanation: "Be7 blocks the e-file and answers the check without moving the king. Sliding-piece checks can often be solved by interposing a defender.",
    opponentIdea: "White's rook wants to keep the e-file open and force the Black king to move.",
    takeaway: "When you are in check, first identify whether you can move, capture, or block. Black needs those defensive habits too.",
    scanPrompt: "You are Black and already in check. Which legal defensive category—move, capture, or block—works here?",
    mistakeLesson: "Black must answer the rook check immediately. A move that does not block the e-file, capture the rook, or move the king cannot be played.",
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
    scanPrompt: "List the knight's legal jumps before choosing a move. Does one land on something valuable?",
    mistakeLesson: "The queen on e5 is available to the knight right now. A move that does not take it gives Black a chance to move the queen and the tactic disappears.",
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
    scanPrompt: "You are in check. Before moving the king, can you interrupt the rook's line instead?",
    mistakeLesson: "White is in check, so the move must answer the rook's e-file attack immediately. A move that does not block, capture, or move the king cannot solve the position.",
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
    scanPrompt: "Which target is your bishop already pressuring, and where can the queen join that same target?",
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
    scanPrompt: "Which file has no pawn traffic, and can your rook occupy it in one move?",
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
    scanPrompt: "Which central square can the knight reach that Black's pawns cannot chase immediately?",
    mistakeLesson: "The point is to reach d5, a stable central outpost. Other legal knight moves give up the square quality that makes the knight hard to challenge.",
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
    scanPrompt: "What is actually blocking your bishop: the opponent, or one of your own pawns?",
    mistakeLesson: "The bishop is not the real problem—the pawn structure is. Moving the bishop around without playing d4 leaves the diagonal blocked by your own pawn.",
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
    scanPrompt: "Count Black's flight squares first. Are its own pawns doing part of your attacking work?",
    mistakeLesson: "The king has no flight square and mate is available immediately. A slower rook move gives Black time to create luft or defend the back rank.",
  },
  {
    id: "black-back-rank-rook-mate",
    title: "Black Owns the Back Rank",
    level: "Easy",
    theme: "Checkmate",
    fen: "4r1k1/8/8/8/8/8/5PPP/6K1 b - - 0 1",
    solution: "e8e1",
    goal: "Black to move. Use White's own pawns to finish a back-rank mate.",
    hint: "White's king has no useful flight square on the first rank.",
    explanation: "Re1# works because the rook controls the first rank while White's pawns on f2, g2, and h2 seal off the king's escape squares.",
    opponentIdea: "White needed to create luft or keep the rook off the first rank before this position appeared.",
    takeaway: "Back-rank patterns belong to both colors. Scan the enemy king's escape squares before calculating anything flashy.",
    expectsMate: true,
    scanPrompt: "You are Black. Which White pawns are trapping their own king, and can your rook exploit that immediately?",
    mistakeLesson: "Black has a forced mate on the first rank now. A slower rook move throws away the forcing move and gives White time to create an escape square.",
  },
  {
    id: "queen-rook-fork",
    title: "Queen Forks King and Rook",
    level: "Intermediate",
    theme: "Fork",
    fen: "r5k1/8/8/8/8/8/8/3Q2K1 w - - 0 1",
    solution: "d1d5",
    goal: "Find a queen move that checks the king and attacks the rook on a8 at the same time.",
    hint: "Look for a square that lines up with g8 on one diagonal and a8 on another.",
    explanation: "Qd5+ checks the king along d5-e6-f7-g8 and simultaneously attacks the rook on a8 along d5-c6-b7-a8.",
    opponentIdea: "Black must answer the check first, which gives White time to win the rook next.",
    takeaway: "Forks are about move priority: when one target is the king, the opponent must answer the check before saving the second target.",
    scanPrompt: "Can one queen move attack two targets if one of those targets is the king?",
    mistakeLesson: "The strength of Qd5+ is that the check forces Black to respond before saving the rook. A move without that forcing check loses the move-order advantage.",
  },
  {
    id: "black-queen-rook-fork",
    title: "Black Queen Double Attack",
    level: "Intermediate",
    theme: "Fork",
    fen: "3q2k1/8/8/8/8/8/8/R5K1 b - - 0 1",
    solution: "d8d4",
    goal: "Black to move. Check the king while attacking the rook on a1.",
    hint: "Find a square that lines up with g1 and a1 at the same time.",
    explanation: "Qd4+ checks the king on g1 along the diagonal and attacks the rook on a1 along the opposite diagonal. White must answer the check first.",
    opponentIdea: "White wants time to move the rook, but the check steals that tempo.",
    takeaway: "A forcing move can make a second threat impossible to answer. Practice seeing forks from Black's side too.",
    scanPrompt: "You are Black. Which queen square creates a check and a second attack at the same time?",
    mistakeLesson: "A move without check lets White save the rook. The point of Qd4+ is that White must respond to the king threat before fixing the material threat.",
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
    scanPrompt: "Which side benefits from an open center here: your bishops or Black's knights?",
    mistakeLesson: "Keeping the center closed favors the knights. The bishop pair needs open lines, so a move that does not challenge the center misses the strategic reason for the position.",
  },
  {
    id: "discovered-rook-attack",
    title: "Move the Pawn, Reveal the Rook",
    level: "Advanced",
    theme: "Discovered attack",
    fen: "3q2k1/8/8/4n3/3P4/8/8/3R2K1 w - - 0 1",
    solution: "d4e5",
    goal: "Capture the knight while uncovering the rook's attack on the queen.",
    hint: "The pawn on d4 is blocking your rook from seeing d8.",
    explanation: "dxe5 removes the knight and clears the d-file. The rook on d1 now attacks the queen on d8, creating two gains with one pawn move.",
    opponentIdea: "Black must react to the newly opened rook line and move the queen before White wins even more material.",
    takeaway: "A discovered attack happens when one piece moves away and reveals the line of another piece. Always ask what your move uncovers behind it.",
    scanPrompt: "If the pawn on d4 moved, what line would suddenly open behind it?",
    mistakeLesson: "The pawn move must both capture the knight and clear the d-file. A move that leaves the d-file blocked fails to reveal the rook's attack on the queen.",
  },
  {
    id: "black-discovered-rook-attack",
    title: "Black Clears the Rook Line",
    level: "Advanced",
    theme: "Discovered attack",
    fen: "3r2k1/8/8/3p4/4N3/8/8/3Q2K1 b - - 0 1",
    solution: "d5e4",
    goal: "Black to move. Capture the knight and uncover the rook's attack on White's queen.",
    hint: "The pawn on d5 is the only thing blocking the rook on d8 from seeing d1.",
    explanation: "dxe4 wins the knight and clears the d-file. The rook on d8 now attacks White's queen on d1, so one pawn move gains material and creates a new threat.",
    opponentIdea: "White must save the queen after losing the knight, which gives Black the initiative.",
    takeaway: "Discovered attacks are not color-specific. Ask what line opens behind every pawn move, especially when a rook or bishop is waiting behind it.",
    scanPrompt: "You are Black. What becomes possible for the rook on d8 if the d5-pawn leaves the file?",
    mistakeLesson: "The training move has two jobs: capture the knight and clear the d-file. A move that does only one of those jobs misses the tactic.",
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

const LEVEL_RANK: Record<PuzzleLevel, number> = {
  Starter: 0,
  Easy: 1,
  Intermediate: 2,
  Advanced: 3,
};

export function puzzleDifficultyRank(level: PuzzleLevel) {
  return LEVEL_RANK[level];
}

export function puzzleScanPrompt(puzzle: Puzzle) {
  if (puzzle.scanPrompt) return puzzle.scanPrompt;
  if (puzzle.theme === "Defense") return "What is the opponent threatening right now, and what must you solve first?";
  if (puzzle.theme === "Checkmate") return "Count checks, captures, and the enemy king's escape squares before choosing a move.";
  if (puzzle.theme === "Strategy") return "Which piece or pawn structure is limiting your position, and what move changes that?";
  return "Before calculating, scan checks, captures, threats, and loose pieces for both sides.";
}

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

    if (before.inCheck()) {
      return `${made.san} does not solve the check in the way this lesson is training. ${puzzle.mistakeLesson}`;
    }

    if (solutionMove.captured && !made.captured) {
      return `${made.san} is legal, but it misses the immediate chance to win the ${PIECE_NAMES[solutionMove.captured] ?? "piece"} on ${solutionMove.to}. ${puzzle.mistakeLesson}`;
    }

    if (solutionMove.san.includes("+") && !made.san.includes("+")) {
      return `${made.san} is legal, but it gives up the forcing check that makes the tactic work. ${puzzle.mistakeLesson}`;
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

export function puzzleSideLabel(puzzle: Puzzle) {
  return puzzleOrientation(puzzle) === "b" ? "Black to move" : "White to move";
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
