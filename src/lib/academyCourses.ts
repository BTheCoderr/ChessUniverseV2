import type { AcademyLevel } from "./academyPlacement";

export type AcademyCourseSection =
  | "pieces"
  | "decisions"
  | "schools"
  | "responses"
  | "endgames"
  | "review"
  | "openings"
  | "strategy"
  | "universe"
  | "puzzles";

export type AcademyCourseStep = {
  label: string;
  section: AcademyCourseSection;
  why: string;
};

export const ACADEMY_COURSE_PATHS: Record<AcademyLevel, AcademyCourseStep[]> = {
  Beginner: [
    { label: "Piece Basics", section: "pieces", why: "Build reliable movement patterns first." },
    { label: "Piece Decisions", section: "decisions", why: "Learn what each piece is trying to accomplish." },
    { label: "Piece Schools", section: "schools", why: "Turn piece movement into piece strategy." },
    { label: "Daily Puzzles", section: "puzzles", why: "Practice short tactical decisions." },
    { label: "Opponent Response", section: "responses", why: "Read the opponent before making your own plan." },
    { label: "Opening Lab", section: "openings", why: "Learn opening ideas after the pieces make sense." },
    { label: "Endgame School", section: "endgames", why: "Learn how advantages become wins." },
    { label: "Adaptive Review", section: "review", why: "Revisit concepts you actually miss." },
  ],
  Developing: [
    { label: "Piece Schools", section: "schools", why: "Improve piece quality and positional decisions." },
    { label: "Opponent Response", section: "responses", why: "Strengthen threat recognition." },
    { label: "Opening Lab", section: "openings", why: "Connect development to real plans." },
    { label: "Daily Puzzles", section: "puzzles", why: "Build tactical pattern recognition." },
    { label: "Strategy & Tactics", section: "strategy", why: "Organize candidate moves and plans." },
    { label: "Endgame School", section: "endgames", why: "Convert cleaner positions." },
    { label: "Adaptive Review", section: "review", why: "Attack recurring weaknesses." },
  ],
  Intermediate: [
    { label: "Opponent Response", section: "responses", why: "Make opponent-first calculation automatic." },
    { label: "Daily + Multi-Move Puzzles", section: "puzzles", why: "Calculate beyond the first move." },
    { label: "Opening Lab", section: "openings", why: "Review ideas, not memorized notation." },
    { label: "Strategy & Tactics", section: "strategy", why: "Improve plans between tactical moments." },
    { label: "Endgame School", section: "endgames", why: "Sharpen technical conversion." },
    { label: "Adaptive Review", section: "review", why: "Use your own misses as the syllabus." },
  ],
};

export function coursePathForLevel(level: AcademyLevel) {
  return ACADEMY_COURSE_PATHS[level];
}
