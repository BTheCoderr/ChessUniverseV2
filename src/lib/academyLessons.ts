import type { Square } from "chess.js";

export type AcademyPosition = {
  id: string;
  title: string;
  piece: "Queen" | "Rook" | "Bishop pair" | "Knight" | "Bishop" | "King";
  concept: string;
  fen: string;
  expectedMove: string;
  question: string;
  why: string;
  opponentPlan: string;
  takeaway: string;
  orientation: "w" | "b";
};

export const ACADEMY_POSITIONS: AcademyPosition[] = [
  {
    id: "queen-joins-attack",
    title: "Where should the queen join the attack?",
    piece: "Queen",
    concept: "Coordinate pieces instead of sending the queen alone",
    fen: "6k1/5ppp/8/8/2B5/8/5PPP/3Q2K1 w - - 0 1",
    expectedMove: "d1h5",
    question: "Your bishop already points toward f7. Put the queen on a square where the two pieces begin working together.",
    why: "Qh5 connects the queen to the same kingside targets as the bishop. The important lesson is not 'queen out early' — it is that a queen becomes dangerous when another piece already supports the attack.",
    opponentPlan: "Black should look for defensive development, a pawn move such as ...g6 when legal, or a way to remove one attacker so the queen and bishop do not stay coordinated.",
    takeaway: "Before moving your queen, ask: what other piece will she cooperate with on the new square?",
    orientation: "w",
  },
  {
    id: "rook-open-file",
    title: "Why is the rook stuck in the corner?",
    piece: "Rook",
    concept: "Rooks need open files",
    fen: "4k3/pp3ppp/8/8/8/8/PP3PPP/R5K1 w - - 0 1",
    expectedMove: "a1e1",
    question: "The a1 rook has no useful targets. Move it onto the open file facing the enemy king.",
    why: "Re1 activates the rook immediately. Rooks are long-range pieces, but they are often useless behind pawns. Open files and half-open files are their highways.",
    opponentPlan: "Black wants to contest the e-file, move the king away, or place a rook/queen on the file so White cannot own it uncontested.",
    takeaway: "If a rook feels trapped, do not ask how far it can move. Ask which file has no pawn blocking it.",
    orientation: "w",
  },
  {
    id: "bishop-pair-open-board",
    title: "How do you make the bishop pair stronger?",
    piece: "Bishop pair",
    concept: "Open the board for long-range pieces",
    fen: "6k1/ppp2ppp/2n2n2/8/2B2B2/8/PPPP1PPP/6K1 w - - 0 1",
    expectedMove: "d2d4",
    question: "You own both bishops. Change the position so their long-range power matters more.",
    why: "d4 opens central lines. Two bishops are often strongest together because they can control both color complexes at long range, especially when the center is open and targets exist on both wings.",
    opponentPlan: "The knights want closed squares, stable outposts, and pawn chains that block bishop diagonals. Black would rather keep the center locked.",
    takeaway: "Bishop pair versus knight pair is not a fixed value rule. Open boards usually favor bishops; closed boards and outposts often favor knights.",
    orientation: "w",
  },
  {
    id: "knight-outpost",
    title: "When can one knight be better than one bishop?",
    piece: "Knight",
    concept: "A protected outpost can outweigh bishop range",
    fen: "6k1/pp3ppp/8/8/8/4N3/PP3PPP/6K1 w - - 0 1",
    expectedMove: "e3d5",
    question: "Find the central square where the knight cannot be chased by a nearby pawn.",
    why: "Nd5 creates an outpost. A single knight can be better than a bishop when the knight has a permanent central home, the position is closed, or the bishop is restricted by its own pawn structure.",
    opponentPlan: "Black should trade the knight, challenge its support, or change the pawn structure before the outpost becomes permanent.",
    takeaway: "Compare pieces by their squares and targets, not only by the number printed in a beginner value chart.",
    orientation: "w",
  },
  {
    id: "free-the-bishop",
    title: "Your bishop is bad — for now.",
    piece: "Bishop",
    concept: "Fix your own pawn structure before blaming the piece",
    fen: "6k1/pp3ppp/8/8/8/4P3/PP1P1PPP/2B3K1 w - - 0 1",
    expectedMove: "d2d4",
    question: "The c1 bishop is boxed in by its own pawn. Make the pawn move that gives it a future.",
    why: "d4 frees the c1 bishop's diagonal. A 'bad bishop' is often bad because its own pawns sit on the same color squares and block its routes.",
    opponentPlan: "Black may try to close the center again or place pawns on squares that limit the bishop's useful diagonals.",
    takeaway: "Sometimes the best piece move is a pawn move that creates a better square for the piece next turn.",
    orientation: "w",
  },
  {
    id: "king-step-out",
    title: "Do not attack while your king is the target.",
    piece: "King",
    concept: "King safety changes every other plan",
    fen: "4r1k1/8/8/8/8/8/6PP/4K3 w - - 0 1",
    expectedMove: "e1f2",
    question: "The rook controls the e-file. Move the king off the file before thinking about anything else.",
    why: "Kf2 removes the king from the open file. Strategy is hierarchical: when your king is exposed, fixing king safety comes before winning a pawn or improving a distant piece.",
    opponentPlan: "Black wants to keep checks coming and prevent White from coordinating.",
    takeaway: "Before every plan, scan checks against your king. If one file or diagonal is dangerous, leave it before launching your own idea.",
    orientation: "w",
  },
];

export function academyMoveParts(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4],
  };
}
