// Persistence for the editor's currently-loaded screenshot.
//
// Was: a single localStorage key, base64 data URL, hard 5-10MB cap.
// Now: IndexedDB, same data URL representation, 50MB+ practical cap.
//
// We keep the data-URL shape (instead of switching to Blob) so the
// rest of the editor — and html-to-image's renderer in particular —
// doesn't need to change. html-to-image's cacheBust option breaks
// when applied to blob URLs (it tries to append ?t=... which blob
// URLs reject), so data URLs are the path of least resistance.
//
// On first read after upgrading from the localStorage backend, any
// existing value gets transparently migrated and the old key is
// cleared so subsequent reads skip the migration entirely.

const DB_NAME = "postabl_screenshot";
const DB_VERSION = 1;
const STORE = "current";
const KEY = "current";
const LEGACY_LS_KEY = "postabl:screenshot";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to open IndexedDB."));
  });
}

async function putValue(value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getValue(): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteValue(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let migrationPromise: Promise<void> | null = null;
async function migrateFromLocalStorageOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    let old: string | null = null;
    try {
      old = window.localStorage.getItem(LEGACY_LS_KEY);
    } catch {
      return;
    }
    if (!old) return;
    try {
      await putValue(old);
    } catch {
      // If IDB write failed (quota or otherwise), don't clear LS —
      // we'd rather keep the old copy than lose the user's data.
      return;
    }
    try {
      window.localStorage.removeItem(LEGACY_LS_KEY);
    } catch {
      // ignore
    }
  })();
  return migrationPromise;
}

// ---- Public API -----------------------------------------------------

export async function loadScreenshot(): Promise<string | null> {
  await migrateFromLocalStorageOnce();
  return getValue();
}

export async function saveScreenshot(dataUrl: string): Promise<void> {
  try {
    await putValue(dataUrl);
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new Error(
        "Couldn't save the screenshot — your browser storage is full."
      );
    }
    throw err;
  }
}

export async function clearScreenshot(): Promise<void> {
  await deleteValue();
  // Belt-and-suspenders: nuke any orphaned localStorage value too.
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LEGACY_LS_KEY);
    } catch {
      // ignore
    }
  }
}
