// Client-side helpers for the free-tier download quota. Lives in
// localStorage so it's consistent across /editor and /saved without
// needing extra plumbing.

export const DAILY_FREE_LIMIT = 2;
const DOWNLOADS_KEY = "postabl:downloads";

// YYYY-MM-DD in *local* time. The quota resets at local midnight so a
// user doesn't lose their remaining downloads when UTC rolls over
// mid-afternoon in California.
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type StoredCount = { date?: string; count?: number };

export function getDownloadsUsed(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(DOWNLOADS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as StoredCount;
    if (parsed?.date === todayKey() && typeof parsed.count === "number") {
      return parsed.count;
    }
    // Stale entry from a previous day — clear it so we don't carry it forward.
    window.localStorage.removeItem(DOWNLOADS_KEY);
    return 0;
  } catch {
    return 0;
  }
}

export function bumpDownloads(): number {
  const next = getDownloadsUsed() + 1;
  try {
    window.localStorage.setItem(
      DOWNLOADS_KEY,
      JSON.stringify({ date: todayKey(), count: next })
    );
  } catch {
    // Storage blocked — quota check still works for the current session.
  }
  return next;
}

export function getDownloadsRemaining(used = getDownloadsUsed()): number {
  return Math.max(0, DAILY_FREE_LIMIT - used);
}
