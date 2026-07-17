---
name: Postabl
description: Turn raw screenshots into scroll-stopping, postable images.
colors:
  paper: "#f7f5f0"
  paper-deep: "#efece5"
  panel: "#ffffff"
  ink: "#1a1a1a"
  ink-soft: "#555555"
  ink-faint: "#6f6b65"
  line: "#d9d4c7"
  line-strong: "#d0cabb"
  terracotta: "#d94f2e"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(44px, 12vw, 112px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.03em"
    fontVariation: "'opsz' 144"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(36px, 5vw, 56px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
  lead:
    fontFamily: "Geist, -apple-system, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  title-compact:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  control:
    fontFamily: "Geist, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  meta:
    fontFamily: "Geist, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  micro:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
  chip:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "9px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
  watermark:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "8px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "#000000"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "#00000000"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-on-dark:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "14px 16px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "40px"
  eyebrow-pill:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink-faint}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
---

# Design System: Postabl

## 1. Overview

**Creative North Star: "The Risograph Studio"**

Postabl is a risograph print shop for screenshots. One paper, one ink, honest texture — the whole system runs on the discipline of a two-color press. The surface is warm off-white stock (`#f7f5f0`) laid over a fine film grain, headlines are set in a fluid Fraunces serif like a magazine masthead, and a single terracotta ink (`#d94f2e`) does every job that needs attention. The charm is the constraint: the tool looks crafted and a little handmade precisely because it refuses the full-color, gradient-soaked palette of every other screenshot app.

The register is a product tool, and the interface behaves like one — quiet chrome, hairline rules, no ornament competing with the work. All the drama is reserved for one place: the framed screenshot itself, which floats on a deep, soft shadow like a print pinned to a wall. That contrast is the entire idea. The UI is flat and matter-of-fact so the crafted export reads as the hero.

This system explicitly rejects the generic SaaS-gradient look — no purple/blue gradients, no glassmorphism, no hero-metric templates, no identical icon-card grids. It equally rejects the bloated-enterprise feel: no heavy chrome, no dense settings panels, no "upgrade now" nags. Voice is witty, confident, editorial: "Same pixels. Different posture."

**Key Characteristics:**
- Warm paper + film grain as the substrate, never a flat white or a cream-tinted SaaS bg
- One terracotta ink, used sparingly — attention is a scarce resource
- Fraunces serif display against Geist sans body and JetBrains Mono labels: a real contrast pairing
- Flat, hairline-ruled chrome; dramatic soft shadow reserved for the framed export
- Confident and unfussy: pill buttons that lift a hair on hover, nothing more

## 2. Colors

A two-ink risograph palette: warm paper, near-black, and one terracotta. Everything else is a hairline or a tint of those three.

### Primary
- **Terracotta** (`#d94f2e`): The single attention ink. It marks the one action that matters (primary CTA emphasis, the "After" state, active preset dots, the logo period), accents in prose (`<em>` inside serif headlines), and nothing else. Its rarity is the point.

### Neutral
- **Warm Paper** (`#f7f5f0`): The body substrate. Every screen sits on this warm off-white; it is the studio's paper stock, carried under a film-grain overlay.
- **Paper Deep** (`#efece5`): The recessed neutral — eyebrow pills, hovered feature cells, marquee band, inset panels. One step down from paper to signal a change of plane without a border.
- **Panel White** (`#ffffff`): True white, used only inside the screenshot window and canvas surfaces where the user's own content lives. UI chrome never uses pure white.
- **Ink** (`#1a1a1a`): Primary text and the dark button/pricing surfaces. Near-black, never `#000` except on button-hover.
- **Ink Soft** (`#555555`): Secondary body copy, lead paragraphs, nav links at rest.
- **Ink Faint** (`#6f6b65`): Muted meta text, mono labels, filenames, footnotes. Deliberately tuned to ~5.4:1 on paper so it passes WCAG AA — never lighter.
- **Line** (`#d9d4c7`): The default hairline — borders, dividers, the grid mortar between feature cells.
- **Line Strong** (`#d0cabb`): Slightly heavier rule for slider tracks and emphasis borders.

### Named Rules
**The One Ink Rule.** Terracotta is the only chromatic color in the system. If a screen needs a second accent hue, the design is wrong — reach for weight, size, or an ink tint instead. On any given screen terracotta covers well under 10% of the surface.

**The Pure-White Ban.** UI chrome never uses `#ffffff`. White belongs to the user's content (the screenshot window, the canvas). Chrome lives on warm paper so the export reads as a separate, brighter plane.

## 3. Typography

**Display Font:** Fraunces (with Georgia, serif fallback)
**Body Font:** Geist (with -apple-system, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (monospace)

**Character:** A real three-axis pairing, not two lookalike sans fonts. Fraunces is a soft, optical serif that carries all the editorial voice and warmth (opsz cranked to 144 on the hero for true display cut); Geist is a clean, neutral sans that gets out of the way for reading; JetBrains Mono handles the small structural furniture — labels, filenames, section markers — with a technical, receipt-like precision.

### Hierarchy
- **Display** (Fraunces 400, `clamp(44px, 12vw, 112px)`, line-height 0.95, tracking -0.03em): Hero headline only. Fluid, tight, set with `opsz` 144 and `text-wrap: balance`. Terracotta `<em>` for the emphasized word.
- **Headline** (Fraunces 400, `clamp(36px, 5vw, 56px)`, line-height 1.05, tracking -0.02em): Section titles ("Small tool. Big difference.").
- **Title** (Fraunces 500, 26px, line-height 1.1, tracking -0.01em): Feature and card headings.
- **Body** (Geist 400, 15px, line-height 1.55): Default reading size; lead paragraphs step up to 19px and `#555`. Cap prose at 65–75ch.
- **Label** (JetBrains Mono 500, 11px, tracking 0.08em, uppercase): Meta text, filenames, and structural markers.

### UI Chrome Scale

The product surfaces (editor, saved, brand kit) run a tighter set of deliberate steps around Body. These are the house chrome sizes, not drift:

- **Lead** (Geist 400, 19px): Lead paragraphs and page intros; 16px on compact viewports.
- **Title Compact** (Fraunces 500, 22px): The compact-viewport step of Title, used for feature cards and section heads on mobile.
- **Wordmark** (Fraunces 500, 17px): The app-header logo; steps to 19px on desktop and 20 to 22px on marketing surfaces.
- **Control** (Geist 500, 13px): Buttons, menu items, inputs, and control labels. The workhorse chrome size.
- **Meta** (Geist 400, 12px): Secondary meta text and footnotes.
- **Micro** (JetBrains Mono 500, 10px, tracked, usually uppercase): Eyebrow pills and tiny structural labels, one step under Label.
- **Chip** (JetBrains Mono 500, 9px): The smallest live UI text: Pro chips, the downloads counter.
- **Watermark** (JetBrains Mono 500, 8px): The brand kit badge watermark rendered inside exports. Export content, not chrome.

Two families of literal sizes sit intentionally outside this scale:

- **Responsive serif steps.** The fluid Display and Headline ramps above are implemented in markup as fixed breakpoint pairs (for example 36px to 56px section titles, 56px to 72px price figures, 34px to 52px page heads). A tool reading px literals one at a time will see these as individual off-ramp sizes; they are the documented fluid ramps rendered at their endpoints.
- **Fixture and preview content.** The landing page's mock dashboard figures (28px, 32px, 38px) and the brand kit preview's scaled-down badge (6px) are demo content drawn inside mock canvases and previews, not UI type.

### Named Rules
**The Serif-Speaks Rule.** All voice and personality live in Fraunces. Headlines carry the wit; the sans body never tries to be clever. Emphasis in a headline is a terracotta `<em>`, never bold, never a color swap on the sans.

**The Mono-Is-Furniture Rule.** JetBrains Mono is for structural labels only — filenames, meta, timestamps, tiny section markers. It is uppercase and tracked. Never set body copy or a heading in mono.

## 4. Elevation

The system is flat by default. Chrome — buttons, cards, nav, panels — is defined by warm-paper planes and hairline `#d9d4c7` rules, not by shadow. Depth is spent deliberately, in exactly one place.

### Shadow Vocabulary
- **Framed Export** (`box-shadow: 0 50px 100px -20px rgba(0,0,0,0.35), 0 30px 60px -30px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)`): The deep, soft, offset shadow under the screenshot canvas. This is the signature — it makes the framed capture read as a physical print.
- **Demo Export** (`box-shadow: 0 40px 80px -20px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)`): The lighter cousin, for the "After" preview on the landing page.
- **Canvas Rest** (`box-shadow: 0 20px 60px -20px rgba(0,0,0,0.15)`): A softer lift for a canvas at rest before framing.
- **Tools Float** (`box-shadow: 0 4px 16px rgba(0,0,0,0.04)`): The one whisper-shadow allowed on chrome — floating tool clusters and the arrow badge. Barely there.

The editor also exposes shadow *presets* (None / Soft / Deep / Lift) as an export control — those are user-facing output styling, distinct from this system's chrome elevation.

### Named Rules
**The Reserved-Shadow Rule.** Chrome never casts a shadow. The deep soft shadow is reserved for the framed screenshot — it signals "this is the crafted output." A shadow anywhere else steals the one gesture that means "this is the work."

## 5. Components

### Buttons
- **Shape:** Full pill (`border-radius: 9999px`). Every button is a pill; there are no square buttons.
- **Primary:** Ink fill (`#1a1a1a`) with paper text (`#f7f5f0`), padding `12px 24px`. The confident default action.
- **Hover / Focus:** Lift `translateY(-1px)` and deepen to `#000`. That subtle rise is the entire interaction vocabulary — confident and unfussy. Keyboard focus shows a 2px ink `:focus-visible` ring at 2px offset.
- **Ghost / Secondary:** Transparent fill with a `#d9d4c7` hairline border and ink text — same pill, same padding.
- **On-Dark:** Inside ink surfaces (the Pro pricing card), the button inverts to a paper fill with ink text.

### Cards / Containers
- **Corner Style:** `12px` (`rounded-xl`) for pricing and content cards; `16px` for large demo/preview panels.
- **Background:** Warm paper (`#f7f5f0`); the recessed variant uses paper-deep (`#efece5`). The dark Pro card inverts to an ink fill with paper text.
- **Shadow Strategy:** None. Cards are defined by their hairline border, per the Reserved-Shadow Rule.
- **Border:** `1px solid #d9d4c7`.
- **Internal Padding:** `24px` mobile, `40px` desktop.

### Feature Grid (signature)
- A grid whose gaps are `1px` over a `#d9d4c7` background, so the mortar between cells reads as hairline rules. Cells are paper and shift to paper-deep on hover. This is the house alternative to drop-shadowed card grids — dividers, not boxes.

### Chips / Eyebrow Pills
- **Style:** Paper-deep fill, `#d9d4c7` hairline border, ink-faint mono label text, full pill. Often carries a small terracotta pulse dot ("Launch special", live status).

### Inputs / Fields
- **Sliders:** Custom `4px` `#d0cabb` track with a `16px` ink thumb ringed in paper — the primary editor control.
- **Focus:** Global `:focus-visible` ring (2px ink, 2px offset). Inputs carry their own focus styling and are exempt from the global ring to avoid a double outline.

### Navigation
- **Style:** Fixed top bar on a translucent paper backdrop (`rgba(247,245,240,0.75)`) with `backdrop-blur`. Its bottom hairline is transparent at the top of the page and fades in to `#d9d4c7` on scroll.
- **Typography:** Geist links in ink-soft, brightening to ink on hover. The wordmark is Fraunces with a terracotta period-dot.

### The Framed Screenshot (signature)
The core object: the user's capture on white panel, optional window chrome (macOS/iOS/Windows/minimal, light/dark), sitting inside a chosen background with padding and the deep Framed-Export shadow. Everything else in the UI exists to serve this one framed result.

## 6. Do's and Don'ts

### Do:
- **Do** keep terracotta (`#d94f2e`) under ~10% of any screen — one ink, spent on the one thing that matters.
- **Do** define chrome with warm-paper planes and `#d9d4c7` hairlines; reserve the deep soft shadow for the framed screenshot only.
- **Do** carry all voice in Fraunces headlines, with emphasis as a terracotta `<em>`.
- **Do** set labels, filenames, and section markers in uppercase tracked JetBrains Mono.
- **Do** keep hover to a `1px` lift; keep the film grain overlay under everything.
- **Do** hold body contrast to WCAG AA — ink-faint stays at `#6f6b65` (~5.4:1), never lighter for "elegance."

### Don't:
- **Don't** reach for the generic SaaS-gradient look — no purple/blue gradients, no glassmorphism, no hero-metric templates, no identical icon-card grids.
- **Don't** let the interface feel bloated or enterprise — no heavy chrome, dense settings walls, forced onboarding, or "upgrade now" nags.
- **Don't** introduce a second accent hue. If a screen seems to need one, use weight, size, or an ink tint instead (The One Ink Rule).
- **Don't** use pure `#ffffff` for UI chrome — white belongs to the user's content (The Pure-White Ban).
- **Don't** put a drop shadow on a card, button, or panel — that gesture is reserved (The Reserved-Shadow Rule).
- **Don't** pair Fraunces with a second serif or set body/headings in the mono; the three fonts each have one job (The Mono-Is-Furniture Rule).
- **Don't** use `border-left`/`border-right` greater than 1px as a colored accent stripe on cards, callouts, or list items.
