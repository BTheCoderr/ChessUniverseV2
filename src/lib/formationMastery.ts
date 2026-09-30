export type FormationMastery = {
  level: number;
  name: string;
  minGames: number;
  nextGames: number | null;
  progress: number;
  gamesToNext: number;
};

const MASTERY_LEVELS = [
  { level: 0, name: "Unplayed", minGames: 0 },
  { level: 1, name: "Novice", minGames: 1 },
  { level: 2, name: "Adept", minGames: 3 },
  { level: 3, name: "Veteran", minGames: 5 },
  { level: 4, name: "Elite", minGames: 10 },
  { level: 5, name: "Master", minGames: 25 },
] as const;

export function formationMastery(gamesPlayed: number): FormationMastery {
  const games = Number.isFinite(gamesPlayed) ? Math.max(0, Math.floor(gamesPlayed)) : 0;
  let index = 0;

  for (let i = 0; i < MASTERY_LEVELS.length; i += 1) {
    if (games >= MASTERY_LEVELS[i].minGames) index = i;
  }

  const current = MASTERY_LEVELS[index];
  const next = MASTERY_LEVELS[index + 1] ?? null;

  if (!next) {
    return {
      ...current,
      nextGames: null,
      progress: 100,
      gamesToNext: 0,
    };
  }

  const span = next.minGames - current.minGames;
  const progress = Math.max(
    0,
    Math.min(100, Math.round(((games - current.minGames) / span) * 100))
  );

  return {
    ...current,
    nextGames: next.minGames,
    progress,
    gamesToNext: Math.max(0, next.minGames - games),
  };
}
