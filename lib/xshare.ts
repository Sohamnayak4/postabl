// X profile cards (/xshare) — shared types, layout table and formatting
// helpers used by the page, the card component and the two API routes.
//
// Profile data comes from api.fxtwitter.com, a free public mirror of X's
// profile endpoint. No key, no account, so nothing here needs an env var
// — which is why /xshare works for anonymous visitors just like /editor.
//
// Cards are rendered as a self-contained 16:9 tile with no padding or
// background of their own. That's deliberate: "Edit in Postabl" hands
// the exported PNG to the editor as if it were an uploaded screenshot,
// and the editor is what supplies the background, padding and shadow.

export type XProfile = {
  name: string;
  username: string;
  followers: number;
  following: number;
  avatarUrl: string;
  bannerUrl: string | null;
  verified: boolean;
};

export type XProfileResponse =
  | { ok: true; profile: XProfile }
  | { ok: false; error: string; code?: string };

export type CardStyleId = "studio" | "minimal" | "wash" | "strip";

export type CardStyle = {
  id: CardStyleId;
  name: string;
  description: string;
  // Layouts that need a banner image are disabled for profiles without
  // one rather than silently falling back to a flat colour.
  hasBanner: boolean;
};

export const CARD_STYLES: CardStyle[] = [
  {
    id: "studio",
    name: "Studio",
    description: "Portrait left, stats right",
    hasBanner: false,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Centred avatar, open space",
    hasBanner: false,
  },
  {
    id: "wash",
    name: "Wash",
    description: "Banner washed out behind",
    hasBanner: true,
  },
  {
    id: "strip",
    name: "Strip",
    description: "Banner as a top band",
    hasBanner: true,
  },
];

export const DEFAULT_CARD_STYLE: CardStyleId = "studio";

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

// Paths on x.com that are routes, not people.
const RESERVED_HANDLES = new Set([
  "home",
  "explore",
  "search",
  "settings",
  "i",
  "intent",
  "share",
  "hashtag",
  "login",
  "signup",
  "messages",
  "notifications",
  "compose",
]);

/**
 * Extract an X username from a profile URL, an @handle, or a bare handle.
 * Returns null when the input can't be read as one of those.
 */
export function parseHandle(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare `@handle` / `handle` — no dots or slashes to confuse for a URL.
  const bare = trimmed.replace(/^@/, "");
  if (HANDLE_RE.test(bare) && !trimmed.includes("/") && !trimmed.includes(".")) {
    return bare;
  }

  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (
      host !== "x.com" &&
      host !== "twitter.com" &&
      host !== "mobile.twitter.com"
    ) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const candidate = segments[0];
    if (RESERVED_HANDLES.has(candidate.toLowerCase())) return null;
    return HANDLE_RE.test(candidate) ? candidate : null;
  } catch {
    // Not URL-parseable — last try at pulling a handle out of the text.
    const match = trimmed.match(
      /(?:x\.com|twitter\.com)\/(@?[A-Za-z0-9_]{1,15})/i
    );
    if (!match) return null;
    const h = match[1].replace(/^@/, "");
    return HANDLE_RE.test(h) ? h : null;
  }
}

/** 3216 → "3.2K". Keeps follower counts to a glanceable width on the card. */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs < 1000) return String(n);
  if (abs < 1_000_000) return `${trimDecimal(n / 1000)}K`;
  if (abs < 1_000_000_000) return `${trimDecimal(n / 1_000_000)}M`;
  return `${trimDecimal(n / 1_000_000_000)}B`;
}

function trimDecimal(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Swap X's `_normal` avatar variant for the 400px one. */
export function upgradeAvatarUrl(url: string): string {
  return url.replace(/_normal(\.\w+)$/, "_400x400$1");
}

/**
 * Route remote X media through our own origin. html-to-image renders to a
 * canvas, and a canvas that has drawn a cross-origin image is tainted —
 * `toPng`/`toBlob` then throw. Same-origin proxying is what keeps export,
 * copy and the editor handoff working.
 */
export function proxiedMedia(url: string | null): string | null {
  if (!url) return null;
  return `/api/xshare/avatar?url=${encodeURIComponent(url)}`;
}
