---
target: /editor
total_score: 29
p0_count: 0
p1_count: 3
timestamp: 2026-07-12T11-26-58Z
slug: app-editor-page-tsx
---
Method: ⚠️ DEGRADED: single-context (harness policy — sub-agents not spawned without explicit user request; design review run first, then detector, to preserve ordering). Browser inspection not performed (dev server not running); review is source + detector based.

# Critique — /editor (app/editor/page.tsx)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Exporting/Saving states, download counter, upgrade poll toast, paste toast — genuinely excellent |
| 2 | Match System / Real World | 3 | "Export" (top bar) vs "Download" (panel/mobile) for the same action |
| 3 | User Control and Freedom | 3 | Reset, Clear, remove ×; non-destructive edits. No Esc-to-close on menus, no keyboard swatch activation |
| 4 | Consistency and Standards | 2 | Export/Download split, two Upgrade paths, five identical ghost buttons, two "active" visual languages |
| 5 | Error Prevention | 3 | Non-image rejected, 4× graceful downgrade, Save disabled without screenshot; no confirm on Clear |
| 6 | Recognition Rather Than Recall | 3 | Controls visible, extensive tooltips; a few icon-only arrows |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts for Export/Upload; swatches not keyboard-operable. Paste support is a plus |
| 8 | Aesthetic and Minimalist Design | 3 | Clean editorial identity, but top-bar clutter + duplicate actions add noise |
| 9 | Error Recovery | 3 | Plain-language toasts; "Check the console" leaks dev jargon to users |
| 10 | Help and Documentation | 3 | Strong contextual help: tooltips everywhere, editable-URL tip, placeholder hints |
| **Total** | | **29/40** | **Good — solid foundation, address consistency + a11y** |

## Anti-Patterns Verdict

**Does this look AI-generated? No.** This is a real product with a committed identity — warm paper, one terracotta ink, Fraunces/Geist/JetBrains Mono, film grain. It passes the product slop test: a user fluent in Figma/Linear/Raycast would broadly trust it. The "subtly off" spots are redundancy (two Export buttons, five lookalike ghost pills), not strangeness.

**Deterministic scan:** 43 findings — 1 warning + 42 advisories.
- `broken-image` (line 152): **false positive.** It flags the `<img onLoad>` natural-dimension probe, which has a dynamic `src`, not a placeholder.
- `design-system-font-size` ×41: micro-label sizes (8/9/10/11/12/13px, plus 17/19px one-offs) off the DESIGN.md ramp. Mostly legitimate dense-UI labels; the real fix is to **document a micro-label scale in DESIGN.md**, not touch 41 call sites.
- `design-system-color` ×1: a hardcoded off-palette color (window-chrome greys / the `#999` "none" label).

**Visual overlays:** none — browser injection not attempted this run (dev server not running).

## Overall Impression

The editor is genuinely good product work. Anonymous-first is executed with real care (state stashed across the sign-in round-trip), system status is best-in-class, and the identity is unmistakably Postabl rather than another gradient screenshot tool. The single biggest opportunity is the **top bar**: it's carrying too many equal-weight actions, and the one action tied to your success metric — Upgrade to Pro — is camouflaged as a utility ghost button. Tightening the action hierarchy would sharpen both usability and conversion at once.

## What's Working

1. **Anonymous-first, done right.** `/editor` is fully usable with no account; sign-in is requested only at Download/Save/Pro moments, and `persistEditorStash()` preserves all tweaks across the OAuth round-trip. This is exactly the PRODUCT.md principle in code.
2. **System status is excellent (heuristic 4/4).** Exporting/Saving button states, the live downloads-remaining pill, the held-open "finishing up your account…" poll toast after checkout, and the "Screenshot pasted." confirmation — the user is never guessing.
3. **Edge cases are handled thoughtfully.** `isNarrowWindow` drops the URL bar and shrinks the traffic-lights in portrait; the 9:16 placeholder reflows type and stacks buttons; the mobile Download bar respects `env(safe-area-inset-bottom)`; account-switch wipes per-user local data.

## Priority Issues

