import type { Square } from "chess.js";

export const RESPONSE_PROGRESS_KEY = "chess-universe-opponent-response-v1";

export type OpponentResponseLesson = {
  id: string;
  title: string;
  theme: string;
  fen: string;
  expectedMove: string;
  lastMove: string;
  threat: string;
  prompt: string;
  why: string;
  nextPlan: string;
  takeaway: string;
  orientation: "w" | "b";
};

export const OPPONENT_RESPONSE_LESSONS: OpponentResponseLesson[] = [
  {
    id: "response-block-rook",
    title: "Answer the open-file check",
    theme: "Defense",
    fen: "k3r3/8/8/8/8/3B4/8/4K3 w - - 0 1",
    expectedMove: "d3e2",
    lastMove: "...Re8+ put your king on an open file.",
    threat: "If you react carelessly, the rook keeps checking and controls your king's escape route.",
    prompt: "Do not think about attacking. First solve the check in the most useful way.",
    why: "Be2 blocks the e-file while developing the bishop into the defensive job the position requires.",
    nextPlan: "If the rook captures on e2, your king can recapture and the checking piece disappears.",
    takeaway: "When checked by a line piece, compare king moves, captures, and blocks before choosing.",
    orientation: "w",
  },
  {
    id: "response-save-queen",
    title: "Your queen is attacked",
    theme: "Threat recognition",
    fen: "6k1/8/8/5n2/7Q/8/6PP/6K1 w - - 0 1",
    expectedMove: "h4f2",
    lastMove: "...Nf5 attacked your queen on h4.",
    threat: "The knight will simply take the queen if you play a move that ignores the attack.",
    prompt: "Save the queen, but choose a square that keeps her connected to the rest of your position.",
    why: "Qf2 gets the queen out of the knight's attack while keeping her centralized enough to defend both wings.",
    nextPlan: "After solving the immediate threat, look for a way to challenge the knight or improve another inactive piece.",
    takeaway: "Opponent first: before making your plan, identify every new attack created by the last move.",
    orientation: "w",
  },
  {
    id: "response-center",
    title: "Challenge their center",
    theme: "Pawn structure",
    fen: "6k1/pp3ppp/8/3p4/8/8/PP2PPPP/6K1 w - - 0 1",
    expectedMove: "c2c4",
    lastMove: "...d5 claimed central space.",
    threat: "If you do nothing, the d5 pawn gives Black space and controls useful squares.",
    prompt: "Use a flank pawn to attack the base of the central pawn immediately.",
    why: "c4 challenges d5 and asks Black to clarify the center. You are not attacking the king; you are attacking the structure that gives Black space.",
    nextPlan: "Depending on the exchange, use the opened c- or d-file and develop pieces toward the new center.",
    takeaway: "When the opponent builds a pawn center, look for pawn breaks that attack its base.",
    orientation: "w",
  },
  {
    id: "response-question-bishop",
    title: "Question the pin",
    theme: "Piece harassment",
    fen: "6k1/8/8/8/6b1/5N2/6PP/3Q2K1 w - - 0 1",
    expectedMove: "h2h3",
    lastMove: "...Bg4 pinned your knight to the queen.",
    threat: "Black wants the bishop to keep your knight tied down while the rest of the position develops around the pin.",
    prompt: "Ask the bishop a question and force Black to decide whether the pin is worth keeping.",
    why: "h3 attacks the bishop. The move does not magically win material; it forces the opponent to spend a move deciding where the bishop belongs.",
    nextPlan: "If the bishop retreats, the knight is free. If it captures, decide whether the changed pawn structure is acceptable.",
    takeaway: "A useful pawn move can gain a tempo by attacking a piece and forcing a decision.",
    orientation: "w",
  },
  {
    id: "response-move-knight",
    title: "Do not leave the knight hanging",
    theme: "Piece safety",
    fen: "6k1/8/8/8/4p3/5N2/6PP/2B3K1 w - - 0 1",
    expectedMove: "f3d4",
    lastMove: "...e4 attacked your knight on f3.",
    threat: "Black's pawn will take the knight if you ignore it.",
    prompt: "Move the knight to a square that solves the attack and improves its activity.",
    why: "Nd4 saves the knight and centralizes it. A defensive move is stronger when it also improves the piece.",
    nextPlan: "From d4, the knight can look toward b5, c6, e6, and f5 instead of merely surviving.",
    takeaway: "When a piece is attacked, search for the safest square that also improves its future.",
    orientation: "w",
  },
  {
    id: "response-hit-queen",
    title: "Gain a tempo on the queen",
    theme: "Counterplay",
    fen: "6k1/8/8/8/7q/8/6PP/6K1 w - - 0 1",
    expectedMove: "g2g3",
    lastMove: "...Qh4 brought the queen close to your king.",
    threat: "The queen is creating kingside pressure and may collect pawns if you let her stay comfortably.",
    prompt: "Use a pawn move that improves king space and attacks the queen at the same time.",
    why: "g3 attacks the queen on h4 and gains a tempo. Black must spend a move relocating its most powerful piece.",
    nextPlan: "Use the gained tempo to develop or improve king safety while the queen retreats.",
    takeaway: "A tempo is valuable when your move improves your position and forces the opponent to respond.",
    orientation: "w",
  },
];

export function responseMoveParts(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4],
  };
}

export function normalizeResponseProgress(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const known = new Set(OPPONENT_RESPONSE_LESSONS.map((lesson) => lesson.id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
}
