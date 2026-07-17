"use client";

// Brand Kit settings.
//
// Pro-only page. Lets the user pin a handle badge (@your-name corner
// tag) + editor defaults (background, padding, shadow, window style,
// ratio, corner radius) that auto-apply on every new editor session.
// Free users see a locked state with an upgrade prompt; they can still
// see what the feature does so the value prop is concrete.
//
// Data lives server-side (users.brand_kit JSONB) so it follows the user
// across devices. See lib/brand-kit.ts for the type + helpers, and
// app/api/brand-kit/route.ts for the server endpoints.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BRAND_KIT_BACKGROUNDS,
  findBackground,
} from "@/lib/backgrounds";
import {
  type BrandKit,
  type BadgePosition,
  DEFAULT_BRAND_KIT,
  loadBrandKit,
  saveBrandKit,
  clearBrandKit,
} from "@/lib/brand-kit";
import { buildCheckoutUrl } from "@/lib/checkout";
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


// Same value maps as the editor — duplicated here to keep brand-kit
// independent. They're tiny and unlikely to drift.
const PADDING_PRESET_OPTIONS = [
  { id: "S" as const, value: 30 },
  { id: "M" as const, value: 60 },
  { id: "L" as const, value: 100 },
  { id: "XL" as const, value: 140 },
];
const SHADOW_PRESETS = ["None", "Soft", "Deep", "Lift"] as const;
const SHADOW_VALUES: Record<(typeof SHADOW_PRESETS)[number], string> = {
  None: "none",
  Soft: "0 6px 18px -8px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
  Deep: "0 30px 60px -16px rgba(0,0,0,0.32), 0 18px 36px -20px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
  Lift: "0 50px 90px -22px rgba(0,0,0,0.48), 0 25px 50px -25px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,0,0,0.05)",
};
const WINDOW_STYLES = ["light", "dark", "none"] as const;
const RATIO_PRESETS = ["Auto", "1:1", "16:9", "4:3", "9:16"] as const;
const RATIO_NUMBERS: Record<
  Exclude<(typeof RATIO_PRESETS)[number], "Auto">,
  number
> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "9:16": 9 / 16,
};

// ---- Brand Badge component -----------------------------------------
// Renders a small handle pill in the chosen corner. Used both in the
// preview here AND in the editor (kept simple inline for v1).
function BrandBadge({
  kit,
  scale = 1,
}: {
  kit: BrandKit;
  scale?: number;
}) {
  if (!kit.handle) return null;
  const positionClasses: Record<BadgePosition, string> = {
    tl: "top-2 left-2",
    tr: "top-2 right-2",
    bl: "bottom-2 left-2",
    br: "bottom-2 right-2",
  };
  const styleClasses =
    kit.badgeStyle === "light"
      ? "bg-white/90 text-ink"
      : "bg-ink/90 text-white";
  // Scale font + padding for the small preview rectangle vs the
  // full editor canvas.
  const sizing =
    scale < 1
      ? "px-1.5 py-0.5 text-[8px]"
      : "px-2.5 py-1 text-[10px]";
  return (
    <div
      className={`pointer-events-none absolute ${positionClasses[kit.badgePosition]} rounded-full font-mono tracking-wide ${sizing} ${styleClasses}`}
    >
      <div className="leading-tight">{kit.handle}</div>
      {kit.badgeIncludeWatermark && (
        <div
          className={`leading-tight opacity-60 ${
            scale < 1 ? "text-[6px]" : "text-[8px]"
          }`}
        >
          postabl.xyz
        </div>
      )}
    </div>
  );
}

