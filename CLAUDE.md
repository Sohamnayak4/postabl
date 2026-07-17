# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design Context

Strategic design context lives in `PRODUCT.md` (and visual system in `DESIGN.md`); read them before UI work. In short: **product** register (the `/editor` tool is the primary surface; the landing is a funnel), built for **indie hackers and X posters**, positioned as **the fastest way to turn a raw screenshot into a scroll-stopping image**. Voice is witty, confident, editorial. Guiding principles: zero fluff, taste is the product, speed is a feature, anonymous-first, show the difference. Accessibility target is WCAG 2.1 AA.

## What this is

Postabl is a screenshot beautifier: users upload a raw screenshot and the `/editor` wraps it in a padded, shadowed, ratio-controlled canvas with gradient/pattern backgrounds, then exports it as PNG/JPG/WEBP. Built on Next.js 15 (App Router, React 19), TypeScript, Tailwind, deployed on Vercel with a Neon (serverless Postgres) database. Auth is Google OAuth only; Pro is a Lemon Squeezy subscription.

## Commands

```bash
npm run dev          # next dev (localhost:3000)
npm run build        # next build
npm run lint         # next lint
npm run db:migrate   # apply lib/schema.sql to DATABASE_URL (idempotent)
```

There is no test suite. Verify changes by running `npm run dev` and exercising the flow in the browser. `npm run build` is the closest thing to a full typecheck gate (tsconfig is `strict`, `noEmit`).

After changing `lib/schema.sql`, run `npm run db:migrate` — the migration script strips full-line SQL comments, then splits on `;` and runs each statement via the Neon HTTP driver (which rejects multi-statement strings). All statements must stay idempotent (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).

## Environment

`.env.local` (loaded by Next and by `scripts/migrate.mjs` via dotenv) must define: `DATABASE_URL`, `JWT_SECRET` (≥16 chars), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `GOOGLE_REDIRECT_URI` (defaults to localhost callback), Lemon Squeezy keys (`LEMONSQUEEZY_WEBHOOK_SECRET`, `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL`, etc.), and `NEXT_PUBLIC_SITE_URL`. Most lib modules throw at import time if their required env var is missing.

## Architecture

### Where state lives — the central mental model

State is deliberately split across three tiers, and knowing which tier owns a piece of data is the key to working here:

1. **Client localStorage / IndexedDB** — everything the editor needs to work *anonymously*. Anonymous users are first-class: `/editor` is not gated (see middleware) and works end-to-end. IndexedDB holds the current screenshot (`lib/screenshot-store.ts`, DB `postabl_screenshot`) and the saved-images library (`lib/saved-images.ts`, DB `postabl`, capped at `MAX_SAVED=20`). localStorage holds the daily free-download counter and a dev-only Pro toggle (`lib/free-downloads.ts`, 2 downloads/day, resets at local midnight).
2. **JWT session cookie** (`postabl_session`, HS256, 30-day) — identity only: `userId`, `email`, `name`. Signed/verified in `lib/auth.ts`. Deliberately does **not** carry Pro status.
3. **Neon Postgres `users` table** — the single source of truth for Pro status and the Brand Kit. Because the cookie is long-lived, `is_pro` is *never* baked into it; `/api/auth/me` reads it fresh from the DB on every call.

### Per-user local-data hygiene (`lib/local-data.ts`)

localStorage/IndexedDB are origin-scoped, not user-scoped, so account switches on a shared device would leak one user's saved images/screenshot to the next. `clearAllLocalData()` wipes both IDB databases + the known localStorage keys. It's called on explicit signout **and** whenever `/api/auth/me` returns a `user.id` different from `postabl:last-user-id`. When you add a new localStorage key or IDB database, register it in this module's clear lists or it will leak across users.

### Auth flow (Google OAuth + PKCE)

`app/api/auth/google/start` mints `state` + PKCE verifier/challenge (`lib/oauth-google.ts`), stores them in short-lived cookies (with an open-redirect-safe `next`), and redirects to Google. `.../callback` verifies `state`, exchanges the code, upserts the user by `(provider, provider_sub)` falling back to `email` (so pre-OAuth email accounts merge), sets the session cookie, and redirects to `next` or `/editor`. A duplicate/failed callback that already has a valid session lands silently on the editor instead of showing an error.

`middleware.ts` gates only `/saved` and `/brand-kit`. `/editor` is intentionally open — the sign-in prompt fires *inside* the editor at the Download/Save/Pro-feature moment, where signup intent peaks.

### Payments (Lemon Squeezy)

`lib/checkout.ts` builds the hosted checkout URL with `checkout[custom][user_id]` so the webhook can match the order back to an account. `app/api/webhooks/lemon-squeezy` verifies the HMAC-SHA256 `X-Signature` against the **raw** request body (re-serializing JSON reorders keys and breaks the signature), resolves the user (prefer `custom_data.user_id`, fall back to `user_email`), and applies a state update from `mapEventToState` (`lib/lemonsqueezy.ts`). Key behaviors encoded in the mapper: a `cancelled` subscription keeps Pro until `subscription_expired` fires; `payment_failed` is ignored (LS retries on its own); invoice events don't carry `renews_at`, so `current_period_end` is written with `COALESCE` to avoid clobbering. The route **always returns 2xx** (even "user not found") so LS doesn't enter a retry storm.

### Brand Kit (Pro feature)

Per-user editor defaults + an auto-applied handle badge, stored in `users.brand_kit` (JSONB) so it follows the user across devices. `lib/brand-kit.ts` defines the shape and `sanitizeBrandKit()`, which coerces any untrusted payload (from the client or the DB) into a valid `BrandKit` — always run input through it. `app/api/brand-kit` lets any signed-in user GET but restricts PUT to Pro users (403 `pro_required` otherwise). The badge is rendered *inside* the exported window so `html-to-image` captures it.

### Export rendering

`app/editor/page.tsx` (~1700 lines, the app's core, a single `"use client"` component) composes the canvas and exports via `html-to-image` (`toPng`/`toJpeg`/`toBlob`). The screenshot is stored as a **data URL, not a Blob**, specifically because `html-to-image`'s `cacheBust` option breaks on blob URLs. Editor presets (padding, shadow, ratio, radius, window style, scale) are defined as `const` tables at the top of the file; their allowed value sets are mirrored in `lib/brand-kit.ts` — **keep the two in sync** when adding a preset.

### Backgrounds (`lib/backgrounds.ts`)

Single canonical source shared by the editor picker and the Brand Kit page. `BACKGROUNDS` (gradients/solids) + `PATTERNS` (Pro-gated). The `dashed`/"Custom" tile is an editor-only placeholder and is filtered out of `BRAND_KIT_BACKGROUNDS`. Use `findBackground(id)` to resolve a stored id back to a style (falls back to the first background).

## Conventions

- Import alias `@/*` maps to the repo root (e.g. `@/lib/auth`).
- Route handlers that touch the DB, crypto, or `node:` modules set `export const runtime = "nodejs"` — they can't run on the edge.
- The Neon client (`lib/db.ts`) is a connection-less tagged-template `sql` helper; use it as `` sql`SELECT ...` `` with interpolation for parameters.
- Design tokens (colors `bg`/`ink`/`accent`, fonts Geist/Fraunces/JetBrains Mono) live in `tailwind.config.js`; fonts are loaded via `<link>` in `app/layout.tsx`.
- User-facing toasts go through `useNotify()` from `components/notify.tsx`.
