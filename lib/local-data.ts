// Per-user local-state lifecycle.
//
// localStorage and IndexedDB are scoped to the origin, not the user. So
// when User A signs out on a device and User B signs in (or even just
// uses the device without signing in), B sees A's saved-images library,
// A's in-progress screenshot, A's free-download count, etc. — a real
// privacy + correctness bug.
//
// Fix: call clearAllLocalData() on (1) explicit signout and (2) any
// /api/auth/me response whose user.id differs from the last-seen one.
// We track the last-seen id under postabl:last-user-id so the comparison
// also catches OAuth account switches that skip our signout endpoint.
//
// IDB DB names are duplicated here intentionally — keep in sync with
// lib/saved-images.ts and lib/screenshot-store.ts.

const SAVED_IMAGES_DB = "postabl";
const SCREENSHOT_DB = "postabl_screenshot";

const LS_KEYS_TO_CLEAR = [
  "postabl:downloads",         // daily free-download counter
  "postabl:isPro",             // dev-only Pro toggle
  "postabl:editor-stash",      // pre-signin editor state stash
  "postabl:url-tip-dismissed", // URL-bar editability hint
  "postabl:saved",             // legacy pre-IDB saved images
  "postabl:screenshot",        // legacy pre-IDB current screenshot
];

const LAST_USER_KEY = "postabl:last-user-id";

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve();
      const req = indexedDB.deleteDatabase(name);
      // Resolve on success, error, AND blocked — we don't want a hung
      // tab from another origin holding the DB open to stall signout.
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearAllLocalData(): Promise<void> {
  if (typeof window === "undefined") return;
  await Promise.all([deleteDb(SAVED_IMAGES_DB), deleteDb(SCREENSHOT_DB)]);
  try {
    for (const key of LS_KEYS_TO_CLEAR) {
      window.localStorage.removeItem(key);
    }
    // Also clear the last-user marker — fresh state for whoever's next.
    window.localStorage.removeItem(LAST_USER_KEY);
  } catch {
    // Storage blocked — IDB wipe was the important part anyway.
  }
}

export function getLastUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_USER_KEY);
  } catch {
    return null;
  }
}

export function setLastUserId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(LAST_USER_KEY, id);
    } else {
      window.localStorage.removeItem(LAST_USER_KEY);
    }
  } catch {
    // ignore
  }
}
