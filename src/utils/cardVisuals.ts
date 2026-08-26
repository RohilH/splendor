import { Card, Noble } from "../types/game";
import { GEM_ORDER, gemColors } from "./constants";

type DevelopmentGem = Card["gem"];

const artworkPalettes: Record<
  DevelopmentGem,
  {
    skyTop: string;
    skyBottom: string;
    structure: string;
    roof: string;
    accent: string;
    highlight: string;
  }
> = {
  diamond: {
    skyTop: "#f9f6ec",
    skyBottom: "#d8d6d2",
    structure: "#c8b99b",
    roof: "#8e7d63",
    accent: "#f2ede2",
    highlight: "#ffffff",
  },
  sapphire: {
    skyTop: "#173960",
    skyBottom: "#6ea2cf",
    structure: "#d0c29d",
    roof: "#355f8b",
    accent: "#a7d0f2",
    highlight: "#dff3ff",
  },
  emerald: {
    skyTop: "#1d4d39",
    skyBottom: "#8dc496",
    structure: "#d7c3a6",
    roof: "#3b6b48",
    accent: "#a7e3b0",
    highlight: "#edfdef",
  },
  ruby: {
    skyTop: "#6b2321",
    skyBottom: "#d58a6c",
    structure: "#dec2a7",
    roof: "#8f3630",
    accent: "#f0b2a0",
    highlight: "#ffefe9",
  },
  onyx: {
    skyTop: "#23262f",
    skyBottom: "#89909f",
    structure: "#d5c7ae",
    roof: "#4f5563",
    accent: "#b6bfcd",
    highlight: "#f5f7fb",
  },
};

/**
 * Width of a board development card (and deck back). Tracks viewport width,
 * but also shrinks with viewport height so the nobles row, three card rows,
 * and the wood rail all fit on screen without scrolling (the 336px term is
 * the fixed vertical overhead around the card rows; 0.2456 = (140/190)/3).
 */
export const BOARD_CARD_WIDTH =
  "clamp(96px, min(10.5vw, (100vh - 336px) * 0.2456), 150px)";

export const levelRomanNumerals: Record<Card["level"], string> = {
  1: "I",
  2: "II",
  3: "III",
};

export const deckBackPalettes: Record<
  Card["level"],
  { top: string; bottom: string; border: string; ink: string }
> = {
  1: {
    top: "#b48745",
    bottom: "#6e4a1d",
    border: "#efd6a3",
    ink: "#fff6e2",
  },
  2: {
    top: "#8b8ea7",
    bottom: "#4e5167",
    border: "#f0ebd8",
    ink: "#fcf7eb",
  },
  3: {
    top: "#a85e45",
    bottom: "#5d291e",
    border: "#f1d7bc",
    ink: "#fff6ea",
  },
};

export const getCardCostEntries = (card: Card) =>
  GEM_ORDER.map((gem) => [gem, card.cost[gem] ?? 0] as const)
    .filter(([, count]) => count > 0)
    .sort(([, left], [, right]) => right - left);

export const getCardInkColor = (gem: DevelopmentGem) =>
  gem === "diamond" ? "#3b3227" : "#241f19";

const createCardSeed = (card: Card) => {
  const signature = [
    card.level,
    card.gem,
    card.points,
    ...GEM_ORDER.map((gem) => card.cost[gem] ?? 0),
  ].join("-");

  return Array.from(signature).reduce(
    (seed, char, index) => seed + char.charCodeAt(0) * (index + 3),
    17
  );
};

