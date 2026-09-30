import type { Square } from "chess.js";

export type OpeningStep = {
  uci: string;
  sanLabel: string;
  side: "White" | "Black";
  purpose: string;
  opponentIdea: string;
};

export type OpeningLesson = {
  id: string;
  name: string;
  family: string;
  summary: string;
  bigIdea: string;
  whenToUse: string;
  steps: OpeningStep[];
};

export const OPENING_LESSONS: OpeningLesson[] = [
  {
    id: "italian-game",
    name: "Italian Game",
    family: "Open game",
    summary: "Develop quickly, fight for the center, and point the bishop at Black's sensitive f7 square.",
    bigIdea: "The Italian is not about memorizing six moves. It teaches development with purpose: a center pawn, a knight toward the center, then a bishop aimed at a real target.",
    whenToUse: "A strong first opening to learn because the positions stay natural and tactical ideas appear early.",
    steps: [
      { uci: "e2e4", sanLabel: "1. e4", side: "White", purpose: "Claim central space and open lines for the queen and f1 bishop.", opponentIdea: "Black usually challenges the same center instead of letting White own it." },
      { uci: "e7e5", sanLabel: "... e5", side: "Black", purpose: "Match White in the center and free the c8 bishop and queen.", opponentIdea: "White now develops while attacking the e5 pawn." },
      { uci: "g1f3", sanLabel: "2. Nf3", side: "White", purpose: "Develop the knight to a central square and immediately attack e5.", opponentIdea: "Black should defend e5 while developing a piece, not waste a tempo with a passive pawn move." },
      { uci: "b8c6", sanLabel: "... Nc6", side: "Black", purpose: "Develop and defend e5 at the same time.", opponentIdea: "White can now place the bishop where it creates a concrete target." },
      { uci: "f1c4", sanLabel: "3. Bc4", side: "White", purpose: "Develop with tempo toward f7, the square protected only by Black's king at the start.", opponentIdea: "Black should develop and prepare king safety while watching tactics on f7." },
      { uci: "g8f6", sanLabel: "... Nf6", side: "Black", purpose: "Develop, attack e4, and prepare to castle.", opponentIdea: "White should now think about king safety, d4 breaks, and whether the center is ready to open." },
    ],
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    family: "Closed center",
    summary: "Offer the c-pawn to pull Black's d-pawn away and build a stronger center.",
    bigIdea: "The Queen's Gambit is a lesson in pawn structure. White is not simply giving away a pawn; White is asking Black whether the d5 pawn can be distracted from the center.",
    whenToUse: "Great for learning space, pawn breaks, and how long-term structure matters more than grabbing material.",
    steps: [
      { uci: "d2d4", sanLabel: "1. d4", side: "White", purpose: "Take central space and open the c1 bishop.", opponentIdea: "Black usually contests d4 with a central pawn." },
      { uci: "d7d5", sanLabel: "... d5", side: "Black", purpose: "Build an equal share of the center.", opponentIdea: "White can now challenge the base of Black's center with the c-pawn." },
      { uci: "c2c4", sanLabel: "2. c4", side: "White", purpose: "Attack d5 and tempt Black to trade central control for a flank pawn.", opponentIdea: "Black can accept, decline, or support d5 — each choice creates a different pawn structure." },
      { uci: "e7e6", sanLabel: "... e6", side: "Black", purpose: "Decline the gambit, reinforce d5, and prepare development.", opponentIdea: "White should develop behind the space advantage and keep pressure on d5." },
      { uci: "b1c3", sanLabel: "3. Nc3", side: "White", purpose: "Add another attacker to d5 and develop toward the center.", opponentIdea: "Black should develop a knight and prepare a solid king." },
      { uci: "g8f6", sanLabel: "... Nf6", side: "Black", purpose: "Develop naturally and add control over e4 and d5.", opponentIdea: "White's next plans include Nf3, Bg5/Bf4, e3, and eventually a central break." },
    ],
  },
  {
    id: "sicilian-defense",
    name: "Sicilian Defense",
    family: "Asymmetrical fight",
    summary: "Black does not copy e4 with e5. The c-pawn attacks the center from the side and creates an unbalanced game.",
    bigIdea: "The Sicilian teaches counterplay. Black allows White more central space at first but creates pressure on the d-file and queenside instead of mirroring White.",
    whenToUse: "Good once you are comfortable with development and want sharper positions with different plans for each side.",
    steps: [
      { uci: "e2e4", sanLabel: "1. e4", side: "White", purpose: "Claim the center and open attacking pieces.", opponentIdea: "Black can fight the center indirectly instead of mirroring e5." },
      { uci: "c7c5", sanLabel: "... c5", side: "Black", purpose: "Attack d4 from the flank and create an asymmetrical pawn structure.", opponentIdea: "White usually develops and prepares d4 to build a broad center." },
      { uci: "g1f3", sanLabel: "2. Nf3", side: "White", purpose: "Develop, control d4/e5, and prepare the central break.", opponentIdea: "Black decides how to support c5 and control d4." },
      { uci: "d7d6", sanLabel: "... d6", side: "Black", purpose: "Control e5 and prepare development without blocking the c-pawn's pressure.", opponentIdea: "White can now challenge the center directly." },
      { uci: "d2d4", sanLabel: "3. d4", side: "White", purpose: "Open the center before Black finishes development.", opponentIdea: "Black normally exchanges c5 for d4, trading a flank pawn for a central pawn." },
      { uci: "c5d4", sanLabel: "... cxd4", side: "Black", purpose: "Remove White's d-pawn and open the c-file for future queenside pressure.", opponentIdea: "White usually recaptures with the knight to gain development." },
      { uci: "f3d4", sanLabel: "4. Nxd4", side: "White", purpose: "Recapture while centralizing a developed piece.", opponentIdea: "Black develops quickly before White uses the extra space for an attack." },
      { uci: "g8f6", sanLabel: "... Nf6", side: "Black", purpose: "Attack e4 and accelerate development.", opponentIdea: "Both sides now have different plans: White has space; Black has structural counterplay." },
    ],
  },
  {
    id: "london-system",
    name: "London System",
    family: "Structure-first",
    summary: "Build a dependable setup where the dark-squared bishop develops before e3 closes its diagonal.",
    bigIdea: "The London teaches move order. If you play e3 too early, the c1 bishop gets trapped behind its own pawn chain. Develop the bishop first, then complete the structure.",
    whenToUse: "Useful for players who want a repeatable setup while learning strategic plans instead of memorizing long forcing lines.",
    steps: [
      { uci: "d2d4", sanLabel: "1. d4", side: "White", purpose: "Claim central space and open the c1 bishop.", opponentIdea: "Black contests the center." },
      { uci: "d7d5", sanLabel: "... d5", side: "Black", purpose: "Take an equal share of the center.", opponentIdea: "White develops a knight without blocking the bishop's planned route." },
      { uci: "g1f3", sanLabel: "2. Nf3", side: "White", purpose: "Develop and support the center.", opponentIdea: "Black develops normally and prepares castling." },
      { uci: "g8f6", sanLabel: "... Nf6", side: "Black", purpose: "Control e4 and d5 while developing.", opponentIdea: "White should now get the c1 bishop outside the pawn chain." },
      { uci: "c1f4", sanLabel: "3. Bf4", side: "White", purpose: "Develop the bishop before e3 would lock it in.", opponentIdea: "Black can challenge the bishop or continue solid development." },
      { uci: "e7e6", sanLabel: "... e6", side: "Black", purpose: "Reinforce d5 and prepare the f8 bishop.", opponentIdea: "White can now play e3 because the bishop already escaped." },
      { uci: "e2e3", sanLabel: "4. e3", side: "White", purpose: "Support d4 and prepare Bd3 without trapping the bishop.", opponentIdea: "The position becomes about piece placement, c-pawn breaks, and king safety." },
    ],
  },
];

export function openingMoveParts(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4],
  };
}
