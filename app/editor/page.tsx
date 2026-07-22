"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toPng, toJpeg, toBlob } from "html-to-image";
import {
  DAILY_FREE_LIMIT,
  bumpDownloads,
  getDownloadsUsed,
} from "@/lib/free-downloads";
import { addSavedImage } from "@/lib/saved-images";
import {
  clearScreenshot,
  loadScreenshot,
  saveScreenshot,
} from "@/lib/screenshot-store";
import { buildCheckoutUrl } from "@/lib/checkout";
import {
  clearAllLocalData,
  getLastUserId,
  setLastUserId,
} from "@/lib/local-data";
import {
  BACKGROUNDS,
  PATTERNS,
  findBackground,
} from "@/lib/backgrounds";
import {
  type BrandKit,
  type BadgePosition,
  loadBrandKit,
} from "@/lib/brand-kit";
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


const PADDING_PRESETS = ["S", "M", "L", "XL"] as const;
type PaddingPreset = (typeof PADDING_PRESETS)[number];
const PADDING_VALUES: Record<PaddingPreset, number> = {
  S: 30,
  M: 60,
  L: 100,
  XL: 140,
};

const SHADOW_PRESETS = ["None", "Soft", "Deep", "Lift"] as const;
type ShadowPreset = (typeof SHADOW_PRESETS)[number];
const SHADOW_VALUES: Record<ShadowPreset, string> = {
  None: "none",
  Soft: "0 10px 30px -10px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
  Deep: "0 50px 100px -20px rgba(0,0,0,0.35), 0 30px 60px -30px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)",
  Lift: "0 80px 140px -30px rgba(0,0,0,0.5), 0 40px 80px -30px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)",
};

// "Auto" derives its ratio from the uploaded image (or falls back to
// 16:9 before anything is uploaded). The fixed presets let users pick
// a deliberate output shape for a specific platform.
const RATIO_PRESETS = ["Auto", "1:1", "16:9", "4:3", "9:16"] as const;
type RatioPreset = (typeof RATIO_PRESETS)[number];

// Numeric width/height ratios for the fixed presets. "Auto" is special
// — handled inline by reading the loaded image's natural ratio.
const FIXED_RATIO_NUMBERS: Record<
  Exclude<RatioPreset, "Auto">,
  number
> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "9:16": 9 / 16,
};
const DEFAULT_NATURAL_RATIO = 16 / 9; // placeholder shape pre-upload

const FORMATS = [
  { id: "PNG", label: "PNG", size: "Lossless" },
  { id: "JPG", label: "JPG", size: "Smaller" },
  { id: "WEBP", label: "WEBP", size: "Modern" },
];
const SCALES: { id: string; label: string; size: string; hint: string }[] = [
  { id: "1x", label: "1×", size: "Free", hint: "Standard resolution — exports at the canvas's native pixel size" },
  { id: "2x", label: "2×", size: "Free", hint: "Retina — double the pixel density, ideal for Twitter/X and LinkedIn" },
  { id: "4x", label: "4×", size: "Pro", hint: "Ultra — 4× density, for print, case studies, or large displays" },
];
const presetClasses =
  "relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 border-transparent transition-all hover:scale-105";

function PresetDot({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent shadow-[0_0_0_2px_white]" />
  );
}

// Pro Brand Kit handle pill — rendered inside the inner window so it
// gets captured by html-to-image on every export. Position + light/dark
// style + watermark line are all driven by the kit.
function EditorBrandBadge({ kit }: { kit: BrandKit }) {
  const positionClasses: Record<BadgePosition, string> = {
    tl: "top-3 left-3",
    tr: "top-3 right-3",
    bl: "bottom-3 left-3",
    br: "bottom-3 right-3",
  };
  // No backdrop-blur here: html-to-image rasterizes backdrop-filter over
  // the element's rectangular bounding box without the rounded-full clip,
  // which leaks a blurred square past the pill's corners in exports. The
  // near-opaque fill keeps the handle legible on any background without it.
  const styleClasses =
    kit.badgeStyle === "light"
      ? "bg-white/90 text-ink"
      : "bg-ink/90 text-white";
  return (
    <div
      className={`pointer-events-none absolute z-10 rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide ${positionClasses[kit.badgePosition]} ${styleClasses}`}
    >
      <div className="leading-tight">{kit.handle}</div>
      {kit.badgeIncludeWatermark && (
        <div className="text-[8px] leading-tight opacity-60">postabl.xyz</div>
      )}
    </div>
  );
}

export default function EditorPage() {
  // useSearchParams below requires a Suspense boundary in Next 15 or
  // prerender will bail. Wrapping here keeps the rest of the page
  // unchanged from the previous client-only render.
  return (
    <Suspense fallback={null}>
      <EditorContent />
    </Suspense>
  );
}

