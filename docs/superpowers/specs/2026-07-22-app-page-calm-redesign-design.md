# App Page Calm Redesign (Quick Reads first)

**Date:** 2026-07-22
**Status:** Approved pending user review
**Predecessor:** `2026-07-21-homepage-calm-redesign-design.md` (the calm system this extends)

## Goal

Bring the homepage's calm design system to the app sub-pages, starting with
Quick Reads as the reference implementation. The layout is rebuilt; the
copy is not. Every user-visible sentence on the Quick Reads page survives
verbatim.

The result must be a generic template: any of the 8 app pages can adopt it
later by swapping icon, accent color, screenshots, and copy, with no
per-app CSS beyond one custom property.

## Scope

**In:** shared `app.css` + `app.js`, Quick Reads page rebuilt on them,
isolation-guard extension, cache-bust extension.

**Out (explicitly):**
- The other 7 app pages (later passes; they keep `styles.css` + inline
  styles until converted).
- Privacy pages (untouched).
- Any copy, pricing, link, or meta/SEO changes. `<head>` metadata,
  structured data, Plausible, canonical URLs, and view-transition names
  all survive as-is.
- A parallax screenshot band. That is the homepage's signature moment;
  app pages carry its DNA as screenshot drift instead (see Motion).
- The heartbeat. That is the heart mark's joke on the homepage, tied to
  the icon being a heart. App icons pop in and then rest still.

## Architecture

Two new root files, siblings to the homepage pair:

| File | Role | Scope token |
| --- | --- | --- |
| `app.css` | All styling for converted app pages | every rule under `body.calm-app` |
| `app.js` | All behavior for converted app pages | no-ops unless `body.calm-app` exists |

Converted pages load `app.css` **instead of** `styles.css` and drop the
entire inline `<style>` block. `app.css` is self-contained: font import
reference, reset, tokens, and every component. There is no leak-fighting
because nothing else is loaded. (The Phosphor icon font CDN link stays;
it is content for the feature-card glyphs, not styling.)

The Google Fonts `<link>` tags stay in the page head (fonts cannot be
imported from a stylesheet without a render-blocking `@import`).

### Tokens

Copied from the calm system, with accent parameterized:

```css
body.calm-app {
    --color-ground: #f7f7f7;
    --color-card: #ffffff;
    --color-panel: #f0f0f2;      /* hero panel, matches home stage */
    --color-text: #1d1d1f;
    --color-text-secondary: #6e6e73;
    --accent: var(--app-accent, rgb(136, 57, 239));
    --radius-panel: 2.4rem;
    --radius-card: 2rem;
    --radius-image: 1.5rem;
    --radius-pill: 99999px;
    --pad-card: clamp(1.5rem, 4vw, 4rem);
    --gap-section: clamp(2rem, 5vw, 5rem);
}
```

### Per-app theming contract

One line per app, on the body tag:

```html
<body class="calm-app" style="--app-accent: #8b5cf6">
```

Accent is **ink only**: section labels, links, focus rings, hover dots,
the featured pricing border, and the hero title's final line. No
gradients (the shimmer headline dies), no blobs, no drop shadows. Cards
separate from the `#f7f7f7` ground by radius and contrast alone.

Availability badges ("Available Now", "TestFlight Beta") keep their green:
that color is semantic status, not decoration.

## Page structure (generic template, shown with Quick Reads content)

1. **Pill nav**, fixed and floating like the homepage. Left to right:
   an explicit **back link** (`.app-nav-back`: a left chevron + "Birchtree
   Productions") to `../../`, a divider, the app brand (app icon + app
   name, identity only, not a second home link), then Features / Pricing
   anchor links. Every app page MUST carry this back link so visitors can
   always return to the landing page. Below 640px the back label and the
   wordmark hide, leaving chevron + app icon + links. The existing
   `view-transition-name` on the nav icon survives.

