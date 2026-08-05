// User-authored backgrounds (Pro) — encoded into the background id itself.
//
// The rest of the app treats a background as an opaque string id: the editor
// holds `bgId`, the pre-signin stash persists it, and the Brand Kit stores it
// as `defaultBgId`. Encoding a custom colour *into* that id means all three
// keep working untouched — no parallel state field, no DB migration.
//
//   custom:solid:d94f2e
//   custom:linear:135:fce4b6:d98a7a
//
// SECURITY — the encoded id round-trips through Postgres (users.brand_kit) and
// comes back out as a CSS `background` value. So nothing here ever stores or
// echoes raw CSS: we parse to a strict struct (six-digit hex, integer angle)
// and *regenerate* the CSS ourselves. A hostile stored value like
// `url(https://evil.example/pixel)` can't survive the parse, so it can never
// reach the style attribute and fire a request when someone's canvas renders.
//
// This module is deliberately dependency-free (no React, no editor imports) so
// both the client picker and the server-side brand-kit sanitiser can use it.

export type CustomBackground =
  | { kind: "solid"; from: string }
  | { kind: "linear"; angle: number; from: string; to: string };

/** How many saved swatches a Pro user's palette holds. */
export const MAX_CUSTOM_BACKGROUNDS = 8;

const PREFIX = "custom:";
const HEX_RE = /^[0-9a-f]{6}$/;

/**
 * Coerce user input to a bare six-digit lowercase hex, or null.
 * Accepts `#abc`, `abc`, `#AABBCC`, `aabbcc`.
 */
export function normalizeHex(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(v)) {
    return v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
  }
  return HEX_RE.test(v) ? v : null;
}

function normalizeAngle(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  // Wrap rather than reject so a slider that runs past 360 still works.
  const wrapped = ((Math.round(n) % 360) + 360) % 360;
  return wrapped;
}

export function isCustomBackgroundId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith(PREFIX);
}

export function encodeCustomBackground(bg: CustomBackground): string {
  return bg.kind === "solid"
    ? `${PREFIX}solid:${bg.from}`
    : `${PREFIX}linear:${bg.angle}:${bg.from}:${bg.to}`;
}

/**
 * Parse an encoded id back to a struct. Returns null for anything that isn't
 * exactly one of the two supported shapes — this is the trust boundary, so it
 * rejects rather than repairs.
 */
export function parseCustomBackground(id: unknown): CustomBackground | null {
  if (typeof id !== "string" || !id.startsWith(PREFIX)) return null;
  const parts = id.slice(PREFIX.length).split(":");

  if (parts[0] === "solid" && parts.length === 2) {
    const from = normalizeHex(parts[1]);
    return from ? { kind: "solid", from } : null;
  }

  if (parts[0] === "linear" && parts.length === 4) {
    const angle = normalizeAngle(parts[1]);
    const from = normalizeHex(parts[2]);
    const to = normalizeHex(parts[3]);
    if (angle === null || !from || !to) return null;
    return { kind: "linear", angle, from, to };
  }

  return null;
}

/** Build the CSS `background` value. Only ever called with parsed input. */
export function customBackgroundCss(bg: CustomBackground): string {
  return bg.kind === "solid"
    ? `#${bg.from}`
    : `linear-gradient(${bg.angle}deg, #${bg.from}, #${bg.to})`;
}

/**
 * Round-trip helper: encoded id → CSS, or null if the id isn't a valid
 * custom background. Callers use the null to fall through to the presets.
 */
export function customBackgroundCssFromId(id: unknown): string | null {
  const parsed = parseCustomBackground(id);
  return parsed ? customBackgroundCss(parsed) : null;
}

/** Short human label for a swatch tooltip, e.g. "#d94f2e → #b33a1e". */
export function customBackgroundLabel(bg: CustomBackground): string {
  return bg.kind === "solid"
    ? `#${bg.from}`
    : `#${bg.from} → #${bg.to} · ${bg.angle}°`;
}

/**
 * Drop invalid and duplicate entries from a stored palette and cap its length.
 * Used by the brand-kit sanitiser and before every write from the client.
 */
export function sanitizeCustomBackgrounds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const parsed = parseCustomBackground(entry);
    if (!parsed) continue;
    // Re-encode so the stored form is always canonical (lowercase hex,
    // wrapped angle) and dedupe on that canonical string.
    const id = encodeCustomBackground(parsed);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_CUSTOM_BACKGROUNDS) break;
  }
  return out;
}
