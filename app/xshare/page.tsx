"use client";

// /xshare — paste an X profile, get a card worth posting.
//
// A second entry point into the same funnel as /editor: the card people
// come here to make is a Postabl-styled image, and "Edit in Postabl"
// hands it straight to the editor as if they'd uploaded it. Ungated for
// the same reason /editor is — the sign-in moment belongs at Download,
// not at the front door.

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toBlob, toPng } from "html-to-image";
import { XshareCard } from "@/components/xshare-card";
import { useNotify } from "@/components/notify";
import { saveScreenshot } from "@/lib/screenshot-store";
import {
  CARD_STYLES,
  DEFAULT_CARD_STYLE,
  type CardStyleId,
  type XProfile,
  type XProfileResponse,
} from "@/lib/xshare";

// Card exports are 2× so a 16:9 tile lands at 1440×810 — comfortably
// above X's in-timeline downscale.
//
// skipFonts matches the editor: html-to-image otherwise tries to inline
// every @font-face by reading document.styleSheets, and our only source
// of those is the cross-origin Google Fonts sheet — so it can never
// succeed and just throws a SecurityError into the console on every
// export. The browser rasterises with the already-loaded fonts either
// way, so the output is byte-for-byte the same without the noise.
const EXPORT_OPTS = { pixelRatio: 2, cacheBust: true, skipFonts: true };

// html-to-image reads from <img> elements synchronously, so anything
// still in flight rasterises as a blank box. Wait them out first.
async function waitForImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

