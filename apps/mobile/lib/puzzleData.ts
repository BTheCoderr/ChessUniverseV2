/**
 * Generated from ../../src/lib/puzzles.ts (website OFFLINE_PUZZLES).
 * Do not edit directly. Regenerate: node scripts/sync-mobile-puzzles.mjs
 */
export type WebPuzzle = {
  id: string;
  title: string;
  level: string;
  theme: string;
  fen: string;
  /** UCI, e.g. "e2e4" or "a7a8q" */
  solution: string;
  goal: string;
  hint: string;
  explanation: string;
  takeaway: string;
  mistakeLesson: string;
  expectsMate: boolean;
};

export const WEB_PUZZLES: WebPuzzle[] = [
  {
    "id": "queen-mate-white",
    "title": "Close the Net",
    "level": "Starter",
    "theme": "Checkmate",
    "fen": "6k1/8/6KQ/8/8/8/8/8 w - - 0 1",
    "solution": "h6g7",
    "goal": "White to move. Find checkmate in one.",
    "hint": "Bring the queen next to the king where your own king protects her.",
    "explanation": "Qg7# works because the queen covers every escape square and the king on g6 protects the queen.",
    "takeaway": "A queen mates best when the king or another piece protects the queen's checking square.",
    "mistakeLesson": "A quiet move gives Black another turn and loses the forced mate. When the king is boxed in, check forcing moves before improving anything else.",
    "expectsMate": true
  },
  {
    "id": "queen-mate-black",
    "title": "Black Strikes",
    "level": "Starter",
    "theme": "Checkmate",
    "fen": "8/8/8/8/8/6kq/8/6K1 b - - 0 1",
    "solution": "h3g2",
    "goal": "Black to move. Find checkmate in one.",
    "hint": "The black king can protect the queen on the second rank.",
    "explanation": "Qg2# checks the king on g1 while Black's king on g3 protects the queen.",
    "takeaway": "Solve tactics from both colors. The pattern matters more than which side owns the pieces.",
    "mistakeLesson": "Black has mate now. Any slower queen move gives White a chance to escape the mating net, so calculate checks before making a non-forcing move.",
    "expectsMate": true
  },
  {
    "id": "win-the-queen",
    "title": "Take the Gift",
    "level": "Starter",
    "theme": "Bishop",
    "fen": "4k3/8/8/3q4/2B5/8/8/4K3 w - - 0 1",
    "solution": "c4d5",
    "goal": "White to move. Win the hanging queen.",
    "hint": "Look at the bishop on c4.",
    "explanation": "Bxd5 simply captures the undefended queen. Tactics begin with checking whether an enemy piece is actually protected.",
    "takeaway": "Before calculating something fancy, scan for loose pieces.",
    "mistakeLesson": "The queen on d5 is hanging right now. A move that does not capture it gives Black a chance to save the most valuable piece on the board.",
    "expectsMate": false
  },
  {
    "id": "promotion",
    "title": "New Queen",
    "level": "Starter",
    "theme": "Promotion",
    "fen": "7k/P7/8/8/8/8/8/4K3 w - - 0 1",
    "solution": "a7a8q",
    "goal": "White to move. Promote the pawn to a queen.",
    "hint": "Push the pawn one more square.",
    "explanation": "a8=Q turns the pawn into a queen. Passed pawns become tactical threats when they get this close.",
    "takeaway": "A passed pawn on the seventh rank can be worth more than its normal pawn value.",
    "mistakeLesson": "The pawn is one step from promotion. Any move that delays a8=Q wastes the immediate chance to turn a pawn into a decisive material advantage.",
    "expectsMate": false
  },
  {
    "id": "rook-wins-queen",
    "title": "Save the Rook",
    "level": "Starter",
    "theme": "Defense",
    "fen": "r6k/8/8/3Q4/8/8/8/6K1 b - - 0 1",
    "solution": "a8b8",
    "goal": "Black to move. White's queen attacks your rook on a8. Save the rook before looking for counterplay.",
    "hint": "Step off the d5-c6-b7-a8 diagonal onto a square the queen does not control.",
    "explanation": "Rb8 moves the rook off the queen's diagonal and keeps the material balance intact. This is a defensive win: first remove the immediate threat.",
    "takeaway": "Defense is a move too. Before attacking, scan which of your pieces are under direct attack and solve the most urgent threat.",
    "mistakeLesson": "White's queen is already attacking the rook on a8. Any move that leaves the rook on that diagonal—or moves it onto another square the queen can immediately capture—loses material.",
    "expectsMate": false
  },
  {
    "id": "black-block-the-rook",
    "title": "Black Blocks the File",
    "level": "Starter",
    "theme": "Defense",
    "fen": "4k3/8/3b4/8/8/8/8/4R1K1 b - - 0 1",
    "solution": "d6e7",
    "goal": "Black is in check. Block the rook with the bishop.",
    "hint": "The e-file needs one defender between White's rook and your king.",
    "explanation": "Be7 blocks the e-file and answers the check without moving the king. Sliding-piece checks can often be solved by interposing a defender.",
    "takeaway": "When you are in check, first identify whether you can move, capture, or block. Black needs those defensive habits too.",
    "mistakeLesson": "Black must answer the rook check immediately. A move that does not block the e-file, capture the rook, or move the king cannot be played.",
    "expectsMate": false
  },
  {
    "id": "knight-wins-queen",
    "title": "Knight Finds the Queen",
    "level": "Starter",
    "theme": "Knight",
    "fen": "6k1/8/8/4q3/8/5N2/8/6K1 w - - 0 1",
    "solution": "f3e5",
    "goal": "Use the knight's unusual movement to win the queen.",
    "hint": "The knight on f3 can jump to e5.",
    "explanation": "Nxe5 wins the queen. Knights are dangerous because their attack pattern is easy to overlook and cannot be blocked.",
    "takeaway": "When a knight is nearby, scan all eight possible jumps — not just the squares on a straight line.",
    "mistakeLesson": "The queen on e5 is available to the knight right now. A move that does not take it gives Black a chance to move the queen and the tactic disappears.",
    "expectsMate": false
  },
  {
    "id": "block-the-rook",
    "title": "Stop the Check",
    "level": "Easy",
    "theme": "Defense",
    "fen": "k3r3/8/8/8/8/3B4/8/4K3 w - - 0 1",
    "solution": "d3e2",
    "goal": "White is in check. Block the rook with the bishop.",
    "hint": "The e-file needs one defender between the rook and your king.",
    "explanation": "Be2 blocks the rook's line from e8 to e1. Defense is often about changing a line, not running with the king.",
    "takeaway": "When checked by a sliding piece, remember all three answers: move the king, capture the attacker, or block the line.",
    "mistakeLesson": "White is in check, so the move must answer the rook's e-file attack immediately. A move that does not block, capture, or move the king cannot solve the position.",
    "expectsMate": false
  },
  {
    "id": "queen-pressure",
    "title": "Queen Joins the Attack",
    "level": "Easy",
    "theme": "Queen",
    "fen": "6k1/5ppp/8/8/2B5/8/5PPP/3Q2K1 w - - 0 1",
    "solution": "d1h5",
    "goal": "Put the queen where she works with the bishop instead of attacking alone.",
    "hint": "The bishop already looks toward f7. Find a queen square that joins the same kingside pressure.",
    "explanation": "Qh5 coordinates queen and bishop. The queen is strongest when she arrives where another piece already supports the attack.",
    "takeaway": "Queen activity is about coordination, not simply moving the queen closer to the king.",
    "mistakeLesson": "The lesson is coordination: the queen belongs on h5 because the bishop already points toward f7. A different queen move may be legal but does not build the same battery.",
    "expectsMate": false
  },
  {
    "id": "rook-open-file",
    "title": "Activate the Rook",
    "level": "Easy",
    "theme": "Rook",
    "fen": "4k3/pp3ppp/8/8/8/8/PP3PPP/R5K1 w - - 0 1",
    "solution": "a1e1",
    "goal": "Move the rook from the corner onto the open file facing the king.",
    "hint": "Rooks want files without pawns.",
    "explanation": "Re1 activates the rook immediately. A rook trapped behind pawns may be worth five points on paper and almost nothing in practice.",
    "takeaway": "When your rook feels useless, search for an open or half-open file.",
    "mistakeLesson": "The rook is passive on a1. A move that keeps it away from the open e-file misses the chance to activate it with tempo against the king.",
    "expectsMate": false
  },
  {
    "id": "knight-outpost",
    "title": "Build an Outpost",
    "level": "Easy",
    "theme": "Knight",
    "fen": "6k1/pp3ppp/8/8/8/4N3/PP3PPP/6K1 w - - 0 1",
    "solution": "e3d5",
    "goal": "Put the knight on a central square where a pawn cannot easily chase it.",
    "hint": "Knights love permanent central squares.",
    "explanation": "Nd5 creates a strong outpost. A knight can outperform a bishop when it owns a stable central square and the bishop has no useful targets.",
    "takeaway": "Piece value depends on squares. A great knight can be worth more than a bad bishop.",
    "mistakeLesson": "The point is to reach d5, a stable central outpost. Other legal knight moves give up the square quality that makes the knight hard to challenge.",
    "expectsMate": false
  },
  {
    "id": "free-the-bishop",
    "title": "Free Your Own Bishop",
    "level": "Easy",
    "theme": "Bishop",
    "fen": "6k1/pp3ppp/8/8/8/4P3/PP1P1PPP/2B3K1 w - - 0 1",
    "solution": "d2d4",
    "goal": "Your bishop is blocked by your own pawn structure. Fix the structure.",
    "hint": "Sometimes the best piece move is actually a pawn move.",
    "explanation": "d4 clears the c1 bishop's diagonal. A bad bishop is often bad because its own pawns are in its way.",
    "takeaway": "Improve the board around a piece instead of forcing the piece to move through a bad position.",
    "mistakeLesson": "The bishop is not the real problem—the pawn structure is. Moving the bishop around without playing d4 leaves the diagonal blocked by your own pawn.",
    "expectsMate": false
  },
  {
    "id": "back-rank-rook-mate",
    "title": "Back-Rank Door Slams",
    "level": "Easy",
    "theme": "Checkmate",
    "fen": "6k1/5ppp/8/8/8/8/6PP/4R1K1 w - - 0 1",
    "solution": "e1e8",
    "goal": "White to move. Use the boxed-in king to deliver a back-rank mate.",
    "hint": "The pawns on f7, g7, and h7 take away the king's flight squares.",
    "explanation": "Re8# works because the rook controls the entire eighth rank while Black's own pawns remove the escape squares.",
    "takeaway": "Before attacking the king, count its escape squares. A strong back-rank pattern often begins with a king trapped by its own pawns.",
    "mistakeLesson": "The king has no flight square and mate is available immediately. A slower rook move gives Black time to create luft or defend the back rank.",
    "expectsMate": true
  },
  {
    "id": "black-back-rank-rook-mate",
    "title": "Black Owns the Back Rank",
    "level": "Easy",
    "theme": "Checkmate",
    "fen": "4r1k1/8/8/8/8/8/5PPP/6K1 b - - 0 1",
    "solution": "e8e1",
    "goal": "Black to move. Use White's own pawns to finish a back-rank mate.",
    "hint": "White's king has no useful flight square on the first rank.",
    "explanation": "Re1# works because the rook controls the first rank while White's pawns on f2, g2, and h2 seal off the king's escape squares.",
    "takeaway": "Back-rank patterns belong to both colors. Scan the enemy king's escape squares before calculating anything flashy.",
    "mistakeLesson": "Black has a forced mate on the first rank now. A slower rook move throws away the forcing move and gives White time to create an escape square.",
    "expectsMate": true
  },
  {
    "id": "queen-rook-fork",
    "title": "Queen Forks King and Rook",
    "level": "Intermediate",
    "theme": "Fork",
    "fen": "r5k1/8/8/8/8/8/8/3Q2K1 w - - 0 1",
    "solution": "d1d5",
    "goal": "Find a queen move that checks the king and attacks the rook on a8 at the same time.",
    "hint": "Look for a square that lines up with g8 on one diagonal and a8 on another.",
    "explanation": "Qd5+ checks the king along d5-e6-f7-g8 and simultaneously attacks the rook on a8 along d5-c6-b7-a8.",
    "takeaway": "Forks are about move priority: when one target is the king, the opponent must answer the check before saving the second target.",
    "mistakeLesson": "The strength of Qd5+ is that the check forces Black to respond before saving the rook. A move without that forcing check loses the move-order advantage.",
    "expectsMate": false
  },
  {
    "id": "black-queen-rook-fork",
    "title": "Black Queen Double Attack",
    "level": "Intermediate",
    "theme": "Fork",
    "fen": "3q2k1/8/8/8/8/8/8/R5K1 b - - 0 1",
    "solution": "d8d4",
    "goal": "Black to move. Check the king while attacking the rook on a1.",
    "hint": "Find a square that lines up with g1 and a1 at the same time.",
    "explanation": "Qd4+ checks the king on g1 along the diagonal and attacks the rook on a1 along the opposite diagonal. White must answer the check first.",
    "takeaway": "A forcing move can make a second threat impossible to answer. Practice seeing forks from Black's side too.",
    "mistakeLesson": "A move without check lets White save the rook. The point of Qd4+ is that White must respond to the king threat before fixing the material threat.",
    "expectsMate": false
  },
  {
    "id": "open-for-bishops",
    "title": "Open the Board",
    "level": "Intermediate",
    "theme": "Strategy",
    "fen": "6k1/ppp2ppp/2n2n2/8/2B2B2/8/PPPP1PPP/6K1 w - - 0 1",
    "solution": "d2d4",
    "goal": "You own the bishop pair. Change the position so long-range pieces become stronger.",
    "hint": "Open the center.",
    "explanation": "d4 opens lines. Two bishops often become a long-term advantage when the board opens because together they control both color complexes.",
    "takeaway": "Bishop pair versus knight pair is about the position, not a universal rule.",
    "mistakeLesson": "Keeping the center closed favors the knights. The bishop pair needs open lines, so a move that does not challenge the center misses the strategic reason for the position.",
    "expectsMate": false
  },
  {
    "id": "discovered-rook-attack",
    "title": "Move the Pawn, Reveal the Rook",
    "level": "Advanced",
    "theme": "Discovered attack",
    "fen": "3q2k1/8/8/4n3/3P4/8/8/3R2K1 w - - 0 1",
    "solution": "d4e5",
    "goal": "Capture the knight while uncovering the rook's attack on the queen.",
    "hint": "The pawn on d4 is blocking your rook from seeing d8.",
    "explanation": "dxe5 removes the knight and clears the d-file. The rook on d1 now attacks the queen on d8, creating two gains with one pawn move.",
    "takeaway": "A discovered attack happens when one piece moves away and reveals the line of another piece. Always ask what your move uncovers behind it.",
    "mistakeLesson": "The pawn move must both capture the knight and clear the d-file. A move that leaves the d-file blocked fails to reveal the rook's attack on the queen.",
    "expectsMate": false
  },
  {
    "id": "black-discovered-rook-attack",
    "title": "Black Clears the Rook Line",
    "level": "Advanced",
    "theme": "Discovered attack",
    "fen": "3r2k1/8/8/3p4/4N3/8/8/3Q2K1 b - - 0 1",
    "solution": "d5e4",
    "goal": "Black to move. Capture the knight and uncover the rook's attack on White's queen.",
    "hint": "The pawn on d5 is the only thing blocking the rook on d8 from seeing d1.",
    "explanation": "dxe4 wins the knight and clears the d-file. The rook on d8 now attacks White's queen on d1, so one pawn move gains material and creates a new threat.",
    "takeaway": "Discovered attacks are not color-specific. Ask what line opens behind every pawn move, especially when a rook or bishop is waiting behind it.",
    "mistakeLesson": "The training move has two jobs: capture the knight and clear the d-file. A move that does only one of those jobs misses the tactic.",
    "expectsMate": false
  }
];
