"use client";

// Client-side sign-in form. Server-side auth check lives in the
// adjacent page.tsx so an already-authenticated visitor never even
// sees this render — they get redirected before this code runs.

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_COPY: Record<string, string> = {
  oauth_failed:
    "Couldn't finish signing in with Google. Please try again.",
  oauth_config:
    "Google sign-in isn't configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.",
  bad_state:
    "The sign-in link expired or didn't match. Try again from this page.",
  email_not_verified:
    "Your Google account's email isn't verified. Verify it with Google, then try again.",
  access_denied:
    "You cancelled the sign-in. No worries — click the button whenever you're ready.",
};

function SignInInner() {
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const n = searchParams.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) return n;
    return "/editor";
  }, [searchParams]);

  const error = searchParams.get("error");
  const errorMessage = error
    ? ERROR_COPY[error] ?? "Something went wrong. Try again in a moment."
    : null;

  const googleHref = `/api/auth/google/start?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="relative min-h-screen">
      <div className="grain-overlay grain-overlay-subtle" />

      <div className="relative z-[2] grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT — SIGN IN */}
        <div className="flex flex-col p-6 lg:p-10">
          <div className="mb-20 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-baseline gap-[2px] font-serif text-[22px] font-medium tracking-tight text-ink"
            >
              postabl
              <span className="inline-block h-[7px] w-[7px] rounded-full bg-accent" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[13px] text-ink-faint transition-colors hover:text-ink"
            >
              ← Back home
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-[400px] flex-grow flex-col justify-center">
            <div className="mb-4 font-mono text-xs uppercase tracking-wider text-ink-faint">
              / Welcome
            </div>
            <h1 className="mb-3 font-serif text-[40px] font-normal leading-none tracking-[-2px] lg:text-[52px]">
              Sign in to <em className="text-accent">post better.</em>
            </h1>
            <p className="mb-10 text-[15px] text-ink-soft">
              One click with Google. No passwords to remember, no emails to
              verify — you&apos;re in.
            </p>

            {errorMessage && (
              <div className="mb-6 rounded-[10px] border border-[#E8B4B4] bg-[#FDF2F2] px-4 py-3 text-[13px] text-[#8A2F2F]">
                {errorMessage}
              </div>
            )}

            <a
              href={googleHref}
              className="flex items-center justify-center gap-3 rounded-[10px] border border-line bg-white px-4 py-4 text-[15px] font-medium text-ink transition-all hover:-translate-y-[1px] hover:border-ink"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </a>

            <p className="mt-6 text-center text-xs leading-[1.5] text-ink-faint">
              By continuing, you agree to our{" "}
              <a href="#" className="text-ink-soft">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="text-ink-soft">
                Privacy Policy
              </a>
              .
            </p>
          </div>

          <div className="mt-10 font-mono text-[11px] tracking-wider text-ink-faint">
            /// SECURED BY TLS ///
          </div>
        </div>

        {/* RIGHT — QUOTE */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#1a1a1a] p-10 text-bg lg:flex">
          <div className="signin-glow pointer-events-none absolute inset-0" />
          <div className="relative z-[2] flex h-full flex-col">
            <div className="font-mono text-[11px] uppercase tracking-wider text-white/50">
              / Issue 01 — From the feed
            </div>

            <div className="flex max-w-[520px] flex-grow flex-col justify-center">
              <div className="mb-5 font-serif text-[120px] italic leading-[0.5] text-accent">
                &ldquo;
              </div>
              <p className="mb-6 font-serif text-[38px] font-normal leading-[1.15] tracking-[-1px]">
                I was spending <em className="text-accent">ten minutes</em> in
                Figma just to pad a screenshot. Now it takes{" "}
                <em className="text-accent">ten seconds.</em> Why didn&apos;t
                this exist sooner?
              </p>
              <p className="font-mono text-[13px] tracking-wide text-white/60">
                <strong className="font-medium text-white/90">
                  — A reply from our DMs
                </strong>
                <br />
                Indie dev, 14K followers
              </p>
            </div>

            <div className="flex gap-10 border-t border-white/10 pt-10">
              <div>
                <div className="font-serif text-[38px] font-normal leading-none tracking-[-1px]">
                  42s
                </div>
                <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50">
                  Avg. time to post
                </div>
              </div>
              <div>
                <div className="font-serif text-[38px] font-normal leading-none tracking-[-1px]">
                  2×
                </div>
                <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50">
                  Engagement lift
                </div>
              </div>
              <div>
                <div className="font-serif text-[38px] font-normal leading-none tracking-[-1px]">
                  $9.99
                </div>
                <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50">
                  Launch price
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInForm() {
  // Suspense boundary required because useSearchParams opts the route
  // into dynamic rendering during `next build`.
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <SignInInner />
    </Suspense>
  );
}
