"use client";

// /saved — gallery of compositions the user has explicitly saved from
// the editor. Auth-gated by middleware. The free-tier daily download
// quota (DAILY_FREE_LIMIT) still applies when downloading from here so
// users can't bypass the gate by saving first and downloading later.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DAILY_FREE_LIMIT,
  bumpDownloads,
  getDownloadsUsed,
  getIsPro,
} from "@/lib/free-downloads";
import {
  MAX_SAVED,
  type SavedImage,
  deleteSavedImage,
  listSavedImages,
} from "@/lib/saved-images";
import {
  clearAllLocalData,
  getLastUserId,
  setLastUserId,
} from "@/lib/local-data";
import { useNotify } from "@/components/notify";

type MeUser =
  | {
      id: string;
      email: string;
      name: string;
      isPro: boolean;
      subscriptionStatus: string | null;
      currentPeriodEnd: string | null;
    }
  | null;

const IS_DEV = process.env.NODE_ENV === "development";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}

export default function SavedPage() {
  const [images, setImages] = useState<SavedImage[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadsUsed, setDownloadsUsed] = useState(0);
  // Dev-only Pro override (mirrors the editor). Effective `isPro`
  // below combines this with the server-side flag from /me.
  const [devProOverride, setDevProOverride] = useState(false);
  const [me, setMe] = useState<MeUser>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const notify = useNotify();

  // Hydrate from IndexedDB. We mirror the editor's pattern: render an
  // empty/skeleton state on the server, then load real data after mount
  // so SSR and client agree on the initial markup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listSavedImages();
        if (cancelled) return;
        setImages(list);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setLoadError(
          err instanceof Error
            ? err.message
            : "Couldn't load your saved images."
        );
      } finally {
        if (!cancelled) {
          setDownloadsUsed(getDownloadsUsed());
          if (IS_DEV) setDevProOverride(getIsPro());
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mint object URLs for the loaded blobs and revoke them on unmount /
  // when the list changes. Without revoke, navigating away leaks the
  // blob memory until the tab closes.
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const img of images) {
      next[img.id] = URL.createObjectURL(img.blob);
    }
    setImageUrls(next);
    return () => {
      for (const url of Object.values(next)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [images]);

  // Hydrate /me + account-switch guard. Local IDB/localStorage are
  // origin-scoped, so if Account B navigates here after Account A
  // signed out, they'd inherit A's library. Wipe on user mismatch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        const newId: string | null = data.user?.id ?? null;
        const lastId = getLastUserId();
        if (lastId && newId && lastId !== newId) {
          await clearAllLocalData();
          setImages([]);
          setImageUrls({});
          setDownloadsUsed(0);
          if (IS_DEV) setDevProOverride(false);
        }
        setLastUserId(newId);
        setMe(data.user);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleDocClick(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [userMenuOpen]);

  async function handleSignout() {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // ignore
    }
    // Same rationale as the editor's handleSignout — see lib/local-data.ts.
    await clearAllLocalData();
    setMe(null);
    setUserMenuOpen(false);
    setImages([]);
    setImageUrls({});
    setDownloadsUsed(0);
    if (IS_DEV) setDevProOverride(false);
    router.push("/signin");
    router.refresh();
  }

  // Effective Pro state — server is canonical, dev override is purely
  // a local convenience that does nothing in a production build.
  const serverIsPro = me?.isPro ?? false;
  const isPro = serverIsPro || (IS_DEV && devProOverride);

  const downloadsRemaining = Math.max(0, DAILY_FREE_LIMIT - downloadsUsed);
  const outOfFreeDownloads = !isPro && downloadsRemaining <= 0;

  function handleDownload(img: SavedImage) {
    if (outOfFreeDownloads) {
      notify.toast(
        `Daily limit reached (${DAILY_FREE_LIMIT}). Upgrade to Pro for unlimited exports.`,
        { tone: "error", duration: 5000 }
      );
      return;
    }
    // Mint a fresh object URL just for the download so we can revoke it
    // immediately after the click — the displayed grid keeps its own URL
    // alive in imageUrls.
    const url = URL.createObjectURL(img.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `postabl-${img.id}.${img.format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (!isPro) {
      const next = bumpDownloads();
      setDownloadsUsed(next);
    }
  }

  async function handleDelete(id: string) {
    const ok = await notify.confirm({
      title: "Remove this saved image?",
      description: "This can't be undone.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSavedImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      notify.toast("Removed.", { tone: "success", duration: 2000 });
    } catch (err) {
      console.error(err);
      notify.toast(
        err instanceof Error
          ? err.message
          : "Couldn't remove that image. Try again.",
        { tone: "error" }
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-sm text-ink">
      {/* TOP BAR — same layout as the editor so the navigation feels consistent. */}
      <header className="z-10 flex h-[56px] items-center justify-between border-b border-line bg-bg px-5">
        <div className="flex items-center gap-4">
          <Link
            href="/editor"
            className="flex items-baseline gap-[2px] font-serif text-[19px] font-medium tracking-tight text-ink"
          >
            postabl
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          </Link>
          <div className="h-5 w-px bg-line" />
          <div className="font-mono text-xs tracking-wide text-ink-soft">
            saved <span className="text-ink-faint">/ your library</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPro ? (
            <div className="rounded-full border border-line bg-bg-alt px-2.5 py-1 font-mono text-[11px] tracking-wide text-ink-faint">
              <strong className="font-medium text-ink">∞</strong> UNLIMITED
              DOWNLOADS
            </div>
          ) : (
            <div
              className={`rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-wide ${
                outOfFreeDownloads
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line bg-bg-alt text-ink-faint"
              }`}
              title={`You've used ${downloadsUsed} of ${DAILY_FREE_LIMIT} free downloads today.`}
            >
              <strong
                className={`font-medium ${
                  outOfFreeDownloads ? "text-accent" : "text-ink"
                }`}
              >
                {downloadsRemaining}
              </strong>
              /{DAILY_FREE_LIMIT}{" "}
              {outOfFreeDownloads
                ? "LIMIT REACHED"
                : "FREE DOWNLOADS LEFT"}
            </div>
          )}
          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
          >
            ← Back to editor
          </Link>
          {meLoading ? (
            <div className="h-[30px] w-[30px] animate-pulse rounded-full bg-bg-alt" />
          ) : me ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                title={`${me.name} — ${me.email}`}
                className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-accent text-xs font-medium uppercase text-white transition-all hover:ring-2 hover:ring-accent/30"
              >
                {me.name.trim().charAt(0) || me.email.charAt(0)}
              </button>
              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[38px] z-20 w-56 overflow-hidden rounded-lg border border-line bg-white shadow-tools"
                >
                  <div className="border-b border-line px-3.5 py-3">
                    <div className="truncate text-[13px] font-medium text-ink">
                      {me.name}
                    </div>
                    <div className="truncate font-mono text-[11px] text-ink-faint">
                      {me.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignout}
                    className="block w-full px-3.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-bg-alt hover:text-ink"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-[34px] font-medium leading-[1.1] tracking-tight">
              Saved images
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-[1.55] text-ink-soft">
              Compositions you saved from the editor. Capped at {MAX_SAVED}.
              Downloads still count against your daily free quota.
            </p>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            {hydrated ? `${images.length}/${MAX_SAVED}` : "—"}
          </div>
        </div>

        {/* Be honest about where these live until cross-device sync ships. */}
        <div className="mb-7 flex items-start gap-2.5 rounded-lg border border-line bg-bg-alt/60 px-3.5 py-2.5 text-[12px] leading-[1.5] text-ink-soft">
          <span aria-hidden className="mt-[1px] text-ink-faint">ⓘ</span>
          <span>
            Saved images live in this browser only. Clearing your browser
            data, switching browsers, or signing in on another device will
            not bring them with you. Cross-device sync is on the roadmap.
          </span>
        </div>

        {loadError ? (
          <div className="rounded-xl border border-accent/30 bg-accent/5 px-5 py-6 text-center">
            <h2 className="font-serif text-lg font-medium tracking-tight text-ink">
              Couldn&apos;t load your saved images
            </h2>
            <p className="mx-auto mt-1 max-w-md text-[12px] leading-[1.55] text-ink-soft">
              {loadError} If you&apos;re in a private window, your browser may
              be blocking storage. Try a regular window.
            </p>
          </div>
        ) : !hydrated ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[16/10] animate-pulse rounded-xl border border-line bg-bg-alt"
              />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-bg-alt/40 px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white text-lg text-ink-soft">
              ⌘
            </div>
            <h2 className="font-serif text-xl font-medium tracking-tight text-ink">
              Nothing saved yet
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-[1.55] text-ink-soft">
              Save a composition from the editor and it&apos;ll show up here
              ready to download.
            </p>
            <Link
              href="/editor"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-bg transition-all hover:bg-black"
            >
              Open editor →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:shadow-tools"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-bg-alt">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrls[img.id]}
                    alt="Saved composition"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line px-3.5 py-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {img.format} · {formatRelative(img.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(img)}
                      disabled={outOfFreeDownloads}
                      title={
                        outOfFreeDownloads
                          ? "Daily free limit reached — upgrade to Pro or come back tomorrow"
                          : "Download this image"
                      }
                      className="rounded-md border border-line bg-transparent px-2.5 py-1 font-mono text-[11px] text-ink-soft transition-all hover:bg-bg-alt hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ↓ Download
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(img.id)}
                      aria-label="Delete from library"
                      title="Remove from library"
                      className="rounded-md border border-line bg-transparent px-2 py-1 font-mono text-[11px] text-ink-soft transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