export default function XsharePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<XProfile | null>(null);
  const [cardStyle, setCardStyle] = useState<CardStyleId>(DEFAULT_CARD_STYLE);
  const [busy, setBusy] = useState<null | "copy" | "download" | "editor">(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const notify = useNotify();
  const router = useRouter();

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/xshare/profile?q=${encodeURIComponent(query.trim())}`
      );
      const data = (await res.json()) as XProfileResponse;

      if (!data.ok) {
        setProfile(null);
        setError(data.error);
        return;
      }

      setProfile(data.profile);
      // Banner layouts would render an empty band for a profile with no
      // banner, so fall back rather than show a broken-looking card.
      if (
        (cardStyle === "wash" || cardStyle === "strip") &&
        !data.profile.bannerUrl
      ) {
        setCardStyle("studio");
      }
    } catch {
      setProfile(null);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // First toPng pass is a warm-up: it pulls the proxied avatar and banner
  // through html-to-image's inliner, which is unreliable on a cold first
  // render, so the second, real pass comes back complete.
  const renderCard = useCallback(async () => {
    const node = cardRef.current;
    if (!node) throw new Error("Card isn't ready yet.");
    await waitForImages(node);
    await toPng(node, EXPORT_OPTS);
    return node;
  }, []);

  async function handleCopy() {
    if (!profile) return;
    setBusy("copy");
    try {
      const node = await renderCard();
      const blob = await toBlob(node, EXPORT_OPTS);
      if (!blob) throw new Error("Couldn't render the card.");

      const canWrite =
        typeof navigator !== "undefined" &&
        !!navigator.clipboard &&
        typeof ClipboardItem !== "undefined";
      if (!canWrite) throw new Error("Clipboard isn't available here.");

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      notify.toast("Card copied — paste it straight into a post.", {
        tone: "success",
        duration: 2400,
      });
    } catch (err) {
      notify.toast(
        err instanceof Error ? err.message : "Couldn't copy the card.",
        { tone: "error" }
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    if (!profile) return;
    setBusy("download");
    try {
      const node = await renderCard();
      const dataUrl = await toPng(node, EXPORT_OPTS);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `postabl-${profile.username}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      notify.toast("Couldn't download the card. Try again.", { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  // The handoff: rasterise the card, stash it where the editor looks for
  // its current screenshot (IndexedDB, via screenshot-store), then push
  // to /editor — which hydrates from that store on mount. From the
  // editor's point of view this is indistinguishable from an upload.
  async function handleEditInPostabl() {
    if (!profile) return;
    setBusy("editor");
    try {
      const node = await renderCard();
      const dataUrl = await toPng(node, EXPORT_OPTS);
      await saveScreenshot(dataUrl);
      router.push("/editor");
    } catch (err) {
      notify.toast(
        err instanceof Error
          ? err.message
          : "Couldn't open that card in the editor.",
        { tone: "error" }
      );
      setBusy(null);
    }
  }

  const hasBanner = Boolean(profile?.bannerUrl);
  const anyBusy = busy !== null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-bg text-ink">
      <div className="grain-overlay grain-overlay-subtle" />

      {/* TOP BAR — same lockup as the editor and library so moving
          between the three feels like one app. */}
      <header className="relative z-10 flex h-14 items-center justify-between border-b border-line bg-bg px-4 md:h-[56px] md:px-5">
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/editor"
            className="flex items-baseline gap-[2px] font-serif text-[17px] font-medium tracking-tight text-ink md:text-[19px]"
          >
            postabl
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          </Link>
          <div className="hidden h-5 w-px bg-line md:block" />
          <div className="hidden font-mono text-xs tracking-wide text-ink-soft md:block">
            xshare <span className="text-ink-faint">/ profile cards</span>
          </div>
        </div>
        <Link
          href="/editor"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink md:px-3.5"
        >
          ← <span className="hidden sm:inline">Back to</span> editor
        </Link>
      </header>

      <main className="relative z-[2] mx-auto w-full max-w-[900px] flex-1 px-5 pb-20 pt-10 md:px-10 md:pt-16">
        {/* HEADER */}
        <div className="mb-8 md:mb-12">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-bg-alt px-[12px] py-[5px] font-mono text-[10px] uppercase tracking-wider text-ink-faint md:px-[14px] md:py-[6px]">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
            New — profile cards
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
            <h1 className="font-serif text-[44px] font-normal leading-[0.95] tracking-[-1.5px] md:text-[72px] md:tracking-[-3px]">
              Your profile,{" "}
              <em className="text-accent not-italic">framed.</em>
            </h1>
            <p className="max-w-[300px] text-[15px] leading-[1.5] text-ink-soft md:pb-3 md:text-right md:text-base">
              Paste any X profile. Get a card worth posting — then take it
              into the editor.
            </p>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={generate} className="w-full">
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-bg-alt p-2 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-4">
              <span
                className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-faint sm:inline"
                aria-hidden
              >
                URL
              </span>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="x.com/username or @handle"
                aria-label="X profile link or username"
                aria-invalid={Boolean(error)}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="shrink-0 rounded-xl bg-ink px-6 py-3 text-sm font-medium text-bg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Making card…" : "Make card"}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-3 text-center text-sm font-medium text-accent"
            >
              {error}
            </p>
          )}
        </form>

        {/* RESULT */}
        <div className="mt-10 md:mt-14">
          {loading ? (
            <div
              className="w-full overflow-hidden rounded-xl border border-line bg-bg-alt"
              style={{ aspectRatio: "16 / 9" }}
              aria-busy
              aria-label="Loading profile"
            >
              <div className="flex h-full gap-5 p-6">
                <div className="w-[36%] animate-pulse rounded-lg bg-line/60" />
                <div className="flex flex-1 flex-col justify-between py-1">
                  <div className="space-y-3">
                    <div className="h-9 w-4/5 animate-pulse rounded bg-line/60" />
                    <div className="h-3.5 w-1/3 animate-pulse rounded bg-line/60" />
                  </div>
                  <div className="flex gap-10">
                    <div className="h-11 w-24 animate-pulse rounded bg-line/60" />
                    <div className="h-11 w-20 animate-pulse rounded bg-line/60" />
                  </div>
                </div>
              </div>
            </div>
          ) : profile ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-line bg-bg-alt p-3 md:p-5">
                <XshareCard ref={cardRef} profile={profile} style={cardStyle} />
              </div>

              {/* LAYOUTS */}
              <div>
                <div className="mb-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  Layout
                </div>
                <div
                  role="radiogroup"
                  aria-label="Card layout"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {CARD_STYLES.map((style) => {
                    const selected = cardStyle === style.id;
                    const disabled = style.hasBanner && !hasBanner;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        title={
                          disabled
                            ? "This profile has no banner image"
                            : style.description
                        }
                        onClick={() => setCardStyle(style.id)}
                        className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                          selected
                            ? "border-ink bg-ink text-bg"
                            : "border-line bg-bg-alt text-ink hover:border-line-strong"
                        } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                      >
                        <span className="block text-[13px] font-medium">
                          {style.name}
                        </span>
                        <span
                          className={`mt-0.5 block font-mono text-[10px] leading-snug ${
                            selected ? "text-bg/60" : "text-ink-faint"
                          }`}
                        >
                          {style.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACTIONS — "Edit in Postabl" is the primary one: it's the
                  path back into the product, and the card is only half
                  finished until it's sitting on a background. */}
              <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleEditInPostabl}
                  disabled={anyBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-bg transition-all hover:-translate-y-[1px] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "editor" ? (
                    "Opening editor…"
                  ) : (
                    <>
                      Edit in Postabl
                      <span aria-hidden>→</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={anyBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-transparent px-5 py-3.5 text-sm font-medium text-ink transition-all hover:bg-bg-alt disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "download" ? "Downloading…" : "Download PNG ↓"}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={anyBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-transparent px-5 py-3.5 text-sm font-medium text-ink transition-all hover:bg-bg-alt disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "copy" ? "Copying…" : "Copy"}
                </button>
                <p className="font-mono text-[11px] leading-snug text-ink-faint sm:ml-auto sm:max-w-[180px] sm:text-right">
                  Editing adds backgrounds, padding & your brand kit.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="relative w-full overflow-hidden rounded-xl border border-dashed border-line-strong"
              style={{ aspectRatio: "16 / 9" }}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-accent/30" />
              <div className="flex h-full flex-col items-center justify-center gap-2.5 px-8 text-center">
                <p className="font-serif text-[22px] font-medium tracking-tight text-ink md:text-[26px]">
                  Your card appears here
                </p>
                <p className="max-w-sm text-sm leading-[1.55] text-ink-soft">
                  Drop in a link like{" "}
                  <span className="font-mono text-[13px] text-ink">
                    x.com/elonmusk
                  </span>{" "}
                  and we&apos;ll print a card you can post.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
