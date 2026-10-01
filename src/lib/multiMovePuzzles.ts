import type { Color, Square } from "chess.js";

export const MULTI_MOVE_PROGRESS_KEY = "chess-universe-multi-move-v1";

export type MultiMoveStep = {
  actor: "player" | "opponent";
  uci: string;
  label: string;
  explanation: string;
  mistakeLesson?: string;
};

export type MultiMovePuzzle = {
  id: string;
  title: string;
  theme: string;
  fen: string;
  playerColor: Color;
  orientation: Color;
  goal: string;
  setup: string;
  steps: MultiMoveStep[];
  takeaway: string;
};

export const MULTI_MOVE_PUZZLES: MultiMovePuzzle[] = [
  {
    id: "scholars-pattern",
    title: "Build the queen-bishop battery",
    theme: "Attack",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    playerColor: "w",
    orientation: "w",
    goal: "Build a coordinated kingside attack over several moves instead of throwing the queen forward alone.",
    setup: "You are White. Each time Black replies, keep asking which move adds another attacker or creates a forcing threat.",
    steps: [
      { actor: "player", uci: "e2e4", label: "Claim the center", explanation: "e4 opens the queen and bishop while taking central space.", mistakeLesson: "A different first move misses the lesson's foundation: e4 opens both attacking pieces and claims the center in one move." },
      { actor: "opponent", uci: "e7e5", label: "Black mirrors the center", explanation: "Black challenges the same central squares." },
      { actor: "player", uci: "d1h5", label: "Queen joins the idea", explanation: "Qh5 looks at f7, but the attack is not ready yet because the queen needs support.", mistakeLesson: "The queen needs to join the bishop's future f7 pressure. A different queen move does not build the battery this sequence is teaching." },
      { actor: "opponent", uci: "b8c6", label: "Black develops", explanation: "Nc6 defends e5 and develops a piece, but f7 is still sensitive." },
      { actor: "player", uci: "f1c4", label: "Add the bishop", explanation: "Bc4 creates the battery. Now queen and bishop both focus on f7.", mistakeLesson: "Without Bc4, the queen's pressure on f7 is unsupported. The attack only works because the bishop adds a second attacker." },
      { actor: "opponent", uci: "g8f6", label: "Black develops again", explanation: "Nf6 attacks the queen's center and prepares king safety, but it misses the immediate threat." },
      { actor: "player", uci: "h5f7", label: "Finish the pattern", explanation: "Qxf7# works because the bishop protects f7 and the queen controls the king's escape squares.", mistakeLesson: "The mating net is complete now. A slower move gives Black time to defend f7 or create an escape square." },
    ],
    takeaway: "The lesson is coordination: queen attacks become dangerous when another piece already supports the target.",
  },
  {
    id: "black-punishes-king",
    title: "Punish a weakened king",
    theme: "Black to move",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    playerColor: "b",
    orientation: "b",
    goal: "Recognize how early pawn moves around the king can create a mating diagonal.",
    setup: "You are Black. White will weaken the king. Your job is to see when the queen has a direct path to h4.",
    steps: [
      { actor: "opponent", uci: "f2f3", label: "White weakens the diagonal", explanation: "f3 loosens the e1-h4 diagonal around the king." },
      { actor: "player", uci: "e7e5", label: "Open the queen", explanation: "e5 clears the diagonal for the queen on d8 while taking the center.", mistakeLesson: "Black must open the queen's diagonal before White finishes development. A different move wastes the king-safety weakness White just created." },
      { actor: "opponent", uci: "g2g4", label: "White weakens the king again", explanation: "g4 removes the last cover from h4-e1." },
      { actor: "player", uci: "d8h4", label: "Use the open diagonal", explanation: "Qh4# is mate because White's own pawn moves opened the diagonal and removed escape squares.", mistakeLesson: "White's king is exposed on the h4-e1 diagonal right now. Any slower move gives White a chance to repair the position." },
    ],
    takeaway: "King safety is structural. Pawn moves around your king can create tactical lines that did not exist one move earlier.",
  },
  {
    id: "rook-behind-passer-sequence",
    title: "Activate the rook, then push",
    theme: "Rook plan",
    fen: "6k1/8/8/3P4/8/8/8/R5K1 w - - 0 1",
    playerColor: "w",
    orientation: "w",
    goal: "Improve the rook first, then advance the passed pawn with support.",
    setup: "The passed pawn is tempting to push immediately. Build the right rook position first.",
    steps: [
      { actor: "player", uci: "a1d1", label: "Get behind the passer", explanation: "Rd1 places the rook behind the d-pawn so every future push remains protected.", mistakeLesson: "Pushing the pawn before improving the rook makes the passer easier to stop. The rook belongs behind the pawn first." },
      { actor: "opponent", uci: "g8f7", label: "The king approaches", explanation: "Black tries to get closer before the pawn advances." },
      { actor: "player", uci: "d5d6", label: "Now advance", explanation: "d6 is stronger now because the rook remains behind the pawn and supports its path.", mistakeLesson: "The support is finally in place. Delaying the pawn push lets the enemy king get closer and wastes the improved rook position." },
    ],
    takeaway: "Rook endings are often about setup before speed: improve the rook first, then push the passer.",
  },
  {
    id: "knight-reroute-sequence",
    title: "Reroute the knight in two moves",
    theme: "Knight plan",
    fen: "6k1/8/8/8/8/N7/8/6K1 w - - 0 1",
    playerColor: "w",
    orientation: "w",
    goal: "Do not wait for a tactic. Improve a bad knight through a planned route.",
    setup: "Your knight starts on the rim. Find a route that brings it toward central influence.",
    steps: [
      { actor: "player", uci: "a3c4", label: "First jump inward", explanation: "Nc4 immediately gives the knight more useful squares.", mistakeLesson: "The knight is poor on the rim. A move that keeps it near the edge fails to begin the planned route toward central squares." },
      { actor: "opponent", uci: "g8f7", label: "Black improves the king", explanation: "Black uses the time to centralize the king." },
      { actor: "player", uci: "c4d6", label: "Reach the outpost", explanation: "Nd6 places the knight deep in the position where it controls key squares and is hard to ignore.", mistakeLesson: "The point of Nc4 was to reach d6. A different second jump gives up the strong outpost the route was designed to create." },
    ],
    takeaway: "Knights often need routes. Think two or three jumps ahead instead of judging only the current square.",
  },
  {
    id: "open-bishop-sequence",
    title: "Open the diagonal, then use it",
    theme: "Bishop plan",
    fen: "6k1/8/8/8/8/8/3P4/2B3K1 w - - 0 1",
    playerColor: "w",
    orientation: "w",
    goal: "Fix the pawn structure first, then activate the bishop.",
    setup: "The bishop is boxed in by your own pawn. The first move should improve the board around the piece.",
    steps: [
      { actor: "player", uci: "d2d4", label: "Open the diagonal", explanation: "d4 clears the c1-h6 diagonal.", mistakeLesson: "The bishop is trapped by your own pawn. Moving the bishop around is not the fix; changing the pawn structure is." },
      { actor: "opponent", uci: "g8f7", label: "Black centralizes", explanation: "Black improves the king while you finish activating the bishop." },
      { actor: "player", uci: "c1h6", label: "Use the new line", explanation: "Bh6 uses the entire diagonal you just created.", mistakeLesson: "You opened this diagonal on purpose. A different move wastes the newly created line instead of activating the bishop immediately." },
    ],
    takeaway: "Sometimes your first move does not move the piece you want to improve. Change the structure, then use the new route.",
  },
];

export function multiMoveParts(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4],
  };
}

export function normalizeMultiMoveProgress(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const known = new Set(MULTI_MOVE_PUZZLES.map((puzzle) => puzzle.id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
}