2. **Icon-stage hero**: a rounded `--color-panel` panel (not 100vh;
   natural height with generous padding). Contents, centered:
   - App icon (`clamp(96px, 12vw, 148px)`, 22% radius). Pops in with
     overshoot on load, then rests still.
   - `<h1>` with the existing line breaks. The `gradient-text` span
     becomes a plain `.accent-line` span in accent ink.
   - Subtitle, verbatim.
   - Download buttons as calm pill buttons with the dot (`.btn-dot`
     pattern: 1px #8c8c8c border, dot grows and turns accent on hover).

3. **Hero screenshot**: directly below the panel, edge-to-edge image in
   a `--radius-image` rounded container, no shadow. Width-capped
   (`max-width: 900px`) and height-capped (`max-height: 620px` with
   `object-fit: cover; object-position: top`) so both landscape web
   shots and tall portrait iPhone shots behave.

4. **Feature sections** (`id="features"` on the first): each is a white
   `--radius-card` card containing a two-column grid, text | screenshot,
   alternating direction via a `.feature-flip` class. Screenshot sits in
   a rounded panel, height-capped at 480px for portrait safety. Labels
   ("Reading Experience", "Obsidian Plugin") are shuffle targets.

5. **Feature grid**: section header (label + title) plus the six cards,
   3-up (1-up below 768px). White cards, Phosphor icons in a soft accent
   tint square, badges intact. Cards enter as a staggered cascade.

6. **Pricing** (`id="pricing"`): section header plus the two cards.
   Featured card marked by a 1px accent border (no glow/shadow). The
   monthly/yearly toggle becomes two pill buttons; the active one is
   filled dark. Panel swap animates (see Motion) instead of snapping
   `display: none`.

7. **CTA**: white card, centered title + copy + primary button. The dark
   gradient background dies. Primary button = dark filled pill (the one
   filled button on the page), secondary = outline pill.

8. **Footer**: white rounded card like the homepage footer. Brand,
   API Docs / Privacy Policy links, dynamic copyright year.

Every block is optional and order-independent so other apps can omit
pricing, use two download buttons, skip the feature grid, etc.

## Motion

Motion is a priority ("it makes the design come to life"), so the page
gets a full inventory. Rules that bind every item:

- Animate `transform`, `opacity`, `clip-path` only.
- Content is visible by default; hiding is armed only after JS confirms
  it is running (`body.calm-app.is-armed`), except the hero icon which
  follows the homepage's pre-paint `anim-ready` pattern.
- Every item has a `prefers-reduced-motion: reduce` treatment (fade or
  nothing, never a slide/spring).

Inventory:

1. **Icon entrance pop.** Inline head script adds `anim-ready` to
   `<html>` when motion is allowed (same script as home). Under
   `anim-ready` the hero icon starts `opacity: 0; scale: 0.6`; `app.js`
   adds `icon-go` on the first frame and it springs to rest with the
   calm overshoot curve `cubic-bezier(0.34, 1.25, 0.5, 1)`, ~0.55s.
   Then it is still. No loop.
2. **Wipe reveals** on hero title/subtitle (on load, staggered 0.3s /
   0.45s) and on every section header (on scroll), the exact clip-path
   pattern from `home.css`, including the zero-area-clip-path
   IntersectionObserver trap: `.scroll-reveal` lives on an unclipped
   ancestor, `.revealed` cascades to `.wipe` children.
3. **Text shuffle** on section labels, ported from `home.js`
   (`initShuffle`), same glyph set and timing.
4. **Screenshot drift.** Feature-section screenshots translate on
   scroll like the band columns but gentler: `data-drift` factors around
   ±0.06, rAF-driven, capped to a few tens of px, `will-change:
   transform` only while in viewport. Static under reduced motion.
5. **Feature-card cascade**: cards start `translateY(16px)`, reveal with
   0.06s-per-card stagger, `cubic-bezier(0.22, 1, 0.36, 1)`, 0.55s.
6. **Pill button feedback**: hover grows the dot 1.6x and tints it
   accent; `:active` scales the button to 0.97 (no-preference only).
7. **Card icon hover pop**: feature-grid icon tiles scale 1.06 and tilt
   -2deg on card hover, `(hover: hover) and (pointer: fine)` only.
8. **Pricing toggle swap**: outgoing panel fades/slips 8px, incoming
   fades in, 0.25s, using a shared `.pricing-panes` container with
   cross-fade classes; `display` flips only after the fade. Reduced
   motion: instant swap.

## Behavior (`app.js`)

One IIFE, same structure as `home.js`:

- `reduceMotion` media query read once, exposed for verification as
  `window.__calmAppReduceMotion`.
- Arm reveals (`is-armed`), IntersectionObserver adding `.revealed`.
- `initShuffle()` port.
- `initDrift()` for screenshot drift (scroll + rAF, disconnects under
  reduced motion).
- `initIconPop()` (adds `icon-go` on first frame when `anim-ready`).
- `initPricingToggle()` generic over `[data-plan]` buttons and
  `[data-pricing-pane]` panels, so any app with a toggle gets it free.
- Current-year fill.
- Scroll-indicator logic dies with the scroll indicator (the calm
  homepage dropped it; app pages follow. CLAUDE.md's "all pages" list
  predates the calm redesign; the calm spec supersedes it for converted
  pages).

## Guard and tooling changes

- `tools/check-isolation.py`:
  - Generalize the CSS scope checker to take a scope token; run it for
    `home.css` / `.calm` and `app.css` / `.calm-app`.
  - Reference rules: `home.css`/`home.js` referenced only by
    `index.html` (unchanged); `app.css`/`app.js` referenced only by
    files under `apps/`.
- `tools/test-check-isolation.py`: new cases for the `.calm-app` token
  (scoped pass, unscoped fail, `.calm` does not satisfy `.calm-app` and
  vice versa) and for the reference rules.
- `cache-bust.sh`: add `bust app.css` and `bust app.js`.

## Verification

- Isolation guard passes; full test suite passes.
- Headless screenshots: full-page flatten at desktop width and iframe
  wrapper at 390px for mobile (the established harness workarounds:
  ~485px min window, transitions frozen under virtual time, so
  animation checked by endpoint states: collapsed vs settled icon).
- Grep checks: zero em dashes in user-facing text, all original copy
  strings present verbatim, `styles.css` not referenced by the
  converted page.
- Real-browser pass flagged to the user for: drift, shuffle, wipes,
  hover/press states, pricing toggle.

## Genericity acceptance test

Before this design is called done, it must be possible to describe the
conversion of a second app (e.g. Quick Reviews) as pure content edits:
new icon path, new `--app-accent`, new copy, new screenshots, choose
blocks. If converting a second app would need new CSS beyond a possible
new optional block, the template is not generic enough.
