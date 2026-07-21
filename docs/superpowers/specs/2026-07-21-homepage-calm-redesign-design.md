# Homepage Redesign: Calm Card Architecture

**Date:** 2026-07-21
**Scope:** `index.html` only (main site homepage)
**Reference:** https://humanmade.co.jp/

## Goal

Rework the Birchtree Productions homepage around a restrained, card-on-off-white
architecture, replacing the current purple-accented, gradient-and-blob treatment.
The eight app icons become the only significant color on the page.

## Why this reference works

Analysis of humanmade.co.jp's shipped CSS found six colors total: `#fff`, `#000`,
`#f7f7f7`, a hairline `#d7dbe2`, and two translucent blacks. All color on the page
comes from photography and brand logos. Every content surface is a white rounded
card (`border-radius: 2rem`, `padding: 4rem`) on an off-white ground, with no
borders and no shadows. Separation comes purely from radius plus ground contrast.

Birchtree has eight vivid app icons and an existing floating-icon hero, so the
content already supplies what this architecture needs.

## Decisions

| Question | Decision |
| --- | --- |
| Target page | `index.html` only |
| Accent color | Purple survives as ink only (links, focus rings, button dot) |
| Hero | Concentric app-icon stage with magnetic hover and draggable inner ring |
| Apps section | Card stack with fixed columns, no alternation |
| Motion devices | All four: clip-path wipes, parallax band, text shuffle, pill nav |
| Style isolation | New scoped tokens and classes; shared `styles.css` behavior preserved |

## Style isolation strategy

`styles.css` is shared with all eight app sub-pages under `apps/`. Retuning
existing tokens (`--color-bg-secondary`, the radius scale) or removing the
gradient would silently restyle every sub-page.

Therefore: **add new tokens, do not repurpose existing ones.** New homepage
component styles are scoped under a `.calm` class applied to `<body>` in
`index.html`, so sub-pages are untouched. Rolling the system out to sub-pages is
a separate, deliberate pass, out of scope here.

## 1. Foundation

New tokens:

```css
--color-ground:  #f7f7f7;   /* page background */
--color-card:    #ffffff;   /* every content surface */
--radius-panel:  2.4rem;    /* hero stage */
--radius-card:   2rem;      /* content cards */
--radius-image:  1.5rem;    /* screenshots */
--radius-pill:   99999px;   /* nav, buttons */
```

Purple remains `rgb(136, 57, 239)`, used only for inline links, focus rings, and
the button dot on hover.

Removed from the homepage:

- gradient text shimmer
- gradient CTA background
- floating background blobs (`.background-shapes`)
- all card box-shadows

**Deliberate deviation from the reference:** humanmade sets a viewport-scaled root
font-size so `1rem` resolves to roughly `10px`, which is how it produces column
widths like `13.2rem`. We do not copy this. It overrides user font-size
preferences, which is an unacceptable tradeoff on a site built on Atkinson
Hyperlegible Next, a typeface chosen for legibility. Use `clamp()` directly for
fluid sizing instead.

## 2. Hero stage

A `100vh` panel at `--radius-panel` on `--color-ground`, inset from the viewport
edge far enough that the corners are visible.

- `images/birchtree-icon.png` centered at `clamp(120px, 14vw, 200px)`
- Eight app icons distributed across three concentric rings at approximately
  `100vw`, `70vw`, and `45vw` diameter, positioned by rotation plus translation
  so ring spacing stays even. Distribution is 3 icons per ring on the outer and
  middle rings and 2 on the inner, with each ring's icons evenly spaced by angle
  and the rings offset from each other so icons do not align radially. Icon size
  scales down toward the center ring so the Birchtree mark stays dominant.
- Tagline pinned bottom-right, revealed with `clip-path: inset(0 100% 0 0)`

