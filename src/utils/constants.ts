import { GemType } from "../types/game";

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