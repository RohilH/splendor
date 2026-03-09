import { GemType } from "../types/game";

export const createEmptyGemSelection = (): Record<GemType, number> => ({
  diamond: 0,
  sapphire: 0,
  emerald: 0,
  ruby: 0,
  onyx: 0,
  gold: 0,
});
