// Brand Kit — per-user defaults + handle badge that auto-applies on
// every new editor session. Pro-only feature, account-bound, persisted
// server-side (users.brand_kit JSONB) so it follows the user across
// devices.
//
// The shape is intentionally string-typed for ratio/shadow rather than
// importing the editor's enums — that keeps the lib free of editor
// internals and makes schema evolution cheap. The editor validates the
// values when applying.

import {
  encodeCustomBackground,
  isCustomBackgroundId,
  parseCustomBackground,
  sanitizeCustomBackgrounds,
} from "@/lib/custom-background";

export type BadgePosition = "tl" | "tr" | "bl" | "br";
export type BadgeStyle = "light" | "dark";

export type BrandKit = {
  // Handle badge — empty string disables rendering.
  handle: string;
  badgePosition: BadgePosition;
  badgeStyle: BadgeStyle;
  // Whether to include the "· postabl.xyz" subtitle under the handle.
  badgeIncludeWatermark: boolean;

  // Editor defaults applied on fresh sessions (no screenshot loaded).
  // May be a built-in preset id or an encoded `custom:*` id.
  defaultBgId: string;

  // The user's own saved colours, as encoded custom-background ids. Capped
  // at MAX_CUSTOM_BACKGROUNDS. Lives here (rather than in localStorage) so a
  // brand palette follows the account across devices, same as the badge.
  customBackgrounds: string[];
  defaultPadding: number;
  defaultPaddingPreset: "S" | "M" | "L" | "XL";
  defaultShadowPreset: "None" | "Soft" | "Deep" | "Lift";
  defaultWindowStyle: "light" | "dark" | "none";
  defaultRatio: "Auto" | "1:1" | "16:9" | "4:3" | "9:16";
  defaultRadius: number;
};

export const DEFAULT_BRAND_KIT: BrandKit = {
  handle: "",
  badgePosition: "br",
  badgeStyle: "dark",
  badgeIncludeWatermark: false,
  defaultBgId: "peach",
  customBackgrounds: [],
  defaultPadding: 60,
  defaultPaddingPreset: "M",
  defaultShadowPreset: "Deep",
  defaultWindowStyle: "none",
  defaultRatio: "Auto",
  defaultRadius: 10,
};

// Allowed value sets — kept in sync with the editor's RATIO_PRESETS /
// SHADOW_PRESETS / PADDING_PRESETS / windowStyle union.
const BADGE_POSITIONS: readonly BadgePosition[] = ["tl", "tr", "bl", "br"];
const BADGE_STYLES: readonly BadgeStyle[] = ["light", "dark"];
const PADDING_PRESETS = ["S", "M", "L", "XL"] as const;
const SHADOW_PRESETS = ["None", "Soft", "Deep", "Lift"] as const;
const WINDOW_STYLES = ["light", "dark", "none"] as const;
const RATIOS = ["Auto", "1:1", "16:9", "4:3", "9:16"] as const;

function pickEnum<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(max, Math.max(min, v));
}

// Background ids get two different treatments, and the split is the whole
// security story for this field.
//
// A `custom:*` id is the only kind that becomes a raw CSS `background` value,
// so it has to survive a strict parse or we drop it — that's what stops a
// doctored payload putting `url(...)` (or anything else) into a style
// attribute. Every other id is just a lookup key: `findBackground()` falls
// back to the first preset when it doesn't recognise one, so an unknown value
// is inert and we only need to bound its length. Keeping it opaque also means
// this module doesn't have to import the preset table, in line with the note
// at the top of the file.
function pickBgId(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) return "peach";
  if (isCustomBackgroundId(raw)) {
    const parsed = parseCustomBackground(raw);
    return parsed ? encodeCustomBackground(parsed) : "peach";
  }
  return raw.slice(0, 64);
}

// Coerces an untrusted payload into a valid BrandKit. Used by the
// server route before writing and by the client after fetching.
export function sanitizeBrandKit(raw: unknown): BrandKit {
  const r = (raw ?? {}) as Partial<BrandKit>;
  const handle =
    typeof r.handle === "string" ? r.handle.trim().slice(0, 40) : "";
  return {
    handle,
    badgePosition: pickEnum(r.badgePosition, BADGE_POSITIONS, "br"),
    badgeStyle: pickEnum(r.badgeStyle, BADGE_STYLES, "dark"),
    badgeIncludeWatermark: Boolean(r.badgeIncludeWatermark),
    defaultBgId: pickBgId(r.defaultBgId),
    customBackgrounds: sanitizeCustomBackgrounds(r.customBackgrounds),
    defaultPadding: clamp(r.defaultPadding, 20, 160, 60),
    defaultPaddingPreset: pickEnum(r.defaultPaddingPreset, PADDING_PRESETS, "M"),
    defaultShadowPreset: pickEnum(r.defaultShadowPreset, SHADOW_PRESETS, "Deep"),
    defaultWindowStyle: pickEnum(r.defaultWindowStyle, WINDOW_STYLES, "none"),
    defaultRatio: pickEnum(r.defaultRatio, RATIOS, "Auto"),
    defaultRadius: clamp(r.defaultRadius, 0, 40, 10),
  };
}

// ---- Client-side API helpers ---------------------------------------

export async function loadBrandKit(): Promise<BrandKit | null> {
  try {
    const res = await fetch("/api/brand-kit", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.kit ? sanitizeBrandKit(data.kit) : null;
  } catch {
    return null;
  }
}

export async function saveBrandKit(kit: BrandKit): Promise<BrandKit | null> {
  try {
    const res = await fetch("/api/brand-kit", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(kit),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error ?? `Save failed (${res.status})`);
    }
    const data = await res.json();
    return data?.kit ? sanitizeBrandKit(data.kit) : null;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Couldn't save your brand kit.");
  }
}

export async function clearBrandKit(): Promise<void> {
  try {
    await fetch("/api/brand-kit", { method: "DELETE" });
  } catch {
    // ignore — caller's UI should refetch to confirm state
  }
}
