import type { Square } from "chess.js";

export const ENDGAME_PROGRESS_KEY = "chess-universe-endgames-v1";

export type EndgameLesson = {
  id: string;
  title: string;
  theme: string;
  fen: string;
  expectedMove: string;
  prompt: string;
  principle: string;
  why: string;
  mistakeLesson: string;
  opponentPlan: string;
  takeaway: string;
  orientation: "w" | "b";
};

export const ENDGAME_LESSONS: EndgameLesson[] = [
  {
    id: "endgame-opposition",
    title: "Take the opposition",
    theme: "King + pawn",
    fen: "8/8/4k3/8/4K3/8/4P3/8 w - - 0 1",
    expectedMove: "e4d4",
    prompt: "Both kings are fighting for the same central squares. Step to the square that keeps the enemy king from advancing.",
    principle: "Opposition",
    why: "Kd4 keeps the kings facing each other with one square between them. That opposition forces Black to give ground before your pawn advances.",
    mistakeLesson: "Pushing the pawn too early gives up the king battle. In king-and-pawn endings, improve the king first when you can win the opposition.",
    opponentPlan: "Black wants your king to step aside so its king can occupy the key square in front of the pawn.",
    takeaway: "In simple pawn endings, the king is the main piece. Win the king position before racing the pawn.",
    orientation: "w",
  },
  {
    id: "endgame-key-square",
    title: "King before pawn",
    theme: "King + pawn",
    fen: "8/8/8/4k3/8/4K3/4P3/8 w - - 0 1",
    expectedMove: "e3d3",
    prompt: "Do not rush e4. Move the king toward the key squares that will escort the pawn.",
    principle: "Key squares",
    why: "Kd3 improves the king first. The king must get in front of or beside the pawn so the pawn can advance without being blockaded.",
    mistakeLesson: "A pawn push can feel active but actually make the ending harder if your king is behind it. Passed pawns need king support.",
    opponentPlan: "Black wants to blockade from the front and force your pawn to move without enough support.",
    takeaway: "A passed pawn is strongest when your king leads it rather than follows it.",
    orientation: "w",
  },
  {
    id: "endgame-rook-behind",
    title: "Rook behind the passer",
    theme: "Rook ending",
    fen: "6k1/8/8/3P4/8/8/8/R5K1 w - - 0 1",
    expectedMove: "a1d1",
    prompt: "Place the rook so every future pawn push stays protected.",
    principle: "Rook activity",
    why: "Rd1 gets behind the passed pawn. As the pawn advances, the rook keeps supporting it along the same file.",
    mistakeLesson: "Pushing immediately is less precise because the rook remains passive. Improve the rook first, then use the passed pawn.",
    opponentPlan: "The defending king wants to get in front of the pawn while your rook is still doing nothing.",
    takeaway: "Rooks belong behind passed pawns — yours or your opponent's.",
    orientation: "w",
  },
  {
    id: "endgame-cutoff",
    title: "Cut the king off",
    theme: "Rook ending",
    fen: "8/8/6k1/8/8/8/4R3/6K1 w - - 0 1",
    expectedMove: "e2e6",
    prompt: "Use the rook as a wall. Take away an entire rank from the enemy king.",
    principle: "King cutoff",
    why: "Re6 cuts the black king off from the sixth rank and below. Rooks win endings by restricting kings before collecting pawns or checking from behind.",
    mistakeLesson: "Random checks often help the king move closer to safety. Restriction can be stronger than checking.",
    opponentPlan: "Black wants to cross the rook's line and centralize the king.",
    takeaway: "In rook endings, ask whether the rook can remove a whole rank or file from the enemy king.",
    orientation: "w",
  },
  {
    id: "endgame-ladder",
    title: "Shrink the king's box",
    theme: "Rook mate",
    fen: "7k/8/8/8/8/8/8/R5K1 w - - 0 1",
    expectedMove: "a1a7",
    prompt: "Do not chase the king with checks from far away. Use the rook to shrink the king's available space.",
    principle: "Box method",
    why: "Ra7 traps the king on the eighth rank. Your own king can then approach safely while the rook maintains the wall.",
    mistakeLesson: "Checking from the wrong distance can let the king escape around the rook. First build a box, then bring your king closer.",
    opponentPlan: "The lone king wants to stay close enough to attack the rook or escape around its line.",
    takeaway: "Rook mate is a two-piece job: rook builds the wall, king closes the distance.",
    orientation: "w",
  },
  {
    id: "endgame-queen-box",
    title: "Use the queen as a wall",
    theme: "Queen mate",
    fen: "7k/8/8/8/8/8/8/Q5K1 w - - 0 1",
    expectedMove: "a1a7",
    prompt: "Shrink the enemy king's box without stalemating it.",
    principle: "Queen box",
    why: "Qa7 limits the king to the back rank while leaving legal squares. Now your king can walk closer for the final mate.",
    mistakeLesson: "A queen can accidentally stalemate a lone king if you take away every square without giving check. Shrink the box gradually.",
    opponentPlan: "The lone king wants maximum space and hopes you place the queen too close where it can be attacked.",
    takeaway: "Queen mate is not a race to check. Restrict first, bring the king, then mate.",
    orientation: "w",
  },
  {
    id: "endgame-passed-pawn",
    title: "Create the outside passer",
    theme: "Pawn ending",
    fen: "8/5pk1/6p1/8/P7/8/5PPP/6K1 w - - 0 1",
    expectedMove: "a4a5",
    prompt: "Push the pawn that can drag the enemy king away from your kingside majority.",
    principle: "Outside passed pawn",
    why: "a5 starts an outside passer far from the kingside pawns. Even if Black can eventually stop it, the king may be pulled away from the other wing.",
    mistakeLesson: "Trading or pushing only where the kings already are can waste your extra space. An outside passer creates a second problem far away.",
    opponentPlan: "Black wants to keep the king centralized enough to stop the a-pawn without abandoning the kingside.",
    takeaway: "Two wings matter: an outside passer can win by distracting the king, not only by promoting.",
    orientation: "w",
  },
  {
    id: "endgame-activate-king",
    title: "Activate the king",
    theme: "Conversion",
    fen: "8/8/6k1/8/8/8/5PPP/6K1 w - - 0 1",
    expectedMove: "g1f1",
    prompt: "There is no immediate tactic. Improve the strongest endgame piece: your king.",
    principle: "King activity",
    why: "Kf1 starts bringing the king toward the center and the pawns. In endings, king activity is often worth more than a random pawn push.",
    mistakeLesson: "Pawn moves are irreversible. When nothing is urgent, centralize the king before creating permanent pawn weaknesses.",
    opponentPlan: "Black wants its king to reach the pawns before your king can support them.",
    takeaway: "In the endgame, the king stops being cargo and becomes a fighting piece.",
    orientation: "w",
  },
];

export function endgameMoveParts(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4],
  };
}

export function normalizeEndgameProgress(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const known = new Set(ENDGAME_LESSONS.map((lesson) => lesson.id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
}
