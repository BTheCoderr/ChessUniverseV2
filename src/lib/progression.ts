export type RankTier = {
  name: string;
  minRating: number;
};

export type SeasonMilestone = {
  name: string;
  description: string;
  points?: number;
  games?: number;
};

export const RANK_TIERS: RankTier[] = [
  { name: "Rookie", minRating: 0 },
  { name: "Bronze", minRating: 1100 },
  { name: "Silver", minRating: 1250 },
  { name: "Gold", minRating: 1400 },
  { name: "Platinum", minRating: 1550 },
  { name: "Diamond", minRating: 1700 },
  { name: "Universe Master", minRating: 1900 },
];

export const SEASON_MILESTONES: SeasonMilestone[] = [
  { name: "First Move", description: "Finish your first rated Season game.", games: 1 },
  { name: "Challenger", description: "Earn 6 Season points.", points: 6 },
  { name: "Contender", description: "Earn 15 Season points.", points: 15 },
  { name: "Elite Run", description: "Earn 30 Season points.", points: 30 },
  { name: "Universe Crown", description: "Earn 60 Season points.", points: 60 },
];

export function rankForRating(rating: number) {
  const safeRating = Number.isFinite(rating) ? Math.max(0, rating) : 0;
  let index = 0;

  for (let i = 0; i < RANK_TIERS.length; i += 1) {
    if (safeRating >= RANK_TIERS[i].minRating) index = i;
  }

  const current = RANK_TIERS[index];
  const next = RANK_TIERS[index + 1] ?? null;
  const progress = next
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((safeRating - current.minRating) / (next.minRating - current.minRating)) * 100
          )
        )
      )
    : 100;

  return {
    ...current,
    next,
    progress,
    pointsToNext: next ? Math.max(0, next.minRating - safeRating) : 0,
  };
}

export function milestoneUnlocked(
  milestone: SeasonMilestone,
  stats: { points: number; games_played: number }
) {
  if (milestone.games !== undefined && stats.games_played < milestone.games) return false;
  if (milestone.points !== undefined && stats.points < milestone.points) return false;
  return true;
}

export function currentSeasonTitle(stats: { points: number; games_played: number }) {
  const unlocked = SEASON_MILESTONES.filter((milestone) => milestoneUnlocked(milestone, stats));
  return unlocked.at(-1)?.name ?? "Newcomer";
}

export function nextSeasonMilestone(stats: { points: number; games_played: number }) {
  return SEASON_MILESTONES.find((milestone) => !milestoneUnlocked(milestone, stats)) ?? null;
}
