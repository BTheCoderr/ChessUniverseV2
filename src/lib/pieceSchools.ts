import type { Square } from "chess.js";

export const PIECE_SCHOOL_PROGRESS_KEY = "chess-universe-piece-schools-v1";

export type PieceSchoolLesson = {
  id: string;
  title: string;
  concept: string;
  fen: string;
  expectedMove: string;
  prompt: string;
  why: string;
  opponentPlan: string;
  takeaway: string;
  orientation: "w" | "b";
};

export type PieceSchool = {
  id: "queen" | "rook" | "bishop" | "knight";
  name: string;
  icon: string;
  summary: string;
  question: string;
  lessons: PieceSchoolLesson[];
};

export const PIECE_SCHOOLS: PieceSchool[] = [
  {
    id: "queen",
    name: "Queen School",
    icon: "♛",
    summary: "Coordinate the queen, centralize her when it is safe, and know when a queen trade helps you.",
    question: "Where should my queen go, and what piece will she work with when she gets there?",
    lessons: [
      {
        id: "queen-coordinate",
        title: "Join the attack",
        concept: "Coordination beats solo queen raids",
        fen: "6k1/5ppp/8/8/2B5/8/5PPP/3Q2K1 w - - 0 1",
        expectedMove: "d1h5",
        prompt: "Your bishop already aims at the kingside. Place the queen where the two pieces work together.",
        why: "Qh5 creates a queen-and-bishop battery. The queen is not strong because she moved closer to the king; she is strong because another piece already supports the same targets.",
        opponentPlan: "Black wants to break the battery, gain a tempo on the queen, or add defenders before the attack becomes forcing.",
        takeaway: "Before moving the queen, name the piece or pawn she will coordinate with.",
        orientation: "w",
      },
      {
        id: "queen-centralize",
        title: "Central queen, wider reach",
        concept: "A safe central queen can influence both wings",
        fen: "6k1/7p/8/8/8/8/3Q2PP/6K1 w - - 0 1",
        expectedMove: "d2d5",
        prompt: "No enemy minor pieces can harass the queen. Put her on a central square that reaches both sides.",
        why: "Qd5 centralizes the queen and creates long-range influence across ranks, files, and diagonals. Centralization is powerful only when the opponent cannot gain tempos by attacking her.",
        opponentPlan: "Black wants to develop a piece with tempo against the queen or move the king away from lines she controls.",
        takeaway: "Centralize the queen when it increases targets without making her a tempo target.",
        orientation: "w",
      },
      {
        id: "queen-trade",
        title: "Simplify when it helps you",
        concept: "Queen trades can reduce counterplay",
        fen: "3q2k1/8/8/8/8/8/3Q2PP/6K1 w - - 0 1",
        expectedMove: "d2d8",
        prompt: "The queens face each other on an open file. Remove the opponent's biggest source of counterplay.",
        why: "Qxd8+ trades queens immediately. When your plan benefits from a calmer position, removing the opponent's queen can be stronger than searching for another attack.",
        opponentPlan: "The defending side wants to keep queens when checks and perpetual threats are its best source of activity.",
        takeaway: "Do not treat queen trades as automatically good or bad. Ask whose counterplay disappears.",
        orientation: "w",
      },
    ],
  },
  {
    id: "rook",
    name: "Rook School",
    icon: "♜",
    summary: "Escape the corner, occupy open files, invade the seventh rank, and support passed pawns from behind.",
    question: "What file or rank gives this rook something real to attack?",
    lessons: [
      {
        id: "rook-open-file",
        title: "Escape the corner",
        concept: "Open files are rook highways",
        fen: "4k3/pp3ppp/8/8/8/8/PP3PPP/R5K1 w - - 0 1",
        expectedMove: "a1e1",
        prompt: "Your rook has no useful targets on a1. Find the open file facing the enemy king.",
        why: "Re1 immediately changes the rook from a spectator into a piece that controls an entire file.",
        opponentPlan: "Black wants to contest the e-file, block it, or move the king away before the rook invades.",
        takeaway: "If a rook is stuck, search for an open or half-open file before looking for a random rook move.",
        orientation: "w",
      },
      {
        id: "rook-seventh",
        title: "Invade the seventh",
        concept: "The seventh rank attacks pawns and traps kings",
        fen: "6k1/pp3ppp/8/8/8/8/PP3PPP/4R1K1 w - - 0 1",
        expectedMove: "e1e7",
        prompt: "The e-file is clear. Put the rook where it attacks the pawns from the side and cuts the king.",
        why: "Re7 places the rook on the seventh rank, where enemy pawns often live and the king has fewer useful squares.",
        opponentPlan: "Black wants to chase the rook, trade it, or activate a rook of its own before White collects pawns.",
        takeaway: "An open file is often the road; the seventh rank is the destination.",
        orientation: "w",
      },
      {
        id: "rook-behind-pawn",
        title: "Get behind the passer",
        concept: "Rooks support passed pawns best from behind",
        fen: "6k1/8/8/3P4/8/8/8/R5K1 w - - 0 1",
        expectedMove: "a1d1",
        prompt: "Your passed pawn is on d5. Put the rook where every pawn push keeps the rook supporting it.",
        why: "Rd1 gets behind the passed pawn. As the pawn advances up the d-file, the rook continues protecting it without needing to move again.",
        opponentPlan: "The defending king wants to get in front of the pawn while the rook is still passive.",
        takeaway: "Passed pawn plus rook: think 'rook behind the passer' before pushing automatically.",
        orientation: "w",
      },
    ],
  },
  {
    id: "bishop",
    name: "Bishop School",
    icon: "♝",
    summary: "Open diagonals, understand the bishop pair, and fix pawn structures that imprison your own bishop.",
    question: "Which diagonal does this bishop want, and what is blocking it?",
    lessons: [
      {
        id: "bishop-free",
        title: "Free the bad bishop",
        concept: "Sometimes the piece is fine and the pawn structure is the problem",
        fen: "6k1/pp3ppp/8/8/8/4P3/PP1P1PPP/2B3K1 w - - 0 1",
        expectedMove: "d2d4",
        prompt: "Your c1 bishop is boxed in by its own pawn. Fix the board around the bishop.",
        why: "d4 opens the c1 bishop's diagonal. Improving a piece often starts with moving the pawn that restricts it.",
        opponentPlan: "Black wants to keep the center closed and make the bishop stare into its own pawns.",
        takeaway: "Before calling a bishop bad, identify which pawn move would create a useful diagonal.",
        orientation: "w",
      },
      {
        id: "bishop-diagonal",
        title: "Use the full diagonal",
        concept: "Bishops gain value when they see across the board",
        fen: "6k1/7p/8/8/8/8/6PP/2B3K1 w - - 0 1",
        expectedMove: "c1h6",
        prompt: "The long diagonal is completely open. Put the bishop deep into the enemy kingside.",
        why: "Bh6 uses the bishop's range to enter the kingside immediately. Bishops do not need to be physically close to a target when the diagonal is open.",
        opponentPlan: "Black wants to block the diagonal or trade the bishop before it creates a mating net.",
        takeaway: "When a diagonal opens, scan its entire length — not just the next safe square.",
        orientation: "w",
      },
      {
        id: "bishop-pair",
        title: "Make two bishops matter",
        concept: "Open boards amplify the bishop pair",
        fen: "6k1/ppp2ppp/2n2n2/8/2B2B2/8/PPPP1PPP/6K1 w - - 0 1",
        expectedMove: "d2d4",
        prompt: "You own both bishops. Change the pawn structure so long-range pieces become stronger.",
        why: "d4 opens central lines. The bishop pair becomes most powerful when both color complexes and both wings can be reached.",
        opponentPlan: "The knights prefer a closed board with stable outposts and blocked diagonals.",
        takeaway: "The bishop pair is a positional advantage when the board can be opened for it.",
        orientation: "w",
      },
    ],
  },
  {
    id: "knight",
    name: "Knight School",
    icon: "♞",
    summary: "Find outposts, jump into tactical squares, and reroute knights that started on the rim.",
    question: "Which square makes this knight permanent, dangerous, or hard to chase?",
    lessons: [
      {
        id: "knight-outpost",
        title: "Own the outpost",
        concept: "A protected central square can make a knight better than a bishop",
        fen: "6k1/pp3ppp/8/8/8/4N3/PP3PPP/6K1 w - - 0 1",
        expectedMove: "e3d5",
        prompt: "Find the central square where nearby pawns cannot chase the knight.",
        why: "Nd5 creates an outpost. A knight with a permanent central home can outperform a bishop whose diagonals have no targets.",
        opponentPlan: "Black wants to trade the knight or undermine whatever protects d5.",
        takeaway: "Compare a knight and bishop by future squares, not by a fixed value chart.",
        orientation: "w",
      },
      {
        id: "knight-tactical-jump",
        title: "See the knight jump",
        concept: "Knight attacks cannot be blocked",
        fen: "6k1/8/8/4q3/8/5N2/8/6K1 w - - 0 1",
        expectedMove: "f3e5",
        prompt: "The queen looks safe from straight-line pieces. Find the knight jump that wins it.",
        why: "Nxe5 wins the queen. A knight's attack can appear suddenly because no piece can block the jump.",
        opponentPlan: "Black needed to scan all of the knight's destination squares before placing the queen on e5.",
        takeaway: "Around a knight, calculate the full L-shaped attack map before assuming a piece is safe.",
        orientation: "w",
      },
      {
        id: "knight-reroute",
        title: "Reroute from the rim",
        concept: "A knight improves by finding a route toward central squares",
        fen: "6k1/8/8/8/8/N7/6PP/6K1 w - - 0 1",
        expectedMove: "a3c4",
        prompt: "Your knight on a3 controls very little. Start the route back toward the center.",
        why: "Nc4 immediately increases the knight's influence and gives it access to central squares on the next move.",
        opponentPlan: "Black wants to keep the knight on the edge where it attacks fewer important squares.",
        takeaway: "When a knight is bad, plan a route of two or three jumps instead of waiting for a tactic.",
        orientation: "w",
      },
    ],
  },
];

export function pieceSchoolMoveParts(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4],
  };
}

export function normalizePieceSchoolProgress(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const known = new Set(PIECE_SCHOOLS.flatMap((school) => school.lessons.map((lesson) => lesson.id)));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
}
