import { GemType } from "../types/game";

export const createEmptyGemSelection = (): Record<GemType, number> => ({
  diamond: 0,
  sapphire: 0,
  emerald: 0,
  ruby: 0,
  onyx: 0,
  gold: 0,
});

/** Staged bank gems are already this turn's action until taken or returned. */
export const hasPendingGemSelection = (
  selectedGems: Partial<Record<GemType, number>>,
): boolean => Object.values(selectedGems).some((count) => (count ?? 0) > 0);