**Magnetic hover:** a `pointermove` handler on the stage translates each icon
toward the cursor, scaled by inverse distance and clamped to a maximum offset.
Throttled with `requestAnimationFrame`. A CSS transition carries icons back to
rest on pointer leave.

**Drag:** the stage carries `cursor: grab`. Dragging anywhere on it rotates all
three rings at different rates (inner fastest, outer slowest), with momentum
decay on release.

*Amended 2026-07-21 during planning.* This originally specified drag on the inner
ring only. Once the icon distribution settled at 2 icons on the inner ring, that
made for a poor drag target, and a whole-stage grab is more discoverable.

**Reduced motion** (`prefers-reduced-motion: reduce`): rings render static,
magnetic and drag are disabled, tagline fades instead of wiping.

**Mobile:** ring diameters tighten, magnetic hover is disabled (no meaningful
hover), drag remains via touch events, tagline moves below the mark rather than
pinning bottom-right.

## 3. Nav and buttons

Fixed white pill nav, horizontally centered, `border-radius: var(--radius-pill)`,
backdrop blur, sitting on top of content rather than spanning the full width.
Retains the existing Apps, Creative, and About links.

Buttons become pills containing a small dot that animates on hover.

## 4. Apps section

Each app is a white card at `--radius-card` with fluid padding.

- **Head:** app icon plus a wide screenshot at `--radius-image`, `overflow: hidden`
- **Body:** three-column grid

```css
grid-template-columns: minmax(0, 20rem) minmax(0, 1fr) auto;
```

Columns are title, description, and a right-aligned pill link. Identical rhythm
on every card, no left/right alternation. Collapses to a single column below
900px.

The MacStories Best New App award line sits beneath the Quick Reviews title.

Existing `view-transition-name` values on app icons are preserved so the
homepage-to-subpage transitions keep working.

## 5. Parallax band

Full-bleed band placed between the Apps and Creative sections.

- Six columns of existing app screenshots
- Alternate columns anchored to opposite ends (`align-self: flex-start` /
  `flex-end`)
- Each column translates on scroll at a different rate
- 50% black scrim overlay
- `aspect-ratio: 1440/550` on desktop; three columns at `390/340` on mobile
- Static under reduced motion

Scroll handler is rAF-throttled and uses `will-change: transform` on the moving
columns.

## 6. Text shuffle, constrained

Letters scramble into place on reveal.

Applied **only** to section labels (Apps, Creative, About). Explicitly **not**
applied to body headings, app names, descriptions, or the hero tagline.

- Fires on first scroll reveal only, never on hover
- Roughly 600ms, settling left to right
- Disabled under reduced motion

**Recorded concern:** this device works against Atkinson Hyperlegible Next, which
was chosen for legibility. The constraints above exist to contain that conflict.
The recommendation was to omit it; it is included at the user's explicit request
in this reduced form. If it reads poorly in practice, section labels are a
single-selector removal.

## 7. Remaining sections

Creative, About, and Contact are retained and restyled as white cards on the
ground. The Creative list adopts an editorial row layout (label, copy, link in
fixed columns) rather than a card grid.

## 8. Housekeeping

`CLAUDE.md` currently mandates `.background-shapes` on every page and documents
the gradient as a core design token. This redesign removes both from the
homepage. `CLAUDE.md` must be updated in the same change, or a future session
will restore the blobs as a correctness fix.

`./cache-bust.sh` runs after `styles.css` changes and before commit, per project
convention.

## Out of scope

- App sub-pages under `apps/` (separate rollout pass)
- Privacy policy pages
- Any change to shared token values that existing sub-pages depend on

## Success criteria

- Homepage renders with no gradients, no blobs, and no shadows on cards
- All eight app sub-pages render identically to before the change
- Hero magnetic and drag interactions work with mouse and touch
- Full experience degrades correctly under `prefers-reduced-motion: reduce`
- Layout holds from 375px to 1920px wide
- User font-size preferences are respected (no viewport-scaled root font-size)