export const getCardArtworkDataUri = (card: Card) => {
  const palette = artworkPalettes[card.gem];
  const seed = createCardSeed(card);
  const horizon = 68 + (seed % 14);
  const orbX = 34 + (seed % 140);
  const orbY = 20 + (seed % 16);
  const orbRadius = 13 + (seed % 10);

  const mountains = Array.from({ length: 3 }, (_, index) => {
    const peakX = 26 + index * 74 + ((seed >> index) % 18);
    const peakY = horizon - 28 - ((seed >> (index + 2)) % 18);
    const leftX = peakX - 46;
    const rightX = peakX + 46;
    const opacity = 0.22 + index * 0.12;

    return `<polygon points="${leftX},${horizon} ${peakX},${peakY} ${rightX},${horizon}" fill="${palette.highlight}" fill-opacity="${opacity.toFixed(
      2
    )}" />`;
  }).join("");

  const buildings = Array.from({ length: 6 }, (_, index) => {
    const width = 20 + ((seed + index * 13) % 18);
    const height = 28 + ((seed + index * 19) % 38);
    const x = 8 + index * 33 + ((seed >> (index + 1)) % 7);
    const y = horizon - height;
    const roofHeight = 8 + ((seed + index * 11) % 9);
    const windowCount = 1 + ((seed + index * 7) % 3);
    const windowSpacing = width / (windowCount + 1);
    const windows = Array.from({ length: windowCount }, (_, windowIndex) => {
      const windowX = x + windowSpacing * (windowIndex + 1) - 2.5;
      const windowY = y + 10 + (windowIndex % 2) * 8;

      return `<rect x="${windowX.toFixed(1)}" y="${windowY.toFixed(
        1
      )}" width="5" height="8" rx="1" fill="${palette.highlight}" fill-opacity="0.55" />`;
    }).join("");

    return `
      <g>
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" fill="${palette.structure}" />
        <polygon points="${x - 3},${y} ${x + width / 2},${y - roofHeight} ${x + width + 3},${y}" fill="${palette.roof}" />
        ${windows}
      </g>
    `;
  }).join("");

  const banners = Array.from({ length: 4 }, (_, index) => {
    const x = 28 + index * 46 + ((seed >> (index + 2)) % 8);
    const y = horizon - 8 - ((seed + index * 5) % 9);
    const height = 18 + ((seed + index * 3) % 7);

    return `
      <g>
        <rect x="${x}" y="${y - height}" width="2.5" height="${height}" fill="${palette.structure}" />
        <path d="M${x + 2.5} ${y - height + 3} H${x + 18} L${x + 12} ${
          y - height + 10
        } L${x + 18} ${y - height + 17} H${x + 2.5} Z" fill="${palette.accent}" fill-opacity="0.88" />
      </g>
    `;
  }).join("");

  const frameAccent = gemColors[card.gem].accent;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 136" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${palette.skyTop}" />
          <stop offset="100%" stop-color="${palette.skyBottom}" />
        </linearGradient>
        <linearGradient id="ground" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${palette.structure}" />
          <stop offset="100%" stop-color="${palette.roof}" />
        </linearGradient>
      </defs>
      <rect width="220" height="136" fill="url(#sky)" />
      <circle cx="${orbX}" cy="${orbY}" r="${orbRadius}" fill="${palette.highlight}" fill-opacity="0.65" />
      ${mountains}
      <rect x="0" y="${horizon}" width="220" height="${136 - horizon}" fill="url(#ground)" />
      <rect x="0" y="${horizon + 16}" width="220" height="4" fill="${frameAccent}" fill-opacity="0.28" />
      ${buildings}
      ${banners}
      <rect x="0" y="0" width="220" height="136" fill="none" stroke="${palette.highlight}" stroke-opacity="0.35" stroke-width="3" />
    </svg>
  `;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const createNobleSeed = (noble: Noble) => {
  const signature = [
    noble.points,
    ...GEM_ORDER.map((gem) => noble.requirements[gem] ?? 0),
  ].join("-");

  return Array.from(signature).reduce(
    (seed, char, index) => seed + char.charCodeAt(0) * (index + 5),
    29
  );
};

/**
 * Regal portrait palettes for noble tiles. Deliberately a different color
 * family from the pale per-gem card artwork (deep velvet drapes, skin-tone
 * busts, gold trim) so nobles never read as development cards.
 */
const noblePalettes = [
  { drapeTop: "#7c2d3e", drapeBottom: "#45161f", robe: "#93404f", trim: "#e3c37b", skin: "#e8c39a" },
  { drapeTop: "#31446e", drapeBottom: "#1a2642", robe: "#465e92", trim: "#d9b45b", skin: "#f0d0ac" },
  { drapeTop: "#54406b", drapeBottom: "#2f2343", robe: "#6d558a", trim: "#e0c07f", skin: "#e4bd93" },
  { drapeTop: "#3f5747", drapeBottom: "#223128", robe: "#567359", trim: "#dcbc72", skin: "#eccaa4" },
  { drapeTop: "#5d4a33", drapeBottom: "#37291b", robe: "#7a6342", trim: "#e7c98a", skin: "#e8c39a" },
] as const;

/**
 * Seeded portrait for a noble tile: a velvet drape and arched alcove from the
 * regal palette family, with a skin-toned bust whose hat/collar shape varies
 * by seed so each noble looks distinct.
 */
export const getNobleArtworkDataUri = (noble: Noble) => {
  const seed = createNobleSeed(noble);
  const palette = noblePalettes[seed % noblePalettes.length];

  const headRadius = 15 + (seed % 5);
  const headY = 52 + (seed % 8);
  const shoulderY = headY + headRadius + 8;
  const collar = 26 + (seed % 8);
  const hatStyle = seed % 3;

  const hat =
    hatStyle === 0
      ? `<path d="M${70 - headRadius - 4} ${headY - headRadius + 6} Q70 ${headY - headRadius - 18} ${70 + headRadius + 4} ${headY - headRadius + 6} Z" fill="${palette.drapeBottom}" />
         <path d="M${70 - headRadius - 4} ${headY - headRadius + 6} H${70 + headRadius + 4}" stroke="${palette.trim}" stroke-width="2.5" />`
      : hatStyle === 1
        ? `<rect x="${70 - headRadius}" y="${headY - headRadius - 11}" width="${headRadius * 2}" height="12" rx="3" fill="${palette.drapeBottom}" />
           <rect x="${70 - headRadius - 5}" y="${headY - headRadius - 2}" width="${headRadius * 2 + 10}" height="5" rx="2.5" fill="${palette.trim}" />`
        : `<circle cx="70" cy="${headY - headRadius - 2}" r="6" fill="${palette.trim}" />
           <path d="M${70 - headRadius + 2} ${headY - headRadius + 4} Q70 ${headY - headRadius - 10} ${70 + headRadius - 2} ${headY - headRadius + 4} Z" fill="${palette.drapeBottom}" />`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="drape" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${palette.drapeTop}" />
          <stop offset="100%" stop-color="${palette.drapeBottom}" />
        </linearGradient>
        <linearGradient id="robe" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.robe}" />
          <stop offset="100%" stop-color="${palette.drapeBottom}" />
        </linearGradient>
      </defs>
      <rect width="140" height="140" fill="url(#drape)" />
      <path d="M14 140 V56 Q14 18 70 18 Q126 18 126 56 V140 Z" fill="#000000" fill-opacity="0.22" />
      <path d="M20 140 V58 Q20 24 70 24 Q120 24 120 58 V140 Z" fill="none" stroke="${palette.trim}" stroke-opacity="0.65" stroke-width="2.5" />
      <path d="M${70 - collar - 14} 140 Q70 ${shoulderY - 14} ${70 + collar + 14} 140 Z" fill="url(#robe)" />
      <path d="M${70 - collar} 140 Q70 ${shoulderY} ${70 + collar} 140 Z" fill="${palette.trim}" fill-opacity="0.35" />
      <circle cx="70" cy="${headY}" r="${headRadius}" fill="${palette.skin}" />
      ${hat}
      <circle cx="70" cy="${shoulderY + 16}" r="4" fill="${palette.trim}" />
      <rect x="0" y="0" width="140" height="140" fill="none" stroke="${palette.trim}" stroke-opacity="0.4" stroke-width="4" />
    </svg>
  `;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