function EditorContent() {
  const [bgId, setBgId] = useState(BACKGROUNDS[0].id);
  const [padding, setPadding] = useState(60);
  const [radius, setRadius] = useState(10);
  const [paddingPreset, setPaddingPreset] = useState<PaddingPreset>("M");
  const [shadowPreset, setShadowPreset] = useState<ShadowPreset>("Deep");
  const [ratio, setRatio] = useState<RatioPreset>("Auto");
  // Natural width/height of the uploaded screenshot. Set on <img onLoad>;
  // null means "no image loaded yet" so we fall back to DEFAULT_NATURAL_RATIO.
  const [imgRatio, setImgRatio] = useState<number | null>(null);
  const [innerGlow, setInnerGlow] = useState(false);
  const [format, setFormat] = useState("PNG");
  const [scale, setScale] = useState("2x");
  const [windowStyle, setWindowStyle] = useState<"light" | "dark" | "none">("none");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [urlText, setUrlText] = useState("postabl.xyz/editor");
  const [showAllBackgrounds, setShowAllBackgrounds] = useState(false);
  const [me, setMe] = useState<MeUser>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [downloadsUsed, setDownloadsUsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  // Drives the mobile-vs-desktop layout swap. Initial state is `false`
  // so SSR renders the desktop shell; the effect below corrects it on
  // hydrate. The Tailwind `md:` breakpoint matches the same 768px cutoff.
  const [isMobile, setIsMobile] = useState(false);
  // First-run hint that the URL bar inside the window chrome is
  // editable. The bar visually mimics a real Chrome address field, so
  // users don't always realise they can click it. The tip floats below
  // the canvas (outside the export frame) and is dismissed permanently
  // once the user either clicks × or types into the URL.
  const [urlTipDismissed, setUrlTipDismissed] = useState(true);
  // User's Brand Kit (Pro feature). null = not yet loaded or no kit;
  // applied to a fresh editor session on first /me hydration when no
  // screenshot is present. The handle badge renders inside frameRef
  // so it's captured in every export.
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  // Tracks whether the pre-signin editor stash was restored on mount.
  // If so, we skip the brand-kit auto-apply (the user had explicit
  // settings mid-flow; don't clobber them with defaults).
  const [stashRestored, setStashRestored] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const notify = useNotify();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Load an image File into the editor: validate, read as a data URL, set
  // it as the screenshot, and persist to IndexedDB. Shared by the file
  // picker and clipboard paste so both behave identically.
  const ingestImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        notify.toast("Please pick an image file (PNG, JPG, WEBP, GIF).", {
          tone: "error",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl =
          typeof reader.result === "string" ? reader.result : null;
        if (!dataUrl) return;
        setScreenshot(dataUrl);
        // Persist asynchronously to IndexedDB (50MB+ of headroom vs
        // localStorage's 5-10MB). If it still fails (huge image, IDB
        // blocked, or a genuine quota issue) the image stays in memory
        // for this session.
        void saveScreenshot(dataUrl).catch((err) => {
          console.error(err);
          notify.toast(
            err instanceof Error
              ? err.message
              : "Couldn't save the screenshot. It'll stay loaded for this session only.",
            { tone: "error", duration: 5000 }
          );
        });
      };
      reader.readAsDataURL(file);
    },
    [notify]
  );

  // Clipboard paste. On macOS, Cmd+Ctrl+Shift+4 copies a screenshot to the
  // clipboard without writing a file anywhere, so users can paste straight
  // in (Cmd+V) instead of hunting for a saved PNG. We grab the first image
  // item off the paste event. Pastes landing in a text input (the URL bar)
  // are left alone so typing a URL isn't hijacked.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            ingestImageFile(file);
            notify.toast("Screenshot pasted.", { duration: 2000 });
          }
          return;
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [ingestImageFile, notify]);

  // Load saved screenshot from IndexedDB after mount (avoids SSR mismatch).
  // Transparently migrates any older localStorage-backed value on first read.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadScreenshot();
        if (!cancelled && saved) setScreenshot(saved);
      } catch {
        // IDB blocked (private mode etc) — silently continue.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate today's download count from localStorage.
  useEffect(() => {
    setDownloadsUsed(getDownloadsUsed());
  }, []);

  // Track viewport size so we can pick a mobile-appropriate canvas width
  // calc. The grid → flex layout swap is pure CSS via Tailwind's `md:`
  // prefix; this state only exists for the inline canvas width.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Anonymous users land here, customise their screenshot, then click
  // Download → they're sent to /signin. We stash their state to LS
  // first so this effect can hydrate it back when they return. Done
  // once on mount; we delete the stash immediately after restoring so
  // a manual refresh doesn't keep overwriting fresh tweaks.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("postabl:editor-stash");
      if (!raw) return;
      const stash = JSON.parse(raw) as Partial<{
        bgId: string;
        padding: number;
        radius: number;
        paddingPreset: PaddingPreset;
        shadowPreset: ShadowPreset;
        ratio: RatioPreset;
        innerGlow: boolean;
        format: string;
        scale: string;
        windowStyle: "light" | "dark" | "none";
        urlText: string;
      }>;
      if (typeof stash.bgId === "string") setBgId(stash.bgId);
      if (typeof stash.padding === "number") setPadding(stash.padding);
      if (typeof stash.radius === "number") setRadius(stash.radius);
      if (stash.paddingPreset) setPaddingPreset(stash.paddingPreset);
      if (stash.shadowPreset) setShadowPreset(stash.shadowPreset);
      if (stash.ratio) setRatio(stash.ratio);
      if (typeof stash.innerGlow === "boolean") setInnerGlow(stash.innerGlow);
      if (typeof stash.format === "string") setFormat(stash.format);
      if (typeof stash.scale === "string") setScale(stash.scale);
      if (stash.windowStyle) setWindowStyle(stash.windowStyle);
      if (typeof stash.urlText === "string") setUrlText(stash.urlText);
      // Mark restored so the brand-kit auto-apply effect knows to
      // leave these values alone.
      setStashRestored(true);
      window.localStorage.removeItem("postabl:editor-stash");
    } catch {
      // Malformed stash — ignore and move on.
    }
  }, []);

  // Restore "URL bar is editable" tip dismissal across sessions. Default
  // is dismissed=true to avoid an SSR-vs-client flash; we only un-dismiss
  // after confirming the user hasn't already closed it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dismissed =
        window.localStorage.getItem("postabl:url-tip-dismissed") === "1";
      if (!dismissed) setUrlTipDismissed(false);
    } catch {
      // localStorage blocked — show the tip anyway, no big deal.
      setUrlTipDismissed(false);
    }
  }, []);

  function dismissUrlTip() {
    setUrlTipDismissed(true);
    try {
      window.localStorage.setItem("postabl:url-tip-dismissed", "1");
    } catch {
      // ignore
    }
  }

  function bumpDownloadCount() {
    const next = bumpDownloads();
    setDownloadsUsed(next);
  }

  // Pro state comes straight from the server (/api/auth/me reads
  // users.is_pro fresh on every call). To test Pro locally, flip
  // is_pro on your user row in the DB.
  const isPro = me?.isPro ?? false;

  const downloadsRemaining = Math.max(0, DAILY_FREE_LIMIT - downloadsUsed);
  const outOfFreeDownloads = !isPro && downloadsRemaining <= 0;

  // Numeric canvas ratio: "Auto" reads from the loaded image, fixed
  // presets use their literal value. The natural image ratio drives the
  // inner window's aspect ratio so the screenshot keeps its proportions
  // even when the user picks a canvas ratio that doesn't match.
  const naturalRatio = imgRatio ?? DEFAULT_NATURAL_RATIO;
  const effectiveRatio: number =
    ratio === "Auto" ? naturalRatio : FIXED_RATIO_NUMBERS[ratio];

  // Pre-upload, there is no real "image ratio" — let the placeholder
  // window fill whatever canvas the user has selected so it doesn't
  // look like a tiny pill floating in empty background.
  const windowAspectRatio = imgRatio ?? effectiveRatio;

  // In portrait windows the macOS-style chrome (traffic-light dots +
  // URL bar) looks chunky and the URL overflows. Drop the URL field
  // and use smaller dots/padding so the bar reads as a clean header
  // rather than a half-broken browser frame.
  const isNarrowWindow = windowAspectRatio < 1;

  // Hydrate current user from the session cookie.
  //
  // ALSO: account-switch guard. localStorage + IndexedDB are
  // origin-scoped, not user-scoped, so without this check Account B
  // would see Account A's saved library / current screenshot / quota
  // counter after signing in. We compare the /me response's user.id
  // against the last-seen id and wipe local state on mismatch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        const newId: string | null = data.user?.id ?? null;
        const lastId = getLastUserId();
        // Mismatch == account switch (covers both A→B sign-in and
        // signed-out-but-someone-else-just-signed-in cases).
        if (lastId && newId && lastId !== newId) {
          await clearAllLocalData();
          // Wipe relevant React state too so we don't briefly render
          // the previous user's screenshot while IDB is being deleted.
          setScreenshot(null);
          setImgRatio(null);
          setDownloadsUsed(0);
          // Brand-kit is per-user — clear so a fresh load can run.
          setBrandKit(null);
          setBrandKitApplied(false);
        }
        setLastUserId(newId);
        setMe(data.user);

        // Pro-only Brand Kit. Load alongside /me so we can auto-apply
        // defaults before the user starts tweaking. Anon and free
        // users have no kit — skip the fetch.
        if (data.user?.isPro) {
          const kit = await loadBrandKit();
          if (cancelled) return;
          if (kit) setBrandKit(kit);
        }
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

  // Apply Brand Kit defaults to a fresh editor session. Runs once
  // brandKit becomes available, but only when:
  //   - no screenshot is loaded (otherwise the user has work in
  //     progress and we don't clobber it)
  //   - no stash was just restored (signin round-trip preserved an
  //     in-flight state that takes precedence)
  const [brandKitApplied, setBrandKitApplied] = useState(false);
  useEffect(() => {
    if (!brandKit) return;
    if (brandKitApplied) return;
    if (screenshot || stashRestored) {
      // Already have user state — don't overwrite. Mark applied so
      // we don't re-apply later in this session if conditions change.
      setBrandKitApplied(true);
      return;
    }
    setBgId(brandKit.defaultBgId);
    setPadding(brandKit.defaultPadding);
    setPaddingPreset(brandKit.defaultPaddingPreset);
    setShadowPreset(brandKit.defaultShadowPreset);
    setWindowStyle(brandKit.defaultWindowStyle);
    setRatio(brandKit.defaultRatio);
    setRadius(brandKit.defaultRadius);
    setBrandKitApplied(true);
  }, [brandKit, brandKitApplied, screenshot, stashRestored]);

  // Close the user menu on outside click.
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
      // ignore — cookie will still be cleared on next request
    }
    // Wipe per-user local state so the next person on this device
    // (anon or otherwise) can't see this user's saved library / current
    // screenshot / quota counter. See lib/local-data.ts for rationale.
    await clearAllLocalData();
    setMe(null);
    setUserMenuOpen(false);
    setScreenshot(null);
    setImgRatio(null);
    setDownloadsUsed(0);
    setBrandKit(null);
    setBrandKitApplied(false);
    router.push("/signin");
    router.refresh();
  }

  // ------------------------------------------------------------------
  // Anonymous-user gating
  //
  // /editor is open to everyone — uploading and styling work without a
  // session. Sign-in is only required at the point of value capture:
  // Download, Save to library, and Pro-only features. When we redirect
  // an anon user to /signin we stash the current editor state so it's
  // waiting for them when they come back, otherwise the round-trip
  // would lose all their tweaks and they'd ragequit.
  // ------------------------------------------------------------------
  const STASH_KEY = "postabl:editor-stash";

  function persistEditorStash() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STASH_KEY,
        JSON.stringify({
          bgId,
          padding,
          radius,
          paddingPreset,
          shadowPreset,
          ratio,
          innerGlow,
          format,
          scale,
          windowStyle,
          urlText,
        })
      );
    } catch {
      // Quota full or LS blocked — proceed with redirect anyway.
    }
  }

  async function requireSignedIn(opts: {
    title: string;
    description: string;
    confirmLabel?: string;
    // Where to land after auth. Defaults to the editor; pass another
    // path (e.g. /brand-kit) when the click's intent is a different
    // destination. The stash keeps editor tweaks safe either way.
    next?: string;
  }): Promise<boolean> {
    if (me) return true;
    const ok = await notify.confirm({
      title: opts.title,
      description: opts.description,
      confirmLabel: opts.confirmLabel ?? "Sign in with Google →",
      cancelLabel: "Not now",
    });
    if (!ok) return false;
    persistEditorStash();
    window.location.href = `/signin?next=${opts.next ?? "/editor"}`;
    return false;
  }

  // "Set up brand kit" in the Properties panel. Signed-in users (free
  // included) go straight to /brand-kit: the page previews the kit and
  // carries its own Pro gate on save. Anon users get the standard
  // sign-in confirm with their editor tweaks stashed, landing on
  // /brand-kit after auth.
  async function handleBrandKitSetupClick() {
    const ok = await requireSignedIn({
      title: "Sign in to set up your brand kit",
      description:
        "Your @handle and default style, applied to every export. Sign in with Google first, and we'll keep your work.",
      next: "/brand-kit",
    });
    if (!ok) return;
    router.push("/brand-kit");
  }

  function handleUpgradeClick() {
    if (!me) {
      // Editor is auth-gated by middleware, but be defensive.
      router.push("/signin?next=/editor");
      return;
    }
    const url = buildCheckoutUrl({ id: me.id, email: me.email });
    if (!url) {
      notify.toast(
        "Checkout is currently unavailable. Please try again in a moment.",
        { tone: "error" }
      );
      return;
    }
    // Full-page nav — let LS's hosted checkout own the tab.
    window.location.href = url;
  }

  // Confirm-before-redirect for clicks on Pro-gated features. The
  // direct "Upgrade to Pro" buttons skip this (they're already an
  // explicit purchase intent) — this only fires when the user clicks
  // something that *looks* like a feature toggle (4× scale, a Pattern
  // swatch) so they know they're about to be sent to checkout.
  async function confirmAndUpgrade(feature: string) {
    const ok = await notify.confirm({
      title: `${feature} is a Pro feature`,
      description:
        "Postabl Pro unlocks unlimited daily exports, 4× retina output, and pattern backgrounds for $9.99 a year. Cancel anytime.",
      confirmLabel: "Continue to checkout →",
      cancelLabel: "Maybe later",
    });
    if (ok) handleUpgradeClick();
  }

  // ?upgraded=1 lands here when LS finishes a successful checkout. We
  // poll /api/auth/me until is_pro flips (the webhook usually arrives
  // within a few seconds), show a toast, then strip the query so a
  // refresh doesn't repeat the celebration.
  useEffect(() => {
    const upgraded = searchParams.get("upgraded");
    if (upgraded !== "1") return;

    // Strip the query immediately so refresh doesn't re-trigger this.
    router.replace("/editor");

    // Long-running "we're working on it" toast — held open until the
    // poll resolves one way or the other.
    const dismissUpgrade = notify.toast(
      "Welcome to Pro — finishing up your account…",
      { duration: Infinity }
    );

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10; // ~15s @ 1.5s intervals

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data?.user?.isPro) {
          setMe(data.user);
          dismissUpgrade();
          notify.toast("You're on Pro now. Have at it.", {
            tone: "success",
            duration: 3500,
          });
          return;
        }
      } catch {
        // ignore individual failures; keep polling
      }
      if (attempts < maxAttempts) {
        setTimeout(poll, 1500);
      } else {
        dismissUpgrade();
        notify.toast(
          "Payment received. Pro will be live in a few seconds — refresh if needed.",
          { duration: 6000 }
        );
      }
    }
    poll();

    return () => {
      cancelled = true;
    };
    // searchParams is the only meaningful trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // If Pro is disabled and 4× is selected, gracefully downgrade.
  useEffect(() => {
    if (!isPro && scale === "4x") setScale("2x");
  }, [isPro, scale]);

  const bg = findBackground(bgId);

  // Selected state matches the export tiles below (ink fill, white
  // label) so the whole right panel speaks one "active" language
  // instead of two. Keeps chrome off pure white, per DESIGN.md.
  const segBtn = (active: boolean) =>
    `rounded-md px-1.5 py-1.5 font-mono text-[11px] transition-all ${
      active
        ? "bg-ink text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
        : "bg-transparent text-ink-soft hover:text-ink"
    }`;

  const exportOpt = (active: boolean) =>
    `flex cursor-pointer flex-col items-center rounded-md border px-2 py-2 text-center font-mono text-[11px] transition-all ${
      active
        ? "border-ink bg-ink text-white"
        : "border-line bg-white hover:border-ink-faint"
    }`;

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    ingestImageFile(file);
    // Reset so picking the same file twice still triggers onChange.
    e.target.value = "";
  }

  function handleClearScreenshot() {
    setScreenshot(null);
    setImgRatio(null);
    void clearScreenshot().catch(() => {
      // ignore — local state is already cleared
    });
  }

  async function handleDownload() {
    const node = frameRef.current;
    if (!node) return;
    // Anonymous-user signin gate. Anon users get a polished confirm
    // explaining the value exchange before the OAuth round-trip.
    if (!me) {
      await requireSignedIn({
        title: "Sign in to download",
        description:
          "Sign in with Google to download your screenshot — free, no card needed. Your work stays put while you sign in.",
      });
      return;
    }
    if (!isPro && downloadsRemaining <= 0) {
      notify.toast(
        `Daily limit reached (${DAILY_FREE_LIMIT}). Upgrade to Pro for unlimited exports.`,
        { tone: "error", duration: 5000 }
      );
      return;
    }
    setIsExporting(true);
    try {
      const pixelRatio =
        scale === "4x" ? 4 : scale === "2x" ? 2 : 1;
      const filename = `postabl-${Date.now()}.${format.toLowerCase()}`;

      // skipFonts avoids a SecurityError reading cross-origin Google Fonts
      // stylesheets; the browser will rasterise using the already-loaded
      // fonts, which is sufficient for visual parity.
      const baseOpts = { pixelRatio, cacheBust: true, skipFonts: true };

      let dataUrl: string;
      if (format === "JPG") {
        dataUrl = await toJpeg(node, { ...baseOpts, quality: 0.95 });
      } else if (format === "WEBP") {
        // html-to-image doesn't expose toWebp directly — go via blob + canvas.
        const blob = await toBlob(node, baseOpts);
        if (!blob) throw new Error("Couldn't render canvas to blob.");
        dataUrl = await blobToWebp(blob);
      } else {
        dataUrl = await toPng(node, baseOpts);
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Only count against the free quota — Pro is unlimited.
      if (!isPro) bumpDownloadCount();
    } catch (err) {
      console.error(err);
      notify.toast("Export failed. Check the console for details.", {
        tone: "error",
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSave() {
    const node = frameRef.current;
    if (!node) return;
    if (!screenshot) {
      notify.toast("Upload a screenshot first, then save.", {
        tone: "error",
      });
      return;
    }
    // Anonymous-user signin gate. Saved library is per-user, so we
    // need an account before any Save can land.
    if (!me) {
      await requireSignedIn({
        title: "Sign in to save",
        description:
          "Sign in with Google to add this to your library and access it from any device. Your work is preserved through the sign-in.",
      });
      return;
    }
    setIsSaving(true);
    try {
      // Render to a Blob (rather than a data URL) so IndexedDB can store
      // it natively without the ~33% base64 inflation that localStorage
      // forced us into.
      const blob = await toBlob(node, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
      });
      if (!blob) throw new Error("Couldn't render the canvas to an image.");
      await addSavedImage({ blob, format: "png" });
      notify.toast("Saved to your library.", {
        tone: "success",
        duration: 2500,
      });
    } catch (err) {
      console.error(err);
      notify.toast(
        err instanceof Error
          ? err.message
          : "Couldn't save the image. Check the console.",
        { tone: "error", duration: 5000 }
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function blobToWebp(blob: Blob): Promise<string> {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/webp", 0.95);
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-sm text-ink md:grid md:h-screen md:grid-cols-[260px_1fr_320px] md:grid-rows-[56px_1fr] md:overflow-hidden">
      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* TOP BAR */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur md:static md:col-span-full md:h-auto md:bg-bg md:px-5 md:backdrop-blur-none">
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
            screenshot_01 <span className="text-ink-faint">/ untitled</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Downloads pill is only meaningful for signed-in users —
              anon users can't consume downloads without first signing
              in, so the counter would just be confusing. */}
          {me &&
            (isPro ? (
              <div className="rounded-full border border-line bg-bg-alt px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink-faint md:px-2.5 md:py-1 md:text-[11px]">
                <strong className="font-medium text-ink">∞</strong>
                <span className="hidden md:inline"> UNLIMITED DOWNLOADS</span>
              </div>
            ) : (
              <div
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide md:px-2.5 md:py-1 md:text-[11px] ${
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
                /{DAILY_FREE_LIMIT}
                <span className="hidden md:inline">
                  {" "}
                  {outOfFreeDownloads ? "LIMIT REACHED" : "FREE DOWNLOADS LEFT"}
                </span>
              </div>
            ))}

          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label={screenshot ? "Replace image" : "Upload image"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-2.5 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink md:px-3.5"
          >
            <span className="hidden md:inline">
              {screenshot ? "Replace image" : "Upload image"}{" "}
            </span>
            <span aria-hidden>↑</span>
          </button>
          {/* Upgrade is the one conversion action in the bar, so it
              carries the single accent treatment — a restrained
              terracotta outline that reads as an invitation, not another
              utility. Free signed-in users only: anon users convert via
              the sign-in CTA, Pro users have nothing to upgrade. Save /
              Saved live in the account menu now, and Clear is always
              available as the × on the canvas, so the bar stays down to
              Upload · Upgrade · Export · account. */}
          {me && !isPro && (
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="hidden items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/5 px-3.5 py-2 text-[13px] font-medium text-accent transition-all hover:border-accent hover:bg-accent/10 md:inline-flex"
            >
              Upgrade to Pro
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={isExporting || outOfFreeDownloads}
            title={
              outOfFreeDownloads
                ? "Daily free limit reached — upgrade to Pro or come back tomorrow"
                : undefined
            }
            className="hidden items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-bg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
          >
            {isExporting
              ? "Exporting…"
              : outOfFreeDownloads
                ? "Limit reached"
                : "Export ↓"}
          </button>
          {meLoading ? (
            <div className="h-[30px] w-[30px] animate-pulse rounded-full bg-bg-alt" />
          ) : me ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label={`Account menu — ${me.name}`}
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
                  {/* Brand kit — always visible in the menu (settings
                      page, not worth top-bar real estate). Pro chip
                      tells free users this is a Pro feature. */}
                  <Link
                    href="/brand-kit"
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-bg-alt hover:text-ink"
                  >
                    <span>Brand kit</span>
                    {!isPro && (
                      <span className="rounded-full bg-bg-alt px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                        Pro
                      </span>
                    )}
                  </Link>
                  {/* Save + library live in the menu at every size now,
                      so the top bar stays down to primary actions. Save
                      is disabled until there's a screenshot to save. */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void handleSave();
                    }}
                    disabled={isSaving || !screenshot}
                    title={
                      !screenshot ? "Upload a screenshot to save it" : undefined
                    }
                    className="block w-full px-3.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-bg-alt hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving…" : "Save to library"}
                  </button>
                  <Link
                    href="/saved"
                    onClick={() => setUserMenuOpen(false)}
                    className="block w-full px-3.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-bg-alt hover:text-ink"
                  >
                    Your saved
                  </Link>
                  {/* Upgrade sits in the top bar on desktop; surface it in
                      the menu only on mobile, where the bar has no room. */}
                  {!isPro && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleUpgradeClick();
                      }}
                      className="block w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-accent transition-colors hover:bg-accent/5 md:hidden"
                    >
                      Upgrade to Pro
                    </button>
                  )}
                  <div className="border-t border-line" />
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
          ) : (
            // Anon users only — clicking this stashes their current
            // editor state to LS first so it's waiting for them when
            // they return after Google OAuth.
            <button
              type="button"
              onClick={() => {
                persistEditorStash();
                window.location.href = "/signin?next=/editor";
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-bg transition-all hover:bg-black"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* LEFT SIDEBAR — column 1 on desktop; stacks below the canvas
          on mobile (order-2 puts it after the order-1 canvas). */}
      <aside className="order-2 border-t border-line bg-bg py-4 md:order-none md:overflow-y-auto md:border-t-0 md:border-r md:py-5">
        <div className="mb-5 border-b border-line px-5 pb-5">
          <div className="mb-3.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            <span>Backgrounds</span>
            <span className="rounded-full bg-bg-alt px-1.5 py-0.5 text-[9px]">
              {showAllBackgrounds
                ? BACKGROUNDS.length
                : `9/${BACKGROUNDS.length}`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(() => {
              // When collapsed, show the first 9 swatches — but if the
              // active bg is outside that window, swap it in for the last
              // visible slot so the selection stays on screen *and* the
              // "Show less" toggle still actually collapses the grid.
              const activeIdx = BACKGROUNDS.findIndex((b) => b.id === bgId);
              const visible = showAllBackgrounds
                ? BACKGROUNDS
                : activeIdx >= 9
                  ? [...BACKGROUNDS.slice(0, 8), BACKGROUNDS[activeIdx]]
                  : BACKGROUNDS.slice(0, 9);
              return visible.map((b) => (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  aria-label={b.label}
                  title={b.label}
                  className={`${presetClasses} ${
                    b.id === bgId ? "!border-ink" : ""
                  }`}
                  style={b.style}
                  onClick={() => setBgId(b.id)}
                >
                  <PresetDot active={b.id === bgId} />
                </div>
              ));
            })()}
          </div>
          {BACKGROUNDS.length > 9 && (
            <button
              type="button"
              onClick={() => setShowAllBackgrounds((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-bg-alt px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-all hover:border-ink hover:text-ink"
            >
              {showAllBackgrounds
                ? "Show less ↑"
                : `Show ${BACKGROUNDS.length - 9} more ↓`}
            </button>
          )}
        </div>

        <div className="mb-5 border-b border-line px-5 pb-5">
          <div className="mb-3.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Window style
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setWindowStyle("light")}
              aria-label="Light window chrome"
              aria-pressed={windowStyle === "light"}
              title="Light — macOS-style title bar with traffic-light dots and URL field"
              className={`relative flex aspect-[16/10] cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-white p-0 transition-all hover:scale-105 ${
                windowStyle === "light" ? "border-ink" : "border-transparent"
              }`}
            >
              <PresetDot active={windowStyle === "light"} />
              <div className="flex h-[30%] w-full items-center gap-0.5 bg-[#f5f5f5] pl-1">
                <span className="h-1 w-1 rounded-full bg-[#ff5f57]" />
                <span className="h-1 w-1 rounded-full bg-[#febc2e]" />
                <span className="h-1 w-1 rounded-full bg-[#28c840]" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setWindowStyle("dark")}
              aria-label="Dark window chrome"
              aria-pressed={windowStyle === "dark"}
              title="Dark — same chrome on a dark title bar"
              className={`relative flex aspect-[16/10] cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-[#1a1a1a] p-0 transition-all hover:scale-105 ${
                windowStyle === "dark" ? "border-ink" : "border-transparent"
              }`}
            >
              <PresetDot active={windowStyle === "dark"} />
              <div className="h-[30%] w-full bg-[#2a2a2a]" />
            </button>
            <button
              type="button"
              onClick={() => setWindowStyle("none")}
              aria-label="No window chrome"
              aria-pressed={windowStyle === "none"}
              title="None — no title bar; the screenshot fills the frame edge to edge"
              className={`relative flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 bg-white p-0 transition-all hover:scale-105 ${
                windowStyle === "none" ? "border-ink" : "border-transparent"
              }`}
            >
              <PresetDot active={windowStyle === "none"} />
              <span className="font-mono text-[10px] text-[#999]">none</span>
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="mb-3.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            <span>Patterns</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                isPro ? "bg-accent/10 text-accent" : "bg-bg-alt"
              }`}
            >
              {isPro ? "UNLOCKED" : "Pro"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PATTERNS.map((p) => {
              const active = p.id === bgId;
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={p.label}
                  title={isPro ? p.label : `${p.label} — Pro only`}
                  onClick={() => {
                    if (!isPro) {
                      if (!me) {
                        void requireSignedIn({
                          title: "Sign in to use patterns",
                          description:
                            "Pattern backgrounds are part of Pro. Sign in with Google first — we'll keep your work — then unlock Pro for $9.99/year.",
                        });
                        return;
                      }
                      confirmAndUpgrade("Pattern backgrounds");
                      return;
                    }
                    setBgId(p.id);
                  }}
                  className={`${presetClasses} ${active ? "!border-ink" : ""}`}
                  style={{ ...p.style, opacity: isPro ? 1 : 0.55 }}
                >
                  <PresetDot active={active} />
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* CANVAS — first content under the header on mobile (order-1)
          so the screenshot is the first thing the user sees on a phone. */}
      <main className="canvas-grid order-1 relative flex min-h-[55vh] items-center justify-center p-4 md:order-none md:min-h-0 md:overflow-auto md:p-10">

        <div className="relative">
          {screenshot && (
            <button
              type="button"
              onClick={handleClearScreenshot}
              aria-label="Remove screenshot"
              title="Remove screenshot"
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-lg leading-none text-ink-soft shadow-tools transition-all hover:border-ink hover:text-ink"
            >
              ×
            </button>
          )}
          {/* "URL bar is editable" hint — only shown when the window
              actually HAS a URL bar (light/dark chrome, landscape
              orientation) and the user hasn't dismissed it yet. Lives
              OUTSIDE frameRef so it won't be in the exported PNG. */}
          {!urlTipDismissed &&
            windowStyle !== "none" &&
            !isNarrowWindow && (
              <div className="pointer-events-auto absolute left-1/2 top-full z-10 mt-3 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[10px] tracking-wide text-ink-soft shadow-tools">
                <span aria-hidden className="text-ink-faint">
                  ↑
                </span>
                <span>
                  The URL bar is editable —{" "}
                  <span className="font-medium text-ink">click it</span>
                </span>
                <button
                  type="button"
                  onClick={dismissUrlTip}
                  aria-label="Dismiss tip"
                  className="-mr-1 ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[13px] leading-none text-ink-faint transition-colors hover:bg-bg-alt hover:text-ink"
                >
                  ×
                </button>
              </div>
            )}
        <div
          ref={frameRef}
          className="relative flex max-w-full items-center justify-center rounded-2xl shadow-canvas transition-all"
          style={{
            ...bg.style,
            padding: `${padding}px`,
            aspectRatio: effectiveRatio,
            // Canvas width has two regimes:
            //   Desktop — smallest of (1100px cap, what viewport
            //     height fits at the chosen ratio, 92% of the space
            //     between the two sidebars: 100vw - 260 - 320 - slack).
            //   Mobile — fit the viewport width minus a small inset,
            //     bounded by ~48vh so even portrait ratios still leave
            //     room for the controls below.
            width: isMobile
              ? `min(calc(100vw - 32px), calc(48vh * ${effectiveRatio}))`
              : `min(1100px, calc((100vh - 180px) * ${effectiveRatio}), calc((100vw - 660px) * 0.92))`,
          }}
        >
          <div
            className="relative flex max-h-full max-w-full flex-col overflow-hidden bg-white transition-all"
            style={{
              // After upload: window matches the screenshot's aspect
              // ratio so the frame hugs the image; letterboxes or
              // pillarboxes against the canvas ratio if they differ.
              // Before upload: window fills the canvas (effectiveRatio)
              // so the placeholder isn't a small horizontal pill
              // floating inside a tall portrait canvas.
              aspectRatio: windowAspectRatio,
              borderRadius: `${radius}px`,
              boxShadow: innerGlow
                ? `${SHADOW_VALUES[shadowPreset]}, inset 0 0 60px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,0.9)`
                : SHADOW_VALUES[shadowPreset],
            }}
          >
            {windowStyle !== "none" && (
              <div
                className={`flex flex-shrink-0 items-center border-b border-[#eaeaea] bg-[#f5f5f5] ${
                  isNarrowWindow
                    ? "gap-1 px-2.5 py-2"
                    : "gap-1.5 px-4 py-3"
                }`}
                style={
                  windowStyle === "dark"
                    ? { background: "#1a1a1a", borderColor: "#2a2a2a" }
                    : undefined
                }
              >
                <span
                  className={`rounded-full bg-[#ff5f57] ${
                    isNarrowWindow ? "h-2 w-2" : "h-3 w-3"
                  }`}
                />
                <span
                  className={`rounded-full bg-[#febc2e] ${
                    isNarrowWindow ? "h-2 w-2" : "h-3 w-3"
                  }`}
                />
                <span
                  className={`rounded-full bg-[#28c840] ${
                    isNarrowWindow ? "h-2 w-2" : "h-3 w-3"
                  }`}
                />
                {!isNarrowWindow && (
                  <input
                    type="text"
                    value={urlText}
                    onChange={(e) => {
                      setUrlText(e.target.value);
                      // First edit → permanently dismiss the tip. The
                      // user has clearly figured it out.
                      if (!urlTipDismissed) dismissUrlTip();
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="your-url.com"
                    spellCheck={false}
                    title="Click to edit the URL shown in the screenshot"
                    aria-label="URL displayed in window chrome (editable)"
                    className="ml-4 min-w-0 flex-grow cursor-text rounded-full border border-[#d4cfc1] bg-white px-3 py-1 text-center font-mono text-[11px] text-ink-faint outline-none transition-all hover:border-ink/40 hover:bg-bg-alt/60 hover:text-ink-soft focus:border-ink focus:bg-white focus:text-ink"
                  />
                )}
              </div>
            )}
            {screenshot ? (
              // Uploaded image replaces the placeholder. The window
              // above has aspect-ratio: naturalRatio, so the image
              // fills it exactly without cropping or distortion.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={screenshot}
                alt="Uploaded screenshot"
                className="block min-h-0 w-full flex-1"
                style={{ objectFit: "cover" }}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth && el.naturalHeight) {
                    setImgRatio(el.naturalWidth / el.naturalHeight);
                  }
                }}
              />
            ) : (
              // Placeholder shown until the user uploads. We scale type
              // and stack the buttons vertically when the canvas is in a
              // narrow portrait ratio (9:16) so nothing overflows the
              // frame at ~400px wide.
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`group flex min-h-[260px] cursor-pointer flex-col justify-center transition-colors hover:bg-bg-alt/60 ${
                  ratio === "9:16" ? "p-6" : "p-10"
                }`}
              >
                <h2
                  className={`mb-3 font-serif font-medium leading-[1.05] tracking-tight ${
                    ratio === "9:16" ? "text-[22px]" : "text-[32px]"
                  }`}
                >
                  Your screenshots,{" "}
                  <em className="text-accent">seriously upgraded.</em>
                </h2>
                <p
                  className={`mb-5 leading-[1.55] text-ink-soft ${
                    ratio === "9:16" ? "text-[12px]" : "text-sm"
                  }`}
                >
                  {ratio === "9:16"
                    ? "Drop an image. Pick a background. Ship it."
                    : "Drop an image. Pick a background. Ship something people actually want to look at. That's the whole workflow."}
                </p>
                <div
                  className={`flex gap-2 ${
                    ratio === "9:16" ? "flex-col" : ""
                  }`}
                >
                  <div className="rounded-lg bg-ink px-3.5 py-2 text-center text-xs font-medium text-white">
                    Upload screenshot ↑
                  </div>
                  <div className="rounded-lg border border-line px-3.5 py-2 text-center text-xs font-medium text-ink">
                    Learn more
                  </div>
                </div>
                <div className="mt-3 font-mono text-[11px] text-ink-faint">
                  or paste from your clipboard (⌘V)
                </div>
              </div>
            )}
          </div>
          {/* Brand Kit handle badge — anchored to the padded background
              frame (frameRef, position:relative), NOT the inner window,
              so it overlays the background in the chosen corner instead of
              the screenshot — and isn't clipped by the window's
              overflow-hidden. Still inside frameRef so html-to-image
              captures it at export. Renders only with a non-empty handle. */}
          {brandKit?.handle && <EditorBrandBadge kit={brandKit} />}
        </div>
        </div>
      </main>

      {/* RIGHT PANEL — column 3 on desktop; stacks last on mobile
          (order-3). pb-24 reserves space for the fixed Download bar. */}
      <aside className="order-3 border-t border-line bg-bg p-4 pb-24 md:order-none md:border-t-0 md:overflow-y-auto md:border-l md:p-5 md:pb-5">
        <div className="mb-5 flex items-center justify-between border-b border-line pb-5">
          <div className="font-serif text-xl font-medium tracking-tight">
            Properties
          </div>
          <button
            onClick={() => {
              setPadding(PADDING_VALUES.M);
              setRadius(10);
              setPaddingPreset("M");
              setShadowPreset("Deep");
              setRatio("Auto");
              setInnerGlow(false);
              setFormat("PNG");
              setScale("2x");
            }}
            className="rounded-lg border border-line bg-transparent px-2 py-1 text-[11px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
          >
            Reset
          </button>
        </div>

        {/* Padding */}
        <div className="mb-7">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Padding
          </div>
          <div className="mb-3.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-soft">Size</span>
              <span className="rounded bg-bg-alt px-1.5 py-0.5 font-mono text-[11px] text-ink">
                {padding}px
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={160}
              value={padding}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPadding(v);
                const match = (Object.keys(PADDING_VALUES) as PaddingPreset[]).find(
                  (k) => PADDING_VALUES[k] === v
                );
                if (match) setPaddingPreset(match);
              }}
              className="slider"
            />
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-bg-alt p-1">
            {PADDING_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPaddingPreset(p);
                  setPadding(PADDING_VALUES[p]);
                }}
                className={segBtn(p === paddingPreset)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Corners */}
        <div className="mb-7">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Corners
          </div>
          <div className="mb-3.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-soft">Radius</span>
              <span className="rounded bg-bg-alt px-1.5 py-0.5 font-mono text-[11px] text-ink">
                {radius}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="slider"
            />
          </div>
        </div>

        {/* Shadow */}
        <div className="mb-7">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Shadow
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-bg-alt p-1">
            {SHADOW_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setShadowPreset(s)}
                className={segBtn(s === shadowPreset)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between py-2.5 text-[13px]">
            <span>Inner glow</span>
            <button
              type="button"
              aria-pressed={innerGlow}
              onClick={() => setInnerGlow((v) => !v)}
              className={`relative h-[18px] w-8 cursor-pointer rounded-full border-0 p-0 transition-colors ${
                innerGlow ? "bg-ink" : "bg-line-strong"
              } after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-white after:transition-transform after:content-[''] ${
                innerGlow ? "after:translate-x-3.5" : ""
              }`}
            />
          </div>
        </div>

        {/* Canvas ratio */}
        <div className="mb-7">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Canvas
          </div>
          <div className="grid grid-cols-5 gap-1 rounded-lg border border-line bg-bg-alt p-1">
            {RATIO_PRESETS.map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                title={
                  r === "Auto"
                    ? "Auto — canvas matches your screenshot's aspect ratio"
                    : `${r} — exports at this exact ratio (image letterboxes inside if needed)`
                }
                className={segBtn(r === ratio)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Patterns gate is handled in the left sidebar; nothing here. */}

        {/* Brand kit — discovery surface. The kit itself lives at
            /brand-kit; this section exists so new users actually find
            it. Everyone (anon included) sees what the badge does right
            where the rest of the export styling lives. Gating is
            unchanged: saving a kit stays Pro, enforced server-side. */}
        <div className="mb-7">
          <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            <span>Brand kit</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                isPro ? "bg-accent/10 text-accent" : "bg-bg-alt"
              }`}
            >
              {isPro ? "UNLOCKED" : "Pro"}
            </span>
          </div>
          {brandKit?.handle ? (
            // Kit is set (implies Pro — the kit only loads for Pro
            // users). Show the live handle and a path to edit it.
            <div className="flex items-center justify-between gap-2">
              <span
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide ${
                  brandKit.badgeStyle === "light"
                    ? "border border-line bg-white text-ink"
                    : "bg-ink text-white"
                }`}
              >
                {brandKit.handle}
              </span>
              <Link
                href="/brand-kit"
                className="rounded-lg border border-line bg-transparent px-2 py-1 text-[11px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
              >
                Edit
              </Link>
            </div>
          ) : (
            <>
              {/* Mock badge at locked-pattern opacity so it reads as a
                  preview, not a live control. */}
              <div className="mb-2.5">
                <span className="inline-block rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] tracking-wide text-white opacity-55">
                  @yourhandle
                </span>
              </div>
              <p className="mb-2.5 text-xs leading-[1.5] text-ink-soft">
                Your handle, stamped on every export. Set it once, it
                follows you.
              </p>
              <button
                type="button"
                onClick={handleBrandKitSetupClick}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-bg-alt px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-all hover:border-ink hover:text-ink"
              >
                Set up brand kit →
              </button>
            </>
          )}
        </div>

        {/* Export */}
        <div className="border-t border-line pt-5">
          <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            <span>Export</span>
            <span className="text-[9px] normal-case tracking-normal text-ink-faint">
              Scale = pixel density
            </span>
          </div>
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {FORMATS.map((f) => (
              <div
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={exportOpt(f.id === format)}
              >
                {f.label}
                <span
                  className={`mt-0.5 block text-[9px] ${
                    f.id === format ? "text-white/60" : "text-ink-faint"
                  }`}
                >
                  {f.size}
                </span>
              </div>
            ))}
          </div>
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {SCALES.map((s) => {
              const locked = s.id === "4x" && !isPro;
              return (
                <div
                  key={s.id}
                  title={locked ? `${s.hint} (Pro-only)` : s.hint}
                  onClick={() => {
                    if (locked) {
                      if (!me) {
                        void requireSignedIn({
                          title: "Sign in for 4× exports",
                          description:
                            "4× retina output is part of Pro. Sign in with Google first — we'll keep your work — then unlock Pro for $9.99/year.",
                        });
                        return;
                      }
                      confirmAndUpgrade("4× retina exports");
                      return;
                    }
                    setScale(s.id);
                  }}
                  className={`${exportOpt(s.id === scale)} ${
                    locked ? "opacity-60" : ""
                  }`}
                >
                  {s.label}
                  <span
                    className={`mt-0.5 block text-[9px] ${
                      s.id === scale ? "text-white/60" : "text-ink-faint"
                    }`}
                  >
                    {locked ? "Pro" : isPro && s.id === "4x" ? "Retina" : s.size}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleDownload}
            disabled={isExporting || outOfFreeDownloads}
            title={
              outOfFreeDownloads
                ? "Daily free limit reached — upgrade to Pro or come back tomorrow"
                : undefined
            }
            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-4 py-3.5 text-sm font-medium text-bg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting
              ? "Exporting…"
              : outOfFreeDownloads
                ? "Limit reached"
                : "Download ↓"}
          </button>
          {!isPro ? (
            <div
              className={`mt-3 rounded-lg border p-3 text-xs leading-[1.5] ${
                outOfFreeDownloads
                  ? "border-accent/30 bg-accent/5 text-ink-soft"
                  : "border-dashed border-line-strong bg-bg-alt text-ink-soft"
              }`}
            >
              {outOfFreeDownloads ? (
                <>
                  <strong className="font-medium text-accent">
                    Daily limit reached.
                  </strong>{" "}
                  Come back tomorrow, or upgrade to Pro for unlimited 4× retina
                  exports —{" "}
                  <button
                    type="button"
                    onClick={handleUpgradeClick}
                    className="cursor-pointer border-none bg-transparent p-0 font-medium text-accent underline-offset-2 hover:underline"
                  >
                    upgrade →
                  </button>
                </>
              ) : (
                <>
                  <strong className="font-medium">
                    {downloadsRemaining} free download
                    {downloadsRemaining === 1 ? "" : "s"} left today.
                  </strong>{" "}
                  Upgrade to Pro for unlimited 4× retina exports —{" "}
                  <button
                    type="button"
                    onClick={handleUpgradeClick}
                    className="cursor-pointer border-none bg-transparent p-0 font-medium text-accent underline-offset-2 hover:underline"
                  >
                    upgrade →
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs leading-[1.5] text-ink-soft">
              <strong className="font-medium text-accent">Pro mode.</strong>{" "}
              Unlimited exports at every scale. Thanks for supporting the craft.
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE EXPORT BAR — sticky to the bottom of the viewport so
          Download is always within thumb's reach. The right panel
          reserves pb-24 above to keep its last section visible. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={handleDownload}
          disabled={isExporting || outOfFreeDownloads}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-4 py-3.5 text-sm font-medium text-bg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting
            ? "Exporting…"
            : outOfFreeDownloads
              ? "Limit reached — upgrade"
              : "Download ↓"}
        </button>
      </div>
    </div>
  );
}
