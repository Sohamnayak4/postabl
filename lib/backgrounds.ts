// Shared background palettes — used by the editor's picker AND the
// Brand Kit settings page (which lets users set a default background).
// Keep canonical here so the two stay in sync.

import type { CSSProperties } from "react";
import {
  customBackgroundCss,
  customBackgroundLabel,
  parseCustomBackground,
} from "@/lib/custom-background";

export type Background = {
  id: string;
  label: string;
  style: CSSProperties;
};

export const BACKGROUNDS: Background[] = [
  {
    id: "peach",
    label: "Peach",
    style: {
      background:
        "radial-gradient(circle at 30% 20%, #fce4b6, transparent 50%), radial-gradient(circle at 80% 80%, #e8a598, transparent 50%), linear-gradient(135deg, #f4c896, #d98a7a)",
    },
  },
  { id: "forest", label: "Forest", style: { background: "linear-gradient(135deg, #2d3b3a, #0f1816)" } },
  { id: "stone", label: "Stone", style: { background: "linear-gradient(135deg, #e8e3d8, #c9c2b0)" } },
  { id: "noir", label: "Noir", style: { background: "#1a1a1a" } },
  { id: "paper", label: "Paper", style: { background: "#f0ede5" } },
  { id: "ember", label: "Ember", style: { background: "linear-gradient(135deg, #d94f2e, #b33a1e)" } },
  { id: "moss", label: "Moss", style: { background: "linear-gradient(135deg, #4a5d4e, #2d3b3a)" } },
  {
    id: "stripes",
    label: "Stripes",
    style: {
      background:
        "repeating-linear-gradient(45deg, #e8e3d8, #e8e3d8 10px, #d9d4c7 10px, #d9d4c7 11px)",
    },
  },
  {
    id: "spotlight",
    label: "Spotlight",
    style: { background: "radial-gradient(circle at 50% 50%, #fff 0%, #c9c2b0 100%)" },
  },
  { id: "sand", label: "Sand", style: { background: "linear-gradient(180deg, #e5deca, #c1b799)" } },
  { id: "midnight", label: "Midnight", style: { background: "linear-gradient(135deg, #16213e, #0f3460)" } },

  // Light & pastel —
  { id: "blush", label: "Blush", style: { background: "linear-gradient(135deg, #fce1e4, #f8c7cc)" } },
  { id: "mint", label: "Mint", style: { background: "linear-gradient(135deg, #d9ece2, #bfddcf)" } },
  { id: "sky", label: "Sky", style: { background: "linear-gradient(135deg, #dbe8f4, #a9c5e2)" } },
  { id: "lilac", label: "Lilac", style: { background: "linear-gradient(135deg, #e8e0ed, #cfc0db)" } },
  { id: "butter", label: "Butter", style: { background: "linear-gradient(135deg, #fbf0d0, #f2dca0)" } },
  { id: "fog", label: "Fog", style: { background: "linear-gradient(180deg, #eceff2, #c9ccd1)" } },

  // Warm —
  { id: "coral", label: "Coral", style: { background: "linear-gradient(135deg, #ffc2a8, #ff8b6b)" } },
  { id: "amber", label: "Amber", style: { background: "linear-gradient(135deg, #fbe0a2, #d99b4e)" } },
  { id: "desert", label: "Desert", style: { background: "linear-gradient(135deg, #eac6a1, #c48758)" } },
  { id: "rose", label: "Rose", style: { background: "linear-gradient(135deg, #eba1ad, #c4566b)" } },
  { id: "terracotta", label: "Terracotta", style: { background: "linear-gradient(135deg, #c97b5a, #8b3a1e)" } },

  // Cool / earthy —
  { id: "sage", label: "Sage", style: { background: "linear-gradient(135deg, #b5c3a5, #7d8b6f)" } },
  { id: "ocean", label: "Ocean", style: { background: "linear-gradient(135deg, #4a8fa8, #1f3d5a)" } },
  { id: "lagoon", label: "Lagoon", style: { background: "linear-gradient(135deg, #7ab8a8, #3b6e68)" } },
  { id: "denim", label: "Denim", style: { background: "linear-gradient(135deg, #5a7aa0, #2d4565)" } },

  // Dark / moody —
  { id: "slate", label: "Slate", style: { background: "linear-gradient(135deg, #b4b8c0, #6e737d)" } },
  { id: "graphite", label: "Graphite", style: { background: "linear-gradient(135deg, #3a3a3a, #151515)" } },
  { id: "plum", label: "Plum", style: { background: "linear-gradient(135deg, #6b4a72, #2e1a36)" } },
  { id: "wine", label: "Wine", style: { background: "linear-gradient(135deg, #6e2a3a, #3a1520)" } },

  // Mesh gradients —
  {
    id: "sunset",
    label: "Sunset",
    style: {
      background:
        "radial-gradient(circle at 20% 20%, #ffd5a8, transparent 55%), radial-gradient(circle at 80% 30%, #ff9a8b, transparent 55%), radial-gradient(circle at 60% 80%, #a66ea0, transparent 55%), linear-gradient(135deg, #ffb088, #c96a7d)",
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    style: {
      background:
        "radial-gradient(circle at 25% 30%, #9fd9c9, transparent 55%), radial-gradient(circle at 75% 20%, #6a9fd1, transparent 55%), radial-gradient(circle at 60% 80%, #9d7fd1, transparent 55%), linear-gradient(135deg, #4a6b8c, #2a3f5a)",
    },
  },
  {
    id: "citrus",
    label: "Citrus",
    style: {
      background:
        "radial-gradient(circle at 30% 30%, #fff4a3, transparent 55%), radial-gradient(circle at 80% 70%, #c7d86b, transparent 55%), linear-gradient(135deg, #f6e38e, #9fb04e)",
    },
  },
  {
    id: "berry",
    label: "Berry",
    style: {
      background:
        "radial-gradient(circle at 20% 30%, #f0a9c2, transparent 55%), radial-gradient(circle at 80% 70%, #9a5ba0, transparent 55%), linear-gradient(135deg, #c86f91, #5a2b5c)",
    },
  },
  {
    id: "twilight",
    label: "Twilight",
    style: {
      background:
        "radial-gradient(circle at 25% 80%, #d94f2e40, transparent 55%), radial-gradient(circle at 75% 25%, #4a6b8c60, transparent 55%), linear-gradient(135deg, #1a1a2e, #0d1020)",
    },
  },

  // "Custom" is editor-only — the dashed-border placeholder for a
  // future bring-your-own-image background. The Brand Kit picker
  // should filter this out via the helper below.
  {
    id: "dashed",
    label: "Custom",
    style: {
      background: "linear-gradient(135deg, #fafafa, #e5e5e5)",
      border: "1px dashed var(--line-strong)",
    },
  },
];

// Pattern backgrounds — Pro-gated in the editor. The Brand Kit can
// reference a pattern as its default (Pro users already have access).
export const PATTERNS: Background[] = [
  {
    id: "pattern-dots",
    label: "Dots",
    style: {
      backgroundImage:
        "radial-gradient(circle, #c9c2b0 1px, transparent 1px)",
      backgroundSize: "8px 8px",
      backgroundColor: "#f0ede5",
    },
  },
  {
    id: "pattern-lines-v",
    label: "Vertical lines",
    style: {
      background:
        "repeating-linear-gradient(90deg, #f0ede5, #f0ede5 8px, #e4e0d4 8px, #e4e0d4 9px)",
    },
  },
  {
    id: "pattern-lines-diag",
    label: "Diagonal lines",
    style: {
      background:
        "repeating-linear-gradient(45deg, #f0ede5, #f0ede5 4px, #e4e0d4 4px, #e4e0d4 5px)",
    },
  },
];

// The editor's "Custom" tile. Kept in BACKGROUNDS so any bgId already
// persisted as "dashed" still resolves to something, but the pickers pull
// it out and render it as the launcher for the colour editor rather than
// as a selectable swatch.
export const CUSTOM_TILE_ID = "dashed";

// The real presets — everything except that launcher. This is what both
// pickers actually render.
export const PRESET_BACKGROUNDS: Background[] = BACKGROUNDS.filter(
  (b) => b.id !== CUSTOM_TILE_ID
);

// Find a background by id, falling back to the first preset. Used by the
// editor when resolving the stored bgId after a brand kit auto-apply.
//
// `custom:*` ids carry their own colours (see lib/custom-background.ts) and
// are synthesised on the fly, so a Pro user's own palette resolves through
// exactly the same call as the built-in presets — which is why the editor
// canvas, the export, the Brand Kit preview and the landing page all pick
// custom backgrounds up without any of them knowing this feature exists.
export function findBackground(id: string): Background {
  const custom = parseCustomBackground(id);
  if (custom) {
    return {
      id,
      label: customBackgroundLabel(custom),
      style: { background: customBackgroundCss(custom) },
    };
  }
  return (
    [...BACKGROUNDS, ...PATTERNS].find((b) => b.id === id) ?? BACKGROUNDS[0]
  );
}
