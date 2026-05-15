"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toPng, toJpeg, toBlob } from "html-to-image";
import {
  DAILY_FREE_LIMIT,
  bumpDownloads,
  getDownloadsUsed,
  getIsPro,
  setIsProStored,
} from "@/lib/free-downloads";
import { addSavedImage } from "@/lib/saved-images";
import { buildCheckoutUrl } from "@/lib/checkout";
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

type Background = {
  id: string;
  label: string;
  style: React.CSSProperties;
};

const BACKGROUNDS: Background[] = [
  {
    id: "peach",
    label: "Peach",
    style: {
      background:
        "radial-gradient(circle at 30% 20%, #fce4b6, transparent 50%), radial-gradient(circle at 80% 80%, #e8a598, transparent 50%), linear-gradient(135deg, #f4c896, #d98a7a)",
    },
  },
  { id: "forest", label: "Forest", style: { background: "linear-gradient(135deg, #2d3b3a, #0f1816)" } },
  { id: "stone", label: "Stone", style: { background: "linear-gradient(135deg, #e8e3d8, #c9c2b0)" } },
  { id: "noir", label: "Noir", style: { background: "#1a1a1a" } },
  { id: "paper", label: "Paper", style: { background: "#f0ede5" } },
  { id: "ember", label: "Ember", style: { background: "linear-gradient(135deg, #d94f2e, #b33a1e)" } },
  { id: "moss", label: "Moss", style: { background: "linear-gradient(135deg, #4a5d4e, #2d3b3a)" } },
  {
    id: "stripes",
    label: "Stripes",
    style: {
      background:
        "repeating-linear-gradient(45deg, #e8e3d8, #e8e3d8 10px, #d9d4c7 10px, #d9d4c7 11px)",
    },
  },
  {
    id: "spotlight",
    label: "Spotlight",
    style: { background: "radial-gradient(circle at 50% 50%, #fff 0%, #c9c2b0 100%)" },
  },
  { id: "sand", label: "Sand", style: { background: "linear-gradient(180deg, #e5deca, #c1b799)" } },
  { id: "midnight", label: "Midnight", style: { background: "linear-gradient(135deg, #16213e, #0f3460)" } },

  // Light & pastel —
  { id: "blush", label: "Blush", style: { background: "linear-gradient(135deg, #fce1e4, #f8c7cc)" } },
  { id: "mint", label: "Mint", style: { background: "linear-gradient(135deg, #d9ece2, #bfddcf)" } },
  { id: "sky", label: "Sky", style: { background: "linear-gradient(135deg, #dbe8f4, #a9c5e2)" } },
  { id: "lilac", label: "Lilac", style: { background: "linear-gradient(135deg, #e8e0ed, #cfc0db)" } },
  { id: "butter", label: "Butter", style: { background: "linear-gradient(135deg, #fbf0d0, #f2dca0)" } },
  { id: "fog", label: "Fog", style: { background: "linear-gradient(180deg, #eceff2, #c9ccd1)" } },

  // Warm —
  { id: "coral", label: "Coral", style: { background: "linear-gradient(135deg, #ffc2a8, #ff8b6b)" } },
  { id: "amber", label: "Amber", style: { background: "linear-gradient(135deg, #fbe0a2, #d99b4e)" } },
  { id: "desert", label: "Desert", style: { background: "linear-gradient(135deg, #eac6a1, #c48758)" } },
  { id: "rose", label: "Rose", style: { background: "linear-gradient(135deg, #eba1ad, #c4566b)" } },
  { id: "terracotta", label: "Terracotta", style: { background: "linear-gradient(135deg, #c97b5a, #8b3a1e)" } },

  // Cool / earthy —
  { id: "sage", label: "Sage", style: { background: "linear-gradient(135deg, #b5c3a5, #7d8b6f)" } },
  { id: "ocean", label: "Ocean", style: { background: "linear-gradient(135deg, #4a8fa8, #1f3d5a)" } },
  { id: "lagoon", label: "Lagoon", style: { background: "linear-gradient(135deg, #7ab8a8, #3b6e68)" } },
  { id: "denim", label: "Denim", style: { background: "linear-gradient(135deg, #5a7aa0, #2d4565)" } },

  // Dark / moody —
  { id: "slate", label: "Slate", style: { background: "linear-gradient(135deg, #b4b8c0, #6e737d)" } },
  { id: "graphite", label: "Graphite", style: { background: "linear-gradient(135deg, #3a3a3a, #151515)" } },
  { id: "plum", label: "Plum", style: { background: "linear-gradient(135deg, #6b4a72, #2e1a36)" } },
  { id: "wine", label: "Wine", style: { background: "linear-gradient(135deg, #6e2a3a, #3a1520)" } },

  // Mesh gradients —
  {
    id: "sunset",
    label: "Sunset",
    style: {
      background:
        "radial-gradient(circle at 20% 20%, #ffd5a8, transparent 55%), radial-gradient(circle at 80% 30%, #ff9a8b, transparent 55%), radial-gradient(circle at 60% 80%, #a66ea0, transparent 55%), linear-gradient(135deg, #ffb088, #c96a7d)",
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    style: {
      background:
        "radial-gradient(circle at 25% 30%, #9fd9c9, transparent 55%), radial-gradient(circle at 75% 20%, #6a9fd1, transparent 55%), radial-gradient(circle at 60% 80%, #9d7fd1, transparent 55%), linear-gradient(135deg, #4a6b8c, #2a3f5a)",
    },
  },
  {
    id: "citrus",
    label: "Citrus",
    style: {
      background:
        "radial-gradient(circle at 30% 30%, #fff4a3, transparent 55%), radial-gradient(circle at 80% 70%, #c7d86b, transparent 55%), linear-gradient(135deg, #f6e38e, #9fb04e)",
    },
  },
  {
    id: "berry",
    label: "Berry",
    style: {
      background:
        "radial-gradient(circle at 20% 30%, #f0a9c2, transparent 55%), radial-gradient(circle at 80% 70%, #9a5ba0, transparent 55%), linear-gradient(135deg, #c86f91, #5a2b5c)",
    },
  },
  {
    id: "twilight",
    label: "Twilight",
    style: {
      background:
        "radial-gradient(circle at 25% 80%, #d94f2e40, transparent 55%), radial-gradient(circle at 75% 25%, #4a6b8c60, transparent 55%), linear-gradient(135deg, #1a1a2e, #0d1020)",
    },
  },

  {
    id: "dashed",
    label: "Custom",
    style: {
      background: "linear-gradient(135deg, #fafafa, #e5e5e5)",
      border: "1px dashed var(--line-strong)",
    },
  },
];

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

const RATIO_PRESETS = ["1:1", "16:9", "4:3", "9:16"] as const;
type RatioPreset = (typeof RATIO_PRESETS)[number];
const RATIO_VALUES: Record<RatioPreset, string> = {
  "1:1": "1 / 1",
  "16:9": "16 / 9",
  "4:3": "4 / 3",
  "9:16": "9 / 16",
};
// width / height — used to shrink the frame's width when portrait
// ratios would otherwise overflow the viewport height.
const RATIO_NUMBERS: Record<RatioPreset, number> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "9:16": 9 / 16,
};

