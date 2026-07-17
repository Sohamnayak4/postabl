"use client";

// Client landing page UI. The server-component wrapper in page.tsx
// short-circuits this render for already-authenticated visitors and
// sends them to /editor — they never see this file.

import { useEffect, useState } from "react";
import Link from "next/link";
import { findBackground } from "@/lib/backgrounds";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      <div className="grain-overlay" />

      {/* NAV */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 backdrop-blur-md bg-[rgba(247,245,240,0.75)] border-b transition-colors md:px-10 md:py-5 ${
          scrolled ? "border-line" : "border-transparent"
        }`}
      >
        <Link
          href="/"
          className="flex items-baseline gap-[2px] font-serif text-[20px] font-medium tracking-tight text-ink md:text-[22px]"
        >
          postabl
          <span className="inline-block h-[7px] w-[7px] rounded-full bg-accent" />
        </Link>
        <div className="flex items-center gap-3 text-sm md:gap-8">
          <a
            href="#features"
            className="hidden text-ink-soft transition-colors hover:text-ink md:inline"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="hidden text-ink-soft transition-colors hover:text-ink md:inline"
          >
            Pricing
          </a>
          <Link
            href="/signin"
            className="hidden text-ink-soft transition-colors hover:text-ink md:inline"
          >
            Sign in
          </Link>
          <Link
            href="/editor"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-bg transition-all hover:-translate-y-[1px] hover:bg-black md:min-h-0 md:px-[18px] md:py-[9px] md:text-sm"
          >
            Start free →
          </Link>
        </div>
      </nav>

      <main>
      {/* HERO */}
      <section className="relative z-[2] mx-auto max-w-[1200px] px-5 pt-[100px] pb-12 md:px-10 md:pt-[140px] md:pb-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-bg-alt px-[12px] py-[5px] text-[10px] uppercase tracking-wider text-ink-faint md:mb-8 md:px-[14px] md:py-[6px] md:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
          Launch special — 33% off lifetime
        </div>
        <h1 className="hero-title mb-6 font-serif font-normal leading-[0.95] text-[clamp(44px,12vw,112px)] tracking-[-1.5px] md:mb-8 md:tracking-[-3px]">
          Make your
          <br />
          screenshots{" "}
          <em className="text-accent not-italic">postabl.</em>
        </h1>
        <p className="mb-8 max-w-[540px] text-[16px] leading-[1.5] text-ink-soft md:mb-10 md:text-[19px]">
          The fastest way to turn raw screenshots into scroll-stopping images
          for X, LinkedIn, and the rest of the internet. Free to start.
        </p>
        <div className="mb-10 flex flex-wrap items-center gap-3 md:mb-[60px]">
          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-6 py-3 text-sm font-medium text-bg transition-all hover:-translate-y-[1px] hover:bg-black md:px-7 md:py-[14px] md:text-[15px]"
          >
            Get started →
          </Link>
          {/* Secondary CTA — hidden on mobile to keep a single, clear
              primary action above the fold. Desktop users still see
              the anchor link to #features. */}
          <a
            href="#features"
            className="hidden items-center gap-1.5 rounded-full bg-transparent px-6 py-3 text-sm font-medium text-ink transition-transform md:inline-flex md:px-7 md:py-[14px] md:text-[15px]"
          >
            See how it works
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[12px] text-ink-faint md:text-[13px]">
          <span className="flex items-center gap-1.5">
            ● 2 free downloads per day
          </span>
          <span className="flex items-center gap-1.5">● No credit card</span>
          <span className="flex items-center gap-1.5">
            ● Works in your browser
          </span>
        </div>
      </section>

      {/* DEMO — side-by-side before/after */}
      <section className="relative z-[2] mx-auto mt-6 max-w-[1200px] px-5 md:mt-10 md:px-10">
        {(() => {
          // Shared "screenshot content" — the user's raw capture (a
          // dashboard-style mockup). Identical on both sides so the only
          // difference the viewer registers is the framing.
          // Decorative product mockup — hidden from assistive tech so the
          // screen reader isn't read a wall of fake metrics; the framing
          // captions outside this block stay announced.
          const screenshotContent = (
            <div className="p-5" aria-hidden>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                MRR · This month
              </div>
              <div className="mb-3 font-serif text-[28px] font-medium leading-none tracking-tight text-ink">
                $12,480
              </div>
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-sm bg-[#d4f4dd] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[#1f7a3e]">
                  ↑ 23%
                </span>
                <span className="font-mono text-[10px] text-ink-faint">
                  vs last month
                </span>
              </div>
              <div className="flex h-12 items-end gap-1">
                {[30, 48, 42, 58, 52, 68, 72, 85].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-[2px] ${
                      i === 7 ? "bg-accent" : "bg-ink/15"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          );

          return (
            <div className="relative">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                {/* BEFORE */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-bg-alt">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5 md:px-5 md:py-3">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      <span className="text-ink">01 —</span> Before
                    </div>
                    <div className="font-mono text-[10px] tracking-wide text-ink-faint">
                      raw-capture.png
                    </div>
                  </div>
                  {/* Raw screenshot fills the panel edge-to-edge. No
                      padding, no border, no shadow — it IS the capture. */}
                  <div className="flex min-h-[240px] flex-grow flex-col justify-center bg-white md:min-h-[320px]">
                    {screenshotContent}
                  </div>
                  <div className="border-t border-line bg-bg px-4 py-2.5 font-mono text-[10px] tracking-wide text-ink-faint md:px-5 md:py-3">
                    Flat. Cramped.{" "}
                    <span className="text-ink-soft">Scroll-past material.</span>
                  </div>
                </div>

                {/* AFTER */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-bg-alt">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5 md:px-5 md:py-3">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      <span className="text-accent">02 —</span> After
                    </div>
                    <div className="font-mono text-[10px] tracking-wide text-ink-faint">
                      postabl-export.png
                    </div>
                  </div>
                  <div
                    className="flex min-h-[240px] flex-grow items-center justify-center p-6 md:min-h-[320px] md:p-10"
                    style={findBackground("peach").style}
                  >
                    {/* Same screenshot, now framed properly */}
                    <div className="w-full max-w-[360px] overflow-hidden rounded-[10px] bg-white shadow-demo-screenshot">
                      <div className="flex items-center gap-1.5 border-b border-[#eaeaea] bg-[#f5f5f5] px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                        <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                        <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                      </div>
                      {screenshotContent}
                    </div>
                  </div>
                  <div className="border-t border-line bg-bg px-4 py-2.5 font-mono text-[10px] tracking-wide text-ink-faint md:px-5 md:py-3">
                    Framed. Breathing.{" "}
                    <span className="text-accent">Actually postabl.</span>
                  </div>
                </div>
              </div>

              {/* Arrow badge centered between the two cards on desktop */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bg font-serif text-xl text-ink shadow-tools">
                  →
                </div>
              </div>
            </div>
          );
        })()}

        <p className="mt-5 text-center font-mono text-[11px] tracking-wide text-ink-faint md:mt-6">
          Same pixels. Different posture.
        </p>
      </section>

      {/* MARQUEE */}
      <div className="relative z-[2] mt-16 overflow-hidden border-y border-line bg-bg-alt py-4 md:mt-[120px] md:py-5">
        <div className="flex animate-marquee gap-[60px] whitespace-nowrap text-[13px] text-ink-faint">
          {Array.from({ length: 2 }).map((_, dupe) => (
            <div key={dupe} className="flex items-center gap-[60px]">
              <span className="flex items-center gap-3">
                Built for <em className="not-italic text-accent">X posters</em>
              </span>
              <span className="flex items-center gap-3">●</span>
              <span className="flex items-center gap-3">
                Indie hackers{" "}
                <em className="not-italic text-accent">love it</em>
              </span>
              <span className="flex items-center gap-3">●</span>
              <span className="flex items-center gap-3">
                Ship <em className="not-italic text-accent">prettier</em> shots
              </span>
              <span className="flex items-center gap-3">●</span>
              <span className="flex items-center gap-3">
                No watermark, <em className="not-italic text-accent">ever</em>
              </span>
              <span className="flex items-center gap-3">●</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section
        id="features"
        className="relative z-[2] mx-auto max-w-[1200px] px-5 py-16 md:px-10 md:py-[120px]"
      >
        <div className="mb-12 grid grid-cols-1 items-end gap-6 md:mb-20 md:grid-cols-[1fr_2fr] md:gap-10">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-faint">
            /01 — Features
          </div>
          <h2 className="font-serif text-[36px] font-normal leading-[1.05] tracking-[-1px] md:text-[56px] md:tracking-[-1.5px]">
            Small tool. <em className="text-accent">Big difference.</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded border border-line bg-line md:grid-cols-3">
          {[
            [
              "01",
              "Backgrounds that breathe",
              "Hand-picked backgrounds that don't look like every other screenshot tool. Solid, textured, dithered, or bring your own.",
            ],
            [
              "02",
              "Padding, done right",
              "Smart padding that scales with your image. Frames that feel balanced without fiddling with pixel values.",
            ],
            [
              "03",
              "Shadows with taste",
              "Drop shadows, inset glows, soft lifts. Presets that actually look good, not the default Figma dropshadow.",
            ],
            [
              "04",
              "Window chrome",
              "macOS, iOS, Windows, or minimal. Light and dark. Add a browser bar, a phone frame, or nothing at all.",
            ],
            [
              "05",
              "Export that ships",
              "PNG, JPG, WebP. Export at 1×, 2×, or 4× for retina-sharp posts. Copy to clipboard in one click.",
            ],
            [
              "06",
              "Zero fluff",
              'Paste, tweak, download. No accounts required, no forced onboarding, no "upgrade now" every two minutes.',
            ],
          ].map(([num, title, desc]) => (
            <div
              key={num}
              className="bg-bg p-6 transition-colors hover:bg-bg-alt md:p-10"
            >
              <div className="mb-10 font-mono text-[11px] tracking-wider text-ink-faint md:mb-20">
                {num}
              </div>
              <h3 className="mb-2.5 font-serif text-[22px] font-medium leading-[1.1] tracking-tight md:text-[26px]">
                {title}
              </h3>
              <p className="text-sm leading-[1.55] text-ink-soft">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="relative z-[2] mx-auto max-w-[1200px] px-5 py-16 md:px-10 md:py-[120px]"
      >
        <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-[1fr_2fr] md:gap-10">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-faint">
            /02 — Pricing
          </div>
          <h2 className="font-serif text-[36px] font-normal leading-[1.05] tracking-[-1px] md:text-[56px] md:tracking-[-1.5px]">
            One price. <em className="text-accent">Then you own it.</em>
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:mt-[60px] md:grid-cols-2">
          {/* FREE */}
          <div className="flex flex-col rounded-xl border border-line bg-bg p-6 md:p-10">
            <div className="mb-6 font-mono text-xs uppercase tracking-wider">
              Free
            </div>
            <div className="mb-1 flex items-baseline gap-1.5 font-serif text-[56px] font-normal leading-none tracking-[-2px] md:text-[72px]">
              <span className="text-[24px] opacity-70 md:text-[28px]">$</span>0
            </div>
            <div className="mb-6 text-[13px] text-ink-faint md:mb-8">
              Forever. No card needed.
            </div>
            <ul className="mb-6 flex-grow list-none md:mb-8">
              {[
                "2 downloads per day",
                "Medium quality exports",
                "All backgrounds & presets",
                "No watermark",
              ].map((item) => (
                <li
                  key={item}
                  className="check-bullet flex items-center gap-2.5 border-b border-black/5 py-2.5 text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/editor"
              className="flex w-full items-center justify-center rounded-full border border-line bg-transparent px-4 py-3.5 text-sm font-medium text-ink"
            >
              Start free
            </Link>
          </div>
          {/* PRO */}
          <div className="relative flex flex-col rounded-xl border border-ink bg-ink p-6 text-bg md:p-10">
            <div className="absolute -top-3 right-5 rounded-full bg-accent px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white md:right-6">
              Launch price
            </div>
            <div className="mb-6 font-mono text-xs uppercase tracking-wider">
              Pro — Yearly
            </div>
            <div className="mb-1 flex items-baseline gap-1.5 font-serif text-[56px] font-normal leading-none tracking-[-2px] md:text-[72px]">
              <span className="text-[24px] opacity-70 md:text-[28px]">$</span>
              9.99
              <span className="font-sans text-sm opacity-60 md:text-base">
                /year
              </span>
            </div>
            <div className="mb-6 text-[13px] text-white/75 md:mb-8">
              <span className="mr-2 line-through">$14.99</span>
              Billed annually. Cancel anytime.
            </div>
            <ul className="mb-6 flex-grow list-none md:mb-8">
              {[
                "Unlimited downloads",
                "Maximum quality (4× retina)",
                "All backgrounds & presets",
                "Brand kit: your handle & defaults on every export",
                "Priority export speeds",
                "Early access to new features",
              ].map((item) => (
                <li
                  key={item}
                  className="check-bullet flex items-center gap-2.5 border-b border-white/10 py-2.5 text-sm text-white/75"
                >
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signin"
              className="flex w-full items-center justify-center rounded-full bg-bg px-4 py-3.5 text-sm font-medium text-ink transition-transform hover:-translate-y-[1px]"
            >
              Go Pro →
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-[12px] text-ink-faint md:mt-8 md:text-[13px]">
          In India? Pay ₹749/year (normally ₹999). AI-generated backgrounds
          coming as a separate monthly plan.
        </p>
      </section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-[2] mt-16 border-t border-line px-5 pb-8 pt-12 md:mt-20 md:px-10 md:pb-10 md:pt-20">
        <div className="mx-auto mb-10 flex max-w-[1200px] flex-col items-start justify-between gap-8 md:mb-[60px] md:flex-row md:items-end md:gap-10">
          <div>
            <div className="flex items-baseline gap-[2px] font-serif text-[22px] font-medium tracking-tight">
              postabl
              <span className="inline-block h-[7px] w-[7px] rounded-full bg-accent" />
            </div>
            <p className="mt-4 max-w-[400px] font-serif text-[24px] font-normal leading-[1.2] tracking-tight md:text-[32px]">
              Stop posting <em className="text-accent">ugly</em> screenshots.
              You&apos;re better than that.
            </p>
          </div>
          <a
            href="https://x.com/soham_nayak04"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-bg-alt px-4 py-2.5 text-sm font-medium text-ink transition-all hover:-translate-y-[1px] hover:border-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-[14px] w-[14px]"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @soham_nayak04
          </a>
        </div>
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-2.5 border-t border-line pt-6 font-mono text-xs text-ink-faint md:flex-row">
          <span>© 2026 Postabl</span>
          <span>Made for posters, everywhere.</span>
        </div>
      </footer>

    </div>
  );
}
