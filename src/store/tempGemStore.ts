import { create } from "zustand";
import { GemType } from "../types/game";

interface TempGemStore {
  selectedGems: Record<GemType, number>;
  addGem: (gem: GemType) => void;
  removeGem: (gem: GemType) => void;
  clearGems: () => void;
}

export const createEmptyGemSelection = (): Record<GemType, number> => ({
  diamond: 0,
  sapphire: 0,
  emerald: 0,
  ruby: 0,
  onyx: 0,
  gold: 0,
});

export const useTempGemStore = create<TempGemStore>((set) => ({
  selectedGems: createEmptyGemSelection(),
  addGem: (gem) =>
    set((state) => ({
      selectedGems: {
        ...state.selectedGems,
        [gem]: state.selectedGems[gem] + 1,
      },
    })),
  removeGem: (gem) =>
    set((state) => ({
      selectedGems: {
        ...state.selectedGems,
        [gem]: Math.max(0, state.selectedGems[gem] - 1),
      },
    })),
  clearGems: () =>
    set({
      selectedGems: createEmptyGemSelection(),
    }),
}));