// ---- Preview pane --------------------------------------------------
function Preview({ kit }: { kit: BrandKit }) {
  const bg = findBackground(kit.defaultBgId);
  // Pick a representative ratio for the preview window. "Auto" has no
  // intrinsic ratio so we render a 16:9 as a reasonable stand-in.
  const ratioNum =
    kit.defaultRatio === "Auto" ? 16 / 9 : RATIO_NUMBERS[kit.defaultRatio];
  // Scale the padding to fit the preview frame (which is ~360px wide
  // vs the editor's ~900px). Ratio of about 0.4x.
  const scaledPadding = Math.round(kit.defaultPadding * 0.4);

  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Preview
      </div>
      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl"
        style={{
          ...bg.style,
          padding: `${scaledPadding}px`,
          aspectRatio: ratioNum,
        }}
      >
        <div
          className="flex h-full max-h-full w-full max-w-full flex-col overflow-hidden bg-white"
          style={{
            aspectRatio: ratioNum,
            borderRadius: `${kit.defaultRadius}px`,
            boxShadow: SHADOW_VALUES[kit.defaultShadowPreset],
          }}
        >
          {kit.defaultWindowStyle !== "none" && (
            <div
              className="flex flex-shrink-0 items-center gap-1 px-2 py-1.5"
              style={{
                background:
                  kit.defaultWindowStyle === "dark" ? "#1a1a1a" : "#f5f5f5",
                borderBottom:
                  "1px solid " +
                  (kit.defaultWindowStyle === "dark" ? "#2a2a2a" : "#eaeaea"),
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#febc2e]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
            </div>
          )}
          <div className="flex flex-1 items-center justify-center bg-bg-alt">
            <div className="font-mono text-[10px] text-ink-faint">
              your screenshot
            </div>
          </div>
        </div>
        <BrandBadge kit={kit} scale={0.6} />
      </div>
      <div className="font-mono text-[10px] tracking-wide text-ink-faint">
        This is what your next export will look like.
      </div>
    </div>
  );
}

// ---- Page ----------------------------------------------------------
export default function BrandKitPage() {
  const router = useRouter();
  const notify = useNotify();

  const [me, setMe] = useState<MeUser>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const [kit, setKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  // Mirrors what's on the server so we can show "Saved" vs "Unsaved
  // changes" hints and know whether Clear is meaningful.
  const [savedSnapshot, setSavedSnapshot] = useState<BrandKit | null>(null);
  const [loadingKit, setLoadingKit] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load /me + account-switch guard (same as editor + saved).
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

  // Load existing brand kit from server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await loadBrandKit();
        if (cancelled) return;
        if (existing) {
          // Prefill the handle with a sensible default derived from
          // the user's display name if they haven't set one yet.
          setKit(existing);
          setSavedSnapshot(existing);
        }
      } finally {
        if (!cancelled) setLoadingKit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close user menu on outside click.
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

  const isPro = me?.isPro ?? false;
  const dirty =
    savedSnapshot === null
      ? hasNonDefaultChanges(kit)
      : JSON.stringify(savedSnapshot) !== JSON.stringify(kit);

  async function handleSave() {
    if (!isPro) {
      handleUpgradeClick();
      return;
    }
    setSaving(true);
    try {
      const saved = await saveBrandKit(kit);
      if (saved) {
        setKit(saved);
        setSavedSnapshot(saved);
      }
      notify.toast("Brand kit saved — applies to your next export.", {
        tone: "success",
        duration: 2500,
      });
    } catch (err) {
      notify.toast(
        err instanceof Error ? err.message : "Couldn't save your brand kit.",
        { tone: "error" }
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    const ok = await notify.confirm({
      title: "Clear your brand kit?",
      description:
        "Your defaults and handle badge will be removed. You can set them up again at any time.",
      confirmLabel: "Clear",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    await clearBrandKit();
    setKit(DEFAULT_BRAND_KIT);
    setSavedSnapshot(null);
    notify.toast("Brand kit cleared.", { duration: 2500 });
  }

  function handleUpgradeClick() {
    if (!me) {
      router.push("/signin?next=/brand-kit");
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
    window.location.href = url;
  }

  async function handleSignout() {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // ignore
    }
    await clearAllLocalData();
    setMe(null);
    setUserMenuOpen(false);
    router.push("/signin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bg text-sm text-ink">
      {/* TOP BAR — mirrors the editor's compact bar */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur md:h-14 md:px-5">
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
            brand kit
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-3 py-2 text-[13px] font-medium text-ink-soft transition-all hover:bg-bg-alt hover:text-ink"
          >
            ← Editor
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
                  <Link
                    href="/saved"
                    className="block w-full px-3.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-bg-alt hover:text-ink"
                  >
                    Your saved
                  </Link>
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
              href="/signin?next=/brand-kit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-bg transition-all hover:bg-black"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-10 md:px-10 md:py-16">
        {/* Hero */}
        <div className="mb-8 flex flex-col items-start gap-3 md:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-alt px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Pro feature
          </div>
          <h1 className="font-serif text-[36px] font-normal leading-[1.05] tracking-[-1px] md:text-[48px]">
            Your brand,{" "}
            <em className="text-accent">on every export.</em>
          </h1>
          <p className="max-w-[640px] text-[15px] leading-[1.55] text-ink-soft">
            Set your handle, default background, padding, and shadow once.
            Every new editor session loads with your kit applied — your
            second screenshot is one click away from posting.
          </p>
        </div>

        {/* Pro-gate banner — visible only for free / signed-out */}
        {!loadingKit && !isPro && (
          <div className="mb-8 rounded-2xl border border-accent/30 bg-accent/5 p-5 md:p-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">
              Pro only
            </div>
            <div className="mb-4 max-w-[480px] text-[15px] leading-[1.55] text-ink">
              Brand Kit is included with Postabl Pro. Unlock it along with
              unlimited daily exports, 4× retina output, and pattern
              backgrounds — $9.99/year.
            </div>
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-bg transition-all hover:-translate-y-[1px] hover:bg-black"
            >
              {me ? "Upgrade to Pro" : "Sign in to upgrade"} →
            </button>
          </div>
        )}

        {/* Form + Preview — disabled when not Pro */}
        <div
          className={`grid gap-8 md:grid-cols-[1fr_minmax(300px,420px)] md:gap-10 ${
            !isPro && !loadingKit ? "pointer-events-none opacity-60" : ""
          }`}
          aria-disabled={!isPro && !loadingKit}
        >
          <div className="space-y-8">
            {/* HANDLE BADGE */}
            <section>
              <SectionHeader
                step="01"
                title="Handle badge"
                description="A tiny pill in the corner of every export — like signing your work."
              />
              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    Handle
                  </label>
                  <input
                    type="text"
                    value={kit.handle}
                    onChange={(e) =>
                      setKit((k) => ({ ...k, handle: e.target.value }))
                    }
                    placeholder="@your-handle"
                    spellCheck={false}
                    maxLength={40}
                    className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-ink"
                  />
                  <div className="mt-1.5 font-mono text-[10px] text-ink-faint">
                    Leave blank to disable the badge entirely.
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    Position
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["tl", "tr", "bl", "br"] as BadgePosition[]).map(
                      (pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() =>
                            setKit((k) => ({ ...k, badgePosition: pos }))
                          }
                          aria-pressed={kit.badgePosition === pos}
                          aria-label={badgePositionLabel(pos)}
                          className={`relative flex aspect-square items-center justify-center rounded-lg border-2 bg-bg-alt p-0 transition-all hover:scale-105 ${
                            kit.badgePosition === pos
                              ? "border-ink"
                              : "border-transparent"
                          }`}
                        >
                          <div
                            className={`absolute h-2 w-2 rounded-full bg-accent ${
                              pos === "tl"
                                ? "left-1.5 top-1.5"
                                : pos === "tr"
                                  ? "right-1.5 top-1.5"
                                  : pos === "bl"
                                    ? "bottom-1.5 left-1.5"
                                    : "bottom-1.5 right-1.5"
                            }`}
                          />
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    Style
                  </label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-bg-alt p-1">
                    <SegButton
                      active={kit.badgeStyle === "dark"}
                      onClick={() =>
                        setKit((k) => ({ ...k, badgeStyle: "dark" }))
                      }
                    >
                      Dark
                    </SegButton>
                    <SegButton
                      active={kit.badgeStyle === "light"}
                      onClick={() =>
                        setKit((k) => ({ ...k, badgeStyle: "light" }))
                      }
                    >
                      Light
                    </SegButton>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-[13px] text-ink">
                      Include “postabl.xyz”
                    </div>
                    <div className="font-mono text-[10px] text-ink-faint">
                      Tiny subtitle under your handle.
                    </div>
                  </div>
                  <Toggle
                    on={kit.badgeIncludeWatermark}
                    onClick={() =>
                      setKit((k) => ({
                        ...k,
                        badgeIncludeWatermark: !k.badgeIncludeWatermark,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            {/* DEFAULT BACKGROUND */}
            <section>
              <SectionHeader
                step="02"
                title="Default background"
                description="What loads when you open a fresh editor."
              />
              <div className="mt-5 grid grid-cols-6 gap-2 md:grid-cols-8">
                {BRAND_KIT_BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setKit((k) => ({ ...k, defaultBgId: b.id }))
                    }
                    aria-label={b.label}
                    aria-pressed={kit.defaultBgId === b.id}
                    title={b.label}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 p-0 transition-all hover:scale-105 ${
                      kit.defaultBgId === b.id
                        ? "border-ink"
                        : "border-transparent"
                    }`}
                    style={b.style}
                  >
                    {kit.defaultBgId === b.id && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent shadow-[0_0_0_2px_white]" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* DEFAULTS */}
            <section>
              <SectionHeader
                step="03"
                title="Defaults"
                description="Padding, shadow, window chrome, ratio, corner radius. The frame that wraps every screenshot."
              />
              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    Padding
                  </label>
                  <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-bg-alt p-1">
                    {PADDING_PRESET_OPTIONS.map((p) => (
                      <SegButton
                        key={p.id}
                        active={kit.defaultPaddingPreset === p.id}
                        onClick={() =>
                          setKit((k) => ({
                            ...k,
                            defaultPaddingPreset: p.id,
                            defaultPadding: p.value,
                          }))
                        }
                      >
                        {p.id}
                      </SegButton>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    Shadow
                  </label>
                  <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-bg-alt p-1">
                    {SHADOW_PRESETS.map((s) => (
                      <SegButton
                        key={s}
                        active={kit.defaultShadowPreset === s}
                        onClick={() =>
                          setKit((k) => ({ ...k, defaultShadowPreset: s }))
                        }
                      >
                        {s}
                      </SegButton>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    Window chrome
                  </label>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-bg-alt p-1">
                    {WINDOW_STYLES.map((w) => (
                      <SegButton
                        key={w}
                        active={kit.defaultWindowStyle === w}
                        onClick={() =>
                          setKit((k) => ({ ...k, defaultWindowStyle: w }))
                        }
                      >
                        {w === "none" ? "None" : w[0].toUpperCase() + w.slice(1)}
                      </SegButton>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    Canvas ratio
                  </label>
                  <div className="grid grid-cols-5 gap-1 rounded-lg border border-line bg-bg-alt p-1">
                    {RATIO_PRESETS.map((r) => (
                      <SegButton
                        key={r}
                        active={kit.defaultRatio === r}
                        onClick={() =>
                          setKit((k) => ({ ...k, defaultRatio: r }))
                        }
                      >
                        {r}
                      </SegButton>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      Corner radius
                    </span>
                    <span className="rounded bg-bg-alt px-1.5 py-0.5 font-mono text-[11px] text-ink">
                      {kit.defaultRadius}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={kit.defaultRadius}
                    onChange={(e) =>
                      setKit((k) => ({
                        ...k,
                        defaultRadius: Number(e.target.value),
                      }))
                    }
                    className="slider"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* PREVIEW — sticky on desktop */}
          <aside className="md:sticky md:top-20 md:self-start">
            <Preview kit={kit} />
          </aside>
        </div>

        {/* Save bar */}
        <div className="mt-10 flex flex-col items-stretch gap-3 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <div className="font-mono text-[11px] text-ink-faint">
            {!isPro
              ? "Upgrade to Pro to save your brand kit."
              : savedSnapshot
                ? dirty
                  ? "Unsaved changes."
                  : "All changes saved."
                : "Not saved yet."}
          </div>
          <div className="flex gap-2">
            {savedSnapshot && (
              <button
                type="button"
                onClick={handleClear}
                disabled={!isPro || saving}
                className="rounded-full border border-line bg-transparent px-4 py-2.5 text-[13px] font-medium text-ink-soft transition-all hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear brand kit
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!isPro && Boolean(me))}
              className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-bg transition-all hover:-translate-y-[1px] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : isPro ? "Save brand kit" : "Unlock Pro"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---- Tiny helpers --------------------------------------------------

function SectionHeader({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-line pb-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        /{step}
      </div>
      <h2 className="mt-1 font-serif text-[22px] font-medium leading-[1.1] tracking-tight">
        {title}
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-soft">{description}</p>
    </div>
  );
}

function SegButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-1.5 py-1.5 font-mono text-[11px] transition-all ${
        active
          ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          : "bg-transparent text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`relative h-[18px] w-8 cursor-pointer rounded-full border-0 p-0 transition-colors ${
        on ? "bg-ink" : "bg-line-strong"
      } after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-white after:transition-transform after:content-[''] ${
        on ? "after:translate-x-3.5" : ""
      }`}
    />
  );
}

function badgePositionLabel(p: BadgePosition): string {
  return {
    tl: "Top-left",
    tr: "Top-right",
    bl: "Bottom-left",
    br: "Bottom-right",
  }[p];
}

function hasNonDefaultChanges(k: BrandKit): boolean {
  // Anything filled in by the user beyond DEFAULT_BRAND_KIT counts as
  // dirty so the Save button doesn't lie about "nothing to save".
  return JSON.stringify(k) !== JSON.stringify(DEFAULT_BRAND_KIT);
}
