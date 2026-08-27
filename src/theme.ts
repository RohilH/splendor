import { extendTheme } from "@chakra-ui/react";

/**
 * Tabletop theme: the app is styled after the physical board game — a dark
 * felt table, parchment surfaces, wood rails, and a muted gold accent.
 */

export const FELT_BACKGROUND =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 2px, transparent 2px, transparent 6px)," +
  "repeating-linear-gradient(-45deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 2px, transparent 2px, transparent 6px)," +
  "radial-gradient(ellipse at 50% 30%, #1f4a34 0%, #123324 55%, #0b241a 100%)";

export const WOOD_RAIL_BACKGROUND =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 2px, transparent 2px, transparent 90px)," +
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 14px)," +
  "linear-gradient(180deg, #5a3d26 0%, #4a3220 45%, #3e2a1a 100%)";

export const PARCHMENT_BACKGROUND =
  "linear-gradient(160deg, #f9f4e8 0%, #f2e9d4 60%, #eadfc6 100%)";

export const theme = extendTheme({
  fonts: {
    heading: `Georgia, 'Times New Roman', serif`,
  },
  colors: {
    parchment: {
      50: "#fbf7ee",
      100: "#f9f4e8",
      200: "#f0e6cd",
      300: "#eadfc6",
      400: "#d9c9a6",
      500: "#c4b088",
    },
    ink: {
      500: "#5a4d3c",
      700: "#4a4034",
      900: "#3b3227",
    },
    tableGold: {
      300: "#e8cd8a",
      400: "#d9b45b",
      500: "#c29a3f",
      600: "#a37f2e",
    },
    felt: {
      500: "#1f4a34",
      700: "#123324",
      900: "#0b241a",
    },
    wood: {
      500: "#5a3d26",
      700: "#3e2a1a",
    },
  },
  styles: {
    global: {
      body: {
        background: FELT_BACKGROUND,
        backgroundAttachment: "fixed",
        color: "ink.900",
      },
    },
  },
});