// Pattern backgrounds (Pro-gated) — same shape as BACKGROUNDS so they can
// be set via setBgId.
const PATTERNS: Background[] = [
  {
    id: "pattern-dots",
    label: "Dots",
    style: {
      backgroundImage:
        "radial-gradient(circle, #c9c2b0 1px, transparent 1px)",
      backgroundSize: "8px 8px",
      backgroundColor: "#f0ede5",
    },
  },
  {
    id: "pattern-lines-v",
    label: "Vertical lines",
    style: {
      background:
        "repeating-linear-gradient(90deg, #f0ede5, #f0ede5 8px, #e4e0d4 8px, #e4e0d4 9px)",
    },
  },
  {
    id: "pattern-lines-diag",
    label: "Diagonal lines",
    style: {
      background:
        "repeating-linear-gradient(45deg, #f0ede5, #f0ede5 4px, #e4e0d4 4px, #e4e0d4 5px)",
    },
  },
];
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
const STORAGE_KEY = "postabl:screenshot";

const presetClasses =
  "relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 border-transparent transition-all hover:scale-105";

function PresetDot({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent shadow-[0_0_0_2px_white]" />
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
  const [ratio, setRatio] = useState<RatioPreset>("16:9");
  const [innerGlow, setInnerGlow] = useState(false);
  const [format, setFormat] = useState("PNG");
  const [scale, setScale] = useState("2x");
  const [windowStyle, setWindowStyle] = useState<"light" | "dark" | "none">("light");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  // Dev-only override — lets us preview Pro-gated UI without going
  // through Lemon Squeezy. Hidden in production builds; the effective
  // `isPro` below combines this with the server-side flag.
  const [devProOverride, setDevProOverride] = useState(false);
  const [urlText, setUrlText] = useState("postabl.xyz/editor");
  const [showAllBackgrounds, setShowAllBackgrounds] = useState(false);
  const [me, setMe] = useState<MeUser>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [downloadsUsed, setDownloadsUsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const notify = useNotify();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Load saved screenshot from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setScreenshot(saved);
    } catch {
      // localStorage blocked — silently continue without a saved image.
    }
  }, []);

  // Hydrate today's download count from localStorage, and (dev only)
  // restore the Pro override so it survives reloads.
  useEffect(() => {
    setDownloadsUsed(getDownloadsUsed());
    if (IS_DEV) setDevProOverride(getIsPro());
  }, []);

  function bumpDownloadCount() {
    const next = bumpDownloads();
    setDownloadsUsed(next);
  }

  function toggleDevProOverride() {
    setDevProOverride((prev) => {
      const next = !prev;
      setIsProStored(next);
      return next;
    });
  }

  // Effective Pro state — server is canonical, dev override is purely a
  // local convenience that does nothing in a production build.
  const serverIsPro = me?.isPro ?? false;
  const isPro = serverIsPro || (IS_DEV && devProOverride);

  const downloadsRemaining = Math.max(0, DAILY_FREE_LIMIT - downloadsUsed);
  const outOfFreeDownloads = !isPro && downloadsRemaining <= 0;

  // Hydrate current user from the session cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setMe(data.user);
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
    setMe(null);
    setUserMenuOpen(false);
    router.push("/signin");
    router.refresh();
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

  const bg =
    [...BACKGROUNDS, ...PATTERNS].find((b) => b.id === bgId) ??
    BACKGROUNDS[0];

  const segBtn = (active: boolean) =>
    `rounded-md px-1.5 py-1.5 font-mono text-[11px] transition-all ${
      active
        ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
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
    if (!file.type.startsWith("image/")) {
      notify.toast("Please pick an image file (PNG, JPG, WEBP, GIF).", {
        tone: "error",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) return;
      setScreenshot(dataUrl);
      try {
        window.localStorage.setItem(STORAGE_KEY, dataUrl);
      } catch {
        // Quota exceeded or blocked — image stays in memory for this session.
        notify.toast(
          "Couldn't cache the screenshot locally. It'll stay loaded for this session only.",
          { tone: "error", duration: 5000 }
        );
      }
    };
    reader.readAsDataURL(file);
    // Reset so picking the same file twice still triggers onChange.
    e.target.value = "";
  }

  function handleClearScreenshot() {
    setScreenshot(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  async function handleDownload() {
    const node = frameRef.current;
    if (!node) return;
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
    <div className="grid h-screen grid-cols-[260px_1fr_320px] grid-rows-[56px_1fr] overflow-hidden bg-bg text-sm text-ink">
      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* TOP BAR */}
      <header className="col-span-full z-10 flex items-center justify-between border-b border-line bg-bg px-5">
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
            screenshot_01 <span className="text-ink-faint">/ untitled</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Dev-only Pro/Free toggle for testing gated features.
              Hidden in production builds — real Pro state comes from
              the server (Lemon Squeezy webhook -> users.is_pro). */}
          {IS_DEV && (
            <button
              type="button"
              onClick={toggleDevProOverride}
              aria-pressed={isPro}
              title="DEV ONLY: toggle Pro override (hidden in production)"
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-wide transition-colors ${
                isPro
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-bg-alt text-ink-faint hover:text-ink"
              }`}
            >
              <span className="relative inline-flex h-[14px] w-6 items-center rounded-full bg-ink/10">
                <span
                  className={`absolute h-[10px] w-[10px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform ${
                    isPro ? "translate-x-[14px] bg-accent" : "translate-x-[2px]"
                  }`}
                />
              </span>
              {isPro ? "PRO" : "FREE"}
              <span className="ml-1 text-[8px] uppercase opacity-60">dev</span>
            </button>
          )}

          {isPro ? (
            <div className="rounded-full border border-line bg-bg-alt px-2.5 py-1 font-mono text-[11px] tracking-wide text-ink-faint">
              <strong className="font-medium text-ink">∞</strong> UNLIMITED DOWNLOADS
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
              {outOfFreeDownloads ? "LIMIT REACHED" : "FREE DOWNLOADS LEFT"}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
          >
            {screenshot ? "Replace image" : "Upload image"} ↑
          </button>
          {screenshot && (
            <button
              onClick={handleClearScreenshot}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
            >
              Clear
            </button>
          )}
          <Link
            href="/saved"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
          >
            Saved
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving || !screenshot}
            title={
              !screenshot
                ? "Upload a screenshot to save it"
                : "Save this composition to your library"
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          {!isPro && (
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-bg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
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
          ) : (
            <Link
              href="/signin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* LEFT SIDEBAR */}
      <aside className="overflow-y-auto border-r border-line bg-bg py-5">
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
            <div
              onClick={() => setWindowStyle("light")}
              title="Light — macOS-style title bar with traffic-light dots and URL field"
              className={`relative flex aspect-[16/10] cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-white transition-all hover:scale-105 ${
                windowStyle === "light" ? "border-ink" : "border-transparent"
              }`}
            >
              <PresetDot active={windowStyle === "light"} />
              <div className="flex h-[30%] items-center gap-0.5 bg-[#f5f5f5] pl-1">
                <span className="h-1 w-1 rounded-full bg-[#ff5f57]" />
                <span className="h-1 w-1 rounded-full bg-[#febc2e]" />
                <span className="h-1 w-1 rounded-full bg-[#28c840]" />
              </div>
            </div>
            <div
              onClick={() => setWindowStyle("dark")}
              title="Dark — same chrome on a dark title bar"
              className={`relative flex aspect-[16/10] cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-[#1a1a1a] transition-all hover:scale-105 ${
                windowStyle === "dark" ? "border-ink" : "border-transparent"
              }`}
            >
              <PresetDot active={windowStyle === "dark"} />
              <div className="h-[30%] bg-[#2a2a2a]" />
            </div>
            <div
              onClick={() => setWindowStyle("none")}
              title="None — no title bar; the screenshot fills the frame edge to edge"
              className={`relative flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 bg-white transition-all hover:scale-105 ${
                windowStyle === "none" ? "border-ink" : "border-transparent"
              }`}
            >
              <PresetDot active={windowStyle === "none"} />
              <span className="font-mono text-[10px] text-[#999]">none</span>
            </div>
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

      {/* CANVAS */}
      <main className="canvas-grid relative flex items-center justify-center overflow-auto p-10">

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
        <div
          ref={frameRef}
          className="flex max-w-full items-center justify-center rounded-2xl shadow-canvas transition-all"
          style={{
            ...bg.style,
            padding: `${padding}px`,
            aspectRatio: RATIO_VALUES[ratio],
            // Width caps at 720px but shrinks when the ratio would
            // otherwise push the frame past the visible canvas height
            // (e.g. 9:16 portrait on a 900px-tall viewport).
            width: `min(720px, calc((100vh - 180px) * ${RATIO_NUMBERS[ratio]}))`,
          }}
        >
          <div
            className="w-full overflow-hidden bg-white transition-all"
            style={{
              borderRadius: `${radius}px`,
              boxShadow: innerGlow
                ? `${SHADOW_VALUES[shadowPreset]}, inset 0 0 60px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,0.9)`
                : SHADOW_VALUES[shadowPreset],
            }}
          >
            {windowStyle !== "none" && (
              <div
                className="flex items-center gap-1.5 border-b border-[#eaeaea] bg-[#f5f5f5] px-4 py-3"
                style={
                  windowStyle === "dark"
                    ? { background: "#1a1a1a", borderColor: "#2a2a2a" }
                    : undefined
                }
              >
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <input
                  type="text"
                  value={urlText}
                  onChange={(e) => setUrlText(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  placeholder="your-url.com"
                  spellCheck={false}
                  className="ml-4 flex-grow rounded-full border border-[#e4e0d4] bg-white px-3 py-1 text-center font-mono text-[11px] text-ink-faint outline-none transition-colors focus:border-ink focus:text-ink"
                />
              </div>
            )}
            {screenshot ? (
              // Uploaded image replaces the placeholder.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={screenshot}
                alt="Uploaded screenshot"
                className="block h-auto w-full"
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group min-h-[280px] cursor-pointer p-10 transition-colors hover:bg-bg-alt/60"
              >
                <h2 className="mb-3 font-serif text-[32px] font-medium leading-[1.1] tracking-tight">
                  Your screenshots,{" "}
                  <em className="text-accent">seriously upgraded.</em>
                </h2>
                <p className="mb-5 text-sm leading-[1.55] text-ink-soft">
                  Drop an image. Pick a background. Ship something people actually want to look at. That&apos;s the whole workflow.
                </p>
                <div className="flex gap-2">
                  <div className="rounded-lg bg-ink px-3.5 py-2 text-xs font-medium text-white">
                    Upload screenshot ↑
                  </div>
                  <div className="rounded-lg border border-line px-3.5 py-2 text-xs font-medium text-ink">
                    Learn more
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>

      {/* RIGHT PANEL */}
      <aside className="overflow-y-auto border-l border-line bg-bg p-5">
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
              setRatio("16:9");
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
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-bg-alt p-1">
            {RATIO_PRESETS.map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                className={segBtn(r === ratio)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Patterns gate is handled in the left sidebar; nothing here. */}

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
    </div>
  );
}
