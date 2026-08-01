"use client";

// The X profile card itself — four layouts sharing one 16:9 shell.
//
// Styled in Postabl's register rather than as a generic dark "NFT card":
// cream paper stock, Fraunces for names and numerals, JetBrains Mono for
// labels, a single terracotta accent. It reads as a Postabl artefact, and
// it drops straight onto a Postabl background when the user continues
// into the editor.
//
// The shell carries no padding or background of its own — the editor
// supplies those after the handoff, so the card must stay a tight tile.

import { forwardRef, type ReactNode } from "react";
import { formatCount, proxiedMedia, type CardStyleId, type XProfile } from "@/lib/xshare";

// crossOrigin="anonymous" pairs with the same-origin proxy: it keeps the
// export canvas clean so html-to-image can read pixels back out.
function Media({ src, className }: { src: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} crossOrigin="anonymous" />;
}

function VerifiedBadge({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      role="img"
      aria-label="Verified"
      className="shrink-0"
    >
      <rect width="20" height="20" rx="5" fill="#d94f2e" />
      <path
        d="M5.5 10.2l2.8 2.8 6.2-6.4"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Bottom-right maker's mark, same lockup as the site nav.
function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-baseline gap-[2px] font-serif text-[13px] font-medium tracking-tight sm:text-[15px] ${
        onDark ? "text-white/70" : "text-ink-faint"
      }`}
    >
      postabl
      <span className="inline-block h-[5px] w-[5px] rounded-full bg-accent" />
    </span>
  );
}

function Identity({
  profile,
  size = "default",
  onDark = false,
}: {
  profile: XProfile;
  size?: "default" | "large" | "compact";
  onDark?: boolean;
}) {
  const nameClass =
    size === "large"
      ? "text-[clamp(1.5rem,4.6vw,2.6rem)]"
      : size === "compact"
        ? "text-[clamp(1.1rem,3.2vw,1.9rem)]"
        : "text-[clamp(1.2rem,3.8vw,2.3rem)]";

  return (
    <div className="min-w-0">
      <div
        className={`flex items-start gap-2 ${size === "large" ? "justify-center" : ""}`}
      >
        <h2
          className={`line-clamp-2 min-w-0 font-serif font-medium leading-[1] tracking-[-0.02em] ${nameClass} ${
            onDark ? "text-white" : "text-ink"
          }`}
        >
          {profile.name}
        </h2>
        {profile.verified && (
          <span className="mt-[0.35em] shrink-0">
            <VerifiedBadge size={size === "compact" ? 15 : 18} />
          </span>
        )}
      </div>
      <p
        className={`truncate font-mono tracking-wide ${
          size === "compact" ? "mt-1 text-[11px]" : "mt-1.5 text-[12px] sm:text-[13px]"
        } ${onDark ? "text-white/60" : "text-ink-faint"}`}
      >
        @{profile.username}
      </p>
    </div>
  );
}

function Stat({
  value,
  label,
  compact,
  onDark = false,
}: {
  value: number;
  label: string;
  compact?: boolean;
  onDark?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span
        className={`font-serif font-medium leading-none tracking-[-0.02em] tabular-nums ${
          compact
            ? "text-[clamp(1.1rem,2.8vw,1.7rem)]"
            : "text-[clamp(1.25rem,3.2vw,2.1rem)]"
        } ${onDark ? "text-white" : "text-ink"}`}
      >
        {formatCount(value)}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-accent sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}

function StatsRow({
  profile,
  compact,
  onDark = false,
}: {
  profile: XProfile;
  compact?: boolean;
  onDark?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className={`flex ${compact ? "gap-6" : "gap-6 sm:gap-10"}`}>
        <Stat
          value={profile.followers}
          label="Followers"
          compact={compact}
          onDark={onDark}
        />
        <Stat
          value={profile.following}
          label="Following"
          compact={compact}
          onDark={onDark}
        />
      </div>
      <Wordmark onDark={onDark} />
    </div>
  );
}

/** Hairline above the stats — terracotta fading into the paper. */
function Rule({ onDark = false }: { onDark?: boolean }) {
  return (
    <div
      className={`mb-2.5 h-px w-full sm:mb-3.5 ${
        onDark
          ? "bg-gradient-to-r from-accent via-white/20 to-transparent"
          : "bg-gradient-to-r from-accent via-line-strong to-transparent"
      }`}
    />
  );
}

/** Studio — portrait left, identity and stats right, on cream stock. */
function StudioLayout({
  profile,
  avatarSrc,
}: {
  profile: XProfile;
  avatarSrc: string;
}) {
  return (
    <>
      <div className="absolute inset-0 bg-bg" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />
      <div className="relative z-10 flex h-full gap-3.5 p-4 sm:gap-5 sm:p-6">
        <div className="relative w-[34%] shrink-0 overflow-hidden rounded-lg border border-line sm:w-[36%]">
          <Media src={avatarSrc} className="h-full w-full object-cover" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 sm:py-1">
          <Identity profile={profile} />
          <div className="shrink-0">
            <Rule />
            <StatsRow profile={profile} />
          </div>
        </div>
      </div>
    </>
  );
}

/** Minimal — circular avatar, centred type, lots of paper. */
function MinimalLayout({
  profile,
  avatarSrc,
}: {
  profile: XProfile;
  avatarSrc: string;
}) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, #efece5, #f7f5f0 60%)",
        }}
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 py-5 text-center sm:px-10 sm:py-7">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <Media
            src={avatarSrc}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-accent/30 sm:h-[88px] sm:w-[88px]"
          />
          <Identity profile={profile} size="large" />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-2.5 flex justify-center gap-10 text-left sm:gap-16">
            <Stat value={profile.followers} label="Followers" />
            <Stat value={profile.following} label="Following" />
          </div>
          <div className="flex justify-center">
            <Wordmark />
          </div>
        </div>
      </div>
    </>
  );
}

/** Wash — the banner sits behind a heavy cream wash so type stays legible. */
function WashLayout({
  profile,
  avatarSrc,
  bannerSrc,
}: {
  profile: XProfile;
  avatarSrc: string;
  bannerSrc: string | null;
}) {
  return (
    <>
      <div className="absolute inset-0" aria-hidden>
        {bannerSrc ? (
          <Media
            src={bannerSrc}
            className="h-full w-full object-cover opacity-40"
          />
        ) : (
          <div className="h-full w-full bg-bg-alt" />
        )}
        <div className="absolute inset-0 bg-[rgba(247,245,240,0.86)]" />
      </div>
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />
      <div className="relative z-10 flex h-full gap-3.5 p-4 sm:gap-5 sm:p-6">
        <div className="relative w-[34%] shrink-0 overflow-hidden rounded-lg border border-line sm:w-[36%]">
          <Media src={avatarSrc} className="h-full w-full object-cover" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 sm:py-1">
          <Identity profile={profile} />
          <div className="shrink-0">
            <Rule />
            <StatsRow profile={profile} />
          </div>
        </div>
      </div>
    </>
  );
}

/** Strip — banner as a top band, ink body below, avatar straddling the seam. */
function StripLayout({
  profile,
  avatarSrc,
  bannerSrc,
}: {
  profile: XProfile;
  avatarSrc: string;
  bannerSrc: string | null;
}) {
  return (
    <>
      <div className="absolute inset-0 bg-ink" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 h-[30%] overflow-hidden"
        aria-hidden
      >
        {bannerSrc ? (
          <Media src={bannerSrc} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-accent/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink" />
      </div>
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />
      <div className="relative z-10 flex h-full flex-col justify-end gap-4 p-4 sm:gap-5 sm:p-6">
        <div className="flex items-end gap-3 sm:gap-4">
          <Media
            src={avatarSrc}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-ink sm:h-[68px] sm:w-[68px]"
          />
          <Identity profile={profile} size="compact" onDark />
        </div>
        <div>
          <Rule onDark />
          <StatsRow profile={profile} compact onDark />
        </div>
      </div>
    </>
  );
}

type XshareCardProps = {
  profile: XProfile;
  style: CardStyleId;
};

export const XshareCard = forwardRef<HTMLDivElement, XshareCardProps>(
  function XshareCard({ profile, style }, ref) {
    const avatarSrc = proxiedMedia(profile.avatarUrl) ?? "";
    const bannerSrc = proxiedMedia(profile.bannerUrl);

    let body: ReactNode;
    switch (style) {
      case "minimal":
        body = <MinimalLayout profile={profile} avatarSrc={avatarSrc} />;
        break;
      case "wash":
        body = (
          <WashLayout
            profile={profile}
            avatarSrc={avatarSrc}
            bannerSrc={bannerSrc}
          />
        );
        break;
      case "strip":
        body = (
          <StripLayout
            profile={profile}
            avatarSrc={avatarSrc}
            bannerSrc={bannerSrc}
          />
        );
        break;
      case "studio":
      default:
        body = <StudioLayout profile={profile} avatarSrc={avatarSrc} />;
    }

    return (
      <div
        ref={ref}
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: "16 / 9" }}
      >
        {body}
      </div>
    );
  }
);