- **[P1] Top-bar action overload.** For a signed-in free user the header right side stacks Downloads pill · Upload · Clear · Saved · Save · Upgrade to Pro · Export · avatar — 7+ competing controls, five of them identical `border-line` ghost pills. This blows past working-memory limits and flattens hierarchy: the primary action (Export) sits in a row of same-weight neighbors, distinguished only by fill.
  - **Why it matters:** users scan a wall of equal buttons; the primary action doesn't pop; the bar overflows on smaller laptops.
  - **Fix:** keep Export (primary) + avatar in the bar; fold Save / Saved / Upgrade into the avatar menu or lean on the right panel (which already has Download). Reduce to ≤3 visible top-bar actions.
  - **Suggested command:** `/impeccable layout`

- **[P1] Upgrade-to-Pro CTA is camouflaged.** Your success metric is free→Pro conversion, yet "Upgrade to Pro" renders as the same muted `text-ink-soft` ghost pill as Upload/Clear/Saved/Save. The conversion action has the lowest possible visual priority.
  - **Why it matters:** the one revenue action is indistinguishable from utilities; conversion intent is left on the table.
  - **Fix:** give Upgrade a distinct accent treatment (terracotta text or outline), used sparingly per the One Ink Rule; make it the single colored non-primary in the bar.
  - **Suggested command:** `/impeccable colorize`

- **[P1] Background & pattern swatches aren't keyboard-operable.** They're `role="button" tabIndex={0}` divs with `onClick` only — no `onKeyDown`, so a keyboard user can focus a swatch but cannot activate it with Enter/Space. Against your stated WCAG 2.1 AA target this is a real failure (Sam persona), and it repeats for the Pro pattern swatches.
  - **Why it matters:** keyboard-only users can't change the background — a core action of the tool — at all.
  - **Fix:** use real `<button>` elements (they already look right) or add a keydown handler; the focus ring is already global.
  - **Suggested command:** `/impeccable audit`

- **[P2] "Export" vs "Download" naming split.** The same action is "Export ↓" in the top bar but "Download ↓" in the right panel and mobile bar. Pick one verb everywhere.
  - **Why it matters:** users wonder whether Export and Download differ; erodes trust in a tool whose whole job is that one action.
  - **Suggested command:** `/impeccable clarify`

- **[P2] "Learn more" placeholder button is a dead/mislabeled affordance.** In the empty-canvas placeholder, "Learn more" is styled as a real button but has no handler; the parent `div` `onClick` opens the file picker, so clicking "Learn more" actually opens a file dialog.
  - **Why it matters:** Riley/Jordan click a "Learn more" button and get an OS file picker — a broken promise.
  - **Fix:** link it to the landing `#features`, or drop it and let "Upload screenshot" stand alone.
  - **Suggested command:** `/impeccable clarify`

## Persona Red Flags

**Alex (Power User):** No keyboard shortcuts for Export, Upload, or Reset — everything is mouse-only. Swatch grids can't be driven from the keyboard at all. Clipboard paste is the one accelerator and it's good; lean into that direction.

**Sam (Accessibility):** Swatches focusable but not activatable (Enter/Space dead) — a hard blocker for a core action. The `#999` "none" chrome label sits at ~2.8:1 on white (below AA). Menus close on outside-click but there's no Esc handler. Focus ring is well-handled globally.

**Casey / "Indie hacker mid-launch" (project persona):** On a phone, one-handed, mid-thread — the canvas-first mobile order and sticky bottom Download bar serve this perfectly. But the desktop top-bar overflow risk hurts the same user on a 13" laptop, and the two Export/Download labels create a "did it work?" beat they don't have patience for.

## Minor Observations

- Two "active" visual languages: segmented controls (Padding/Shadow/Canvas) use a raised **white** chip; export options use an **ink-filled** chip. Unify. Note the white-chip also drifts from DESIGN.md's Pure-White Ban.
- "Export failed. Check the console for details." surfaces developer language to end users — reword to a user-facing recovery hint.
- 41 font-size advisories are largely a DESIGN.md gap: document a micro-label scale (9/10/11/13px) so the type ramp matches the dense product UI, rather than treating each label as a defect.
- No confirmation on Clear / remove ×; low-risk (source is re-uploadable) but it does wipe the persisted screenshot.

## Questions to Consider

- What if the top bar carried exactly one primary action (Export) and one identity element (avatar), and everything else lived in the panel or the menu?
- What would make Upgrade feel like an invitation rather than a utility — where's the most honest moment to surface it?
- If a keyboard-only user sat down, could they build and export a shot end-to-end today? (Right now: no.)
