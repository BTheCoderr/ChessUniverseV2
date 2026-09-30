export const ACADEMY_PLACEMENT_KEY = "chess-universe-academy-placement-v1";

export type AcademyLevel = "Beginner" | "Developing" | "Intermediate";

export type PlacementAnswer = {
  questionId: string;
  answerId: string;
};

export type PlacementResult = {
  level: AcademyLevel;
  score: number;
  total: number;
  completedAt: number;
  answers: PlacementAnswer[];
};

export type PlacementQuestion = {
  id: string;
  prompt: string;
  concept: string;
  answers: Array<{
    id: string;
    label: string;
    correct: boolean;
    explanation: string;
  }>;
};

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: "knight-movement",
    prompt: "A knight on d4 needs to attack f5. Can it move there in one move?",
    concept: "Piece movement",
    answers: [
      { id: "yes", label: "Yes", correct: true, explanation: "A knight moves two squares one way and one sideways. d4→f5 is a legal knight jump." },
      { id: "no", label: "No", correct: false, explanation: "d4→f5 is one of the knight's L-shaped jumps." },
    ],
  },
  {
    id: "development",
    prompt: "Early in the game, which move usually improves your position more?",
    concept: "Development",
    answers: [
      { id: "develop", label: "Develop a knight toward the center", correct: true, explanation: "Early development should bring pieces into useful central influence while preparing king safety." },
      { id: "rook-pawn", label: "Move a rook pawn for no immediate reason", correct: false, explanation: "A quiet rook-pawn move often spends a tempo without developing a piece or fighting for the center." },
    ],
  },
  {
    id: "opponent-first",
    prompt: "Your opponent's last move attacks your queen. What should you check first?",
    concept: "Threat recognition",
    answers: [
      { id: "own-plan", label: "Continue your attacking plan", correct: false, explanation: "Ignoring a direct attack on your queen can lose material immediately." },
      { id: "threat", label: "What changed and where the queen can move safely", correct: true, explanation: "Strong calculation starts with the opponent's threat before returning to your own plan." },
    ],
  },
  {
    id: "rook-activity",
    prompt: "Your rook is trapped behind pawns. What is the first positional question to ask?",
    concept: "Piece activity",
    answers: [
      { id: "open-file", label: "Which open or half-open file can it reach?", correct: true, explanation: "Rooks become active when they gain access to open files and ranks." },
      { id: "random-check", label: "Can I force any check right now?", correct: false, explanation: "Random checks are not a substitute for improving a passive rook." },
    ],
  },
  {
    id: "bishop-knight",
    prompt: "When can one knight be stronger than one bishop?",
    concept: "Piece quality",
    answers: [
      { id: "never", label: "Never — bishops are always stronger", correct: false, explanation: "Piece value depends on the position. A knight can dominate from a stable central outpost." },
      { id: "outpost", label: "When it owns a strong outpost in a closed position", correct: true, explanation: "Closed structures and permanent outposts can make a knight more useful than a restricted bishop." },
    ],
  },
  {
    id: "endgame-king",
    prompt: "In a simple king-and-pawn ending with no immediate tactic, what often improves the position most?",
    concept: "Endgame technique",
    answers: [
      { id: "king", label: "Activate the king", correct: true, explanation: "In the endgame the king becomes an active fighting piece and often belongs near the center or passed pawns." },
      { id: "push", label: "Push any pawn immediately", correct: false, explanation: "Pawn moves are irreversible. Improving the king first is often more precise." },
    ],
  },
];

export function placementLevel(score: number, total = PLACEMENT_QUESTIONS.length): AcademyLevel {
  const ratio = total > 0 ? score / total : 0;
  if (ratio <= 0.34) return "Beginner";
  if (ratio <= 0.67) return "Developing";
  return "Intermediate";
}

export function scorePlacement(answers: PlacementAnswer[]): PlacementResult {
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer.answerId]));
  let score = 0;

  for (const question of PLACEMENT_QUESTIONS) {
    const selected = question.answers.find((answer) => answer.id === answerByQuestion.get(question.id));
    if (selected?.correct) score += 1;
  }

  return {
    level: placementLevel(score, PLACEMENT_QUESTIONS.length),
    score,
    total: PLACEMENT_QUESTIONS.length,
    completedAt: Date.now(),
    answers,
  };
}

export function loadPlacement(): PlacementResult | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACADEMY_PLACEMENT_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    if (!["Beginner", "Developing", "Intermediate"].includes(parsed.level)) return null;
    return parsed as PlacementResult;
  } catch {
    return null;
  }
}

export function savePlacement(result: PlacementResult) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACADEMY_PLACEMENT_KEY, JSON.stringify(result));
  } catch {
    // Placement remains usable for this session when storage is unavailable.
  }
}

export function clearPlacement() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACADEMY_PLACEMENT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function recommendedStart(level: AcademyLevel) {
  if (level === "Beginner") return "pieces";
  if (level === "Developing") return "schools";
  return "responses";
}
