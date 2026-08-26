import { GemType } from "../types/game";

/** Canonical display order for gem colors (gold last where included). */
export const GEM_ORDER: Exclude<GemType, "gold">[] = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "onyx",
];

export const gemColors: Record<
  Exclude<GemType, "gold">,
  { primary: string; secondary: string; accent: string }
> = {
  diamond: {
    primary: "#ffffff",
    secondary: "#f0f0f0",
    accent: "#e0e0e0",
  },
  sapphire: {
    primary: "#1a365d",
    secondary: "#2b4c7e",
    accent: "#0066cc",
  },
  emerald: {
    primary: "#1a4731",
    secondary: "#2f855a",
    accent: "#00cc66",
  },
  ruby: {
    primary: "#822727",
    secondary: "#9b2c2c",
    accent: "#cc0000",
  },
  onyx: {
    primary: "#1a202c",
    secondary: "#2d3748",
    accent: "#4a5568",
  },
};

export const gemImages: Record<GemType, string> = {
  diamond: "/gems/diamond.svg",
  sapphire: "/gems/sapphire.svg",
  emerald: "/gems/emerald.svg",
  ruby: "/gems/ruby.svg",
  onyx: "/gems/onyx.svg",
  gold: "/gems/gold.svg",
};

export const bankGemColors: Record<GemType, { bg: string; border: string }> = {
  diamond: { bg: "#ffffff", border: "#e2e8f0" },
  sapphire: { bg: "#2b6cb0", border: "#2c5282" },
  emerald: { bg: "#2f855a", border: "#276749" },
  ruby: { bg: "#c53030", border: "#9b2c2c" },
  onyx: { bg: "#1a202c", border: "#171923" },
  gold: { bg: "#d69e2e", border: "#b7791f" },
};

/**
 * Punch-board chip palette: outer ring color per gem, plus the number/ink
 * color that reads against the chip's cream inner disc.
 */
export const gemChipColors: Record<
  GemType,
  { ring: string; fill: string; text: string }
> = {
  diamond: { ring: "#c9cdd4", fill: "#fdfdfb", text: "#3b3227" },
  sapphire: { ring: "#2b6cb0", fill: "#eef4fb", text: "#1a365d" },
  emerald: { ring: "#2f855a", fill: "#eefaf1", text: "#1a4731" },
  ruby: { ring: "#c53030", fill: "#fdf0ec", text: "#822727" },
  onyx: { ring: "#2d3748", fill: "#f1f2f4", text: "#1a202c" },
  gold: { ring: "#d9b45b", fill: "#fdf6e3", text: "#8a6d1f" },
};
