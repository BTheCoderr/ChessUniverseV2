export const ACADEMY_PROGRESS_KEY = "chess-universe-academy-core-progress-v1";

export type AcademyCoreProgress = {
  pieceBasicsComplete: boolean;
  pieceDecisionIds: string[];
  openingIds: string[];
  strategyVisited: boolean;
  universeIntroComplete: boolean;
};

const EMPTY_PROGRESS: AcademyCoreProgress = {
  pieceBasicsComplete: false,
  pieceDecisionIds: [],
  openingIds: [],
  strategyVisited: false,
  universeIntroComplete: false,
};

export function loadAcademyCoreProgress(): AcademyCoreProgress {
  if (typeof window === "undefined") return { ...EMPTY_PROGRESS };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACADEMY_PROGRESS_KEY) ?? "{}");
    return {
      pieceBasicsComplete: Boolean(parsed.pieceBasicsComplete),
      pieceDecisionIds: Array.isArray(parsed.pieceDecisionIds)
        ? [...new Set(parsed.pieceDecisionIds.filter((id: unknown): id is string => typeof id === "string"))]
        : [],
      openingIds: Array.isArray(parsed.openingIds)
        ? [...new Set(parsed.openingIds.filter((id: unknown): id is string => typeof id === "string"))]
        : [],
      strategyVisited: Boolean(parsed.strategyVisited),
      universeIntroComplete: Boolean(parsed.universeIntroComplete),
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveAcademyCoreProgress(progress: AcademyCoreProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACADEMY_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Core progress remains usable for the current session.
  }
}

export function updateAcademyCoreProgress(
  updater: (current: AcademyCoreProgress) => AcademyCoreProgress
) {
  const next = updater(loadAcademyCoreProgress());
  saveAcademyCoreProgress(next);
  return next;
}

export function markPieceBasicsComplete() {
  return updateAcademyCoreProgress((current) => ({ ...current, pieceBasicsComplete: true }));
}

export function markPieceDecisionComplete(id: string) {
  return updateAcademyCoreProgress((current) => ({
    ...current,
    pieceDecisionIds: current.pieceDecisionIds.includes(id)
      ? current.pieceDecisionIds
      : [...current.pieceDecisionIds, id],
  }));
}

export function markOpeningComplete(id: string) {
  return updateAcademyCoreProgress((current) => ({
    ...current,
    openingIds: current.openingIds.includes(id)
      ? current.openingIds
      : [...current.openingIds, id],
  }));
}

export function markStrategyVisited() {
  return updateAcademyCoreProgress((current) => ({ ...current, strategyVisited: true }));
}

export function markUniverseIntroComplete() {
  return updateAcademyCoreProgress((current) => ({ ...current, universeIntroComplete: true }));
}
