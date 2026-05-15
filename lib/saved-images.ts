// Client-side store for images the user explicitly saves from the editor.
//
// Backed by IndexedDB so we get ~50MB+ of quota (vs. localStorage's 5-10MB)
// and can store Blobs natively — no base64 inflation, no JSON.stringify of
// huge arrays on every write.
//
// Migration: on first read after upgrading from the old localStorage-backed
// implementation, we drain "postabl:saved" into IndexedDB once, then clear
// the localStorage key so the next visit skips the migration entirely.
//
// Future: when we move to cross-device sync, swap putOne/listAll/deleteOne
// for HTTP calls; the public surface (listSavedImages / addSavedImage /
// deleteSavedImage) and the on-page lifecycle stay the same.

export type SavedImage = {
  id: string;
  blob: Blob;
  format: "png" | "jpg" | "webp";
  createdAt: number;
};

export const MAX_SAVED = 20;

const DB_NAME = "postabl";
const DB_VERSION = 1;
const STORE = "saved_images";
const LEGACY_LS_KEY = "postabl:saved";

// ---- Low-level IDB helpers ------------------------------------------

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
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        // createdAt index keeps "list newest first" cheap if the store grows.
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to open IndexedDB."));
    req.onblocked = () =>
      reject(
        new Error(
          "IndexedDB is blocked by another tab — close other Postabl tabs and retry."
        )
      );
  });
}

async function listAll(): Promise<SavedImage[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as SavedImage[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function putOne(item: SavedImage): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function deleteOne(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ---- One-time localStorage → IndexedDB migration --------------------

let migrationPromise: Promise<void> | null = null;

async function migrateFromLocalStorageOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(LEGACY_LS_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        if (!item?.dataUrl || !item?.id) continue;
        try {
          const res = await fetch(item.dataUrl);
          const blob = await res.blob();
          await putOne({
            id: item.id,
            blob,
            format: item.format ?? "png",
            createdAt: item.createdAt ?? Date.now(),
          });
        } catch {
          // Skip failures so a single bad row can't block migration.
        }
      }
    } finally {
      try {
        window.localStorage.removeItem(LEGACY_LS_KEY);
      } catch {
        // ignore
      }
    }
  })();
  return migrationPromise;
}

// ---- Public API -----------------------------------------------------

export async function listSavedImages(): Promise<SavedImage[]> {
  await migrateFromLocalStorageOnce();
  const all = await listAll();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addSavedImage(input: {
  blob: Blob;
  format: SavedImage["format"];
}): Promise<SavedImage> {
  await migrateFromLocalStorageOnce();
  const next: SavedImage = {
    id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    blob: input.blob,
    format: input.format,
    createdAt: Date.now(),
  };
  try {
    await putOne(next);
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new Error(
        "Couldn't save the image — your browser storage is full. Delete some saved images first."
      );
    }
    throw err;
  }
  // Trim oldest overflow so the cap is respected.
  const all = await listAll();
  if (all.length > MAX_SAVED) {
    const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
    const overflow = sorted.slice(MAX_SAVED);
    for (const old of overflow) {
      try {
        await deleteOne(old.id);
      } catch {
        // best-effort trim
      }
    }
  }
  return next;
}

export async function deleteSavedImage(id: string): Promise<void> {
  await deleteOne(id);
}
