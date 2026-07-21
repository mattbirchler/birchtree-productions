# Homepage Calm Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Birchtree Productions homepage around a restrained white-card-on-off-white architecture with a concentric app-icon hero, without altering any of the eight app sub-pages.

**Architecture:** All new styles live in a new `home.css` linked only from `index.html`, with every rule scoped under `body.calm`. The shared `styles.css` is not modified at all, which makes sub-page isolation structural rather than conventional. New homepage JavaScript lives in a new `home.js`, also loaded only by `index.html`.

**Tech Stack:** Vanilla HTML, CSS, and JavaScript. No build step, no package manager, no framework. Python 3 (stdlib only) for the isolation guard script.

## Global Constraints

- **Never modify `styles.css`.** Sub-page isolation depends on it. Task 1 installs a guard that fails the build if it changes.
- **Every rule in `home.css` must be scoped under `.calm`.** Including custom property declarations, which go on `body.calm`, never on `:root`.
- **No em dashes in any user-facing text.** Project-wide rule from the global CLAUDE.md. Use a colon, parentheses, a comma, or two sentences.
- **Every motion feature needs a `prefers-reduced-motion: reduce` fallback.** No exceptions.
- **Run `./cache-bust.sh` before any commit that changes `home.css` or `styles.css`.**
- **Preserve all existing `view-transition-name` inline styles on app icons.** The homepage-to-subpage view transitions depend on them.
- **Preserve existing behavior in the inline `<script>` in `index.html`:** scroll reveal, navbar scroll state, footer year, screenshot lightbox, and scroll position save/restore.
- Accent purple is `rgb(136, 57, 239)` and appears only on inline links, focus rings, and the button dot on hover.
- No viewport-scaled root font-size. Use `clamp()` for fluid sizing.

## File Structure

| File | Responsibility |
| --- | --- |
| `home.css` (new) | Every homepage style, all scoped under `body.calm` |
| `home.js` (new) | Hero magnetic/drag, parallax band, text shuffle |
| `index.html` (modify) | Markup restructure, link the two new files, add `.calm` to body |
| `tools/check-isolation.py` (new) | Guard: enforces scoping and sub-page isolation |
| `cache-bust.sh` (modify) | Extend to hash `home.css` and `home.js` |
| `CLAUDE.md` (modify) | Remove the now-false background-shapes and gradient mandates |
| `styles.css` | **Untouched.** Guarded. |

---

### Task 1: Isolation scaffold and guard

Sets up the two new files and the check that makes every later task safe. Nothing visual changes yet.

**Files:**
- Create: `home.css`
- Create: `home.js`
- Create: `tools/check-isolation.py`
- Modify: `index.html` (head link, body class, script tag)
- Modify: `cache-bust.sh`

**Interfaces:**
- Consumes: nothing
- Produces: `body.calm` scoping hook; `tools/check-isolation.py` exits 0 on pass and 1 with printed violations on fail; `home.css` and `home.js` exist and are loaded only by `index.html`

- [ ] **Step 1: Write the guard script**

Create `tools/check-isolation.py`:

```python
#!/usr/bin/env python3
"""Verify homepage styles cannot affect app sub-pages.

Two guarantees:
  1. Every rule in home.css is scoped under .calm, so the file cannot leak
     styles even if some page loads it by accident.
  2. home.css and home.js are referenced only by index.html.

Run from anywhere: python3 tools/check-isolation.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ALLOWED_UNSCOPED = ("@import", "@charset", "@font-face", "@keyframes")


def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def top_level_rules(css):
    """Yield (selector, body) for each rule at the current nesting level."""
    depth = 0
    sel_start = 0
    body_start = 0
    selector = ""
    for i, ch in enumerate(css):
        if ch == "{":
            if depth == 0:
                selector = css[sel_start:i].strip()
                body_start = i + 1
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                yield selector, css[body_start:i]
                sel_start = i + 1


def check_selector(selector, violations):
    for part in selector.split(","):
        part = part.strip()
        if not part:
            continue
        if ".calm" not in part:
            violations.append(f"unscoped selector: {part!r}")


def walk(css, violations):
    for selector, body in top_level_rules(css):
        if selector.startswith("@"):
            name = selector.split()[0]
            if name in ("@media", "@supports", "@layer"):
                walk(body, violations)
            elif name in ALLOWED_UNSCOPED:
                continue
            else:
                violations.append(f"unsupported at-rule: {selector!r}")
        else:
            check_selector(selector, violations)


def main():
    violations = []

    home_css = ROOT / "home.css"
    if not home_css.exists():
        print("FAIL: home.css does not exist")
        return 1
    walk(strip_comments(home_css.read_text()), violations)

    root_index = ROOT / "index.html"
    for html in sorted(ROOT.rglob("*.html")):
        if html == root_index:
            continue
        text = html.read_text()
        for asset in ("home.css", "home.js"):
            if asset in text:
                violations.append(f"{asset} referenced by {html.relative_to(ROOT)}")

    if violations:
        print("FAIL: homepage styles are not isolated")
        for v in violations:
            print(f"  - {v}")
        return 1

    print("PASS: homepage styles are isolated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Create a deliberately bad `home.css` and prove the guard catches it**

Write this temporary content to `home.css`:

```css
.stage { color: red; }
```

Run: `python3 tools/check-isolation.py`

Expected output:

```
FAIL: homepage styles are not isolated
  - unscoped selector: '.stage'
```

Expected exit code: 1. Verify with `echo $?`.

- [ ] **Step 3: Fix `home.css` to the correct scoped form and prove the guard passes**

Replace the contents of `home.css` with:

```css
/* Birchtree Productions homepage.
   Loaded only by index.html. Every rule is scoped under .calm so these
   styles cannot reach the app sub-pages under apps/.
   Verified by tools/check-isolation.py. */

body.calm {
    background-color: #f7f7f7;
}
```

Run: `python3 tools/check-isolation.py`

Expected output: `PASS: homepage styles are isolated`, exit code 0.

- [ ] **Step 4: Create the empty `home.js`**

```javascript
/* Birchtree Productions homepage behavior.
   Loaded only by index.html. */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Feature modules are registered here in later tasks.

    window.__calmReduceMotion = reduceMotion;
}());
```

- [ ] **Step 5: Wire both files into `index.html`**

In `index.html`, immediately after the existing `styles.css` link line:

```html
    <link rel="stylesheet" href="styles.css?v=be9fc7ad">
```

add:

```html
    <link rel="stylesheet" href="home.css?v=0">
```

Change the body tag from:

```html
<body>
```

to:

```html
<body class="calm">
```

Immediately before the closing `</body>` tag, after the existing inline `<script>` block, add:

```html
    <script src="home.js?v=0" defer></script>
```

- [ ] **Step 6: Extend `cache-bust.sh` to cover the new files**

Replace the entire contents of `cache-bust.sh` with:

```bash
#!/bin/bash
# Updates all HTML files with cache-busting hashes for the CSS and JS assets.
# Run this after making changes to styles.css, home.css, or home.js.

set -e

bust() {
    asset="$1"
    [ -f "$asset" ] || return 0
    name=$(basename "$asset")
    escaped=$(echo "$name" | sed 's/\./\\./g')
    hash=$(md5 -q "$asset" | cut -c1-8)
    echo "Cache-busting $name with hash: $hash"
    find . -name "*.html" | while read -r file; do
        sed -i '' "s|${escaped}\(?v=[a-z0-9]*\)\{0,1\}\"|${name}?v=${hash}\"|g" "$file"
    done
}

bust styles.css
bust home.css
bust home.js

echo "Done. Updated all HTML files."
```

- [ ] **Step 7: Run the cache-bust script and confirm sub-pages were not restyled**

Run:

```bash
./cache-bust.sh
git diff --stat -- styles.css
```

Expected: `cache-bust.sh` prints three "Cache-busting" lines. The `git diff --stat` for `styles.css` prints nothing, meaning `styles.css` is unchanged.

Run: `git diff --name-only -- apps/`

Expected: the eight app `index.html` files appear (their `styles.css?v=` query string may have been rewritten to the same value it already had). Confirm the actual change is empty or query-string-only:

```bash
git diff -- apps/ | grep '^[+-]' | grep -v '^[+-][+-]' | grep -v 'styles\.css?v='
```

Expected: no output. If anything prints, an app page was altered and the change must be reverted.

- [ ] **Step 8: Open the page and confirm nothing visibly changed**

Run: `open index.html`

Expected: the homepage looks exactly as it did before, except the page background behind existing sections is now `#f7f7f7` instead of white.

- [ ] **Step 9: Commit**

```bash
git add home.css home.js tools/check-isolation.py cache-bust.sh index.html apps/
git commit -m "Add isolated homepage stylesheet, script, and isolation guard"
```

---

### Task 2: Foundation tokens and ground

Establishes the token set and strips the gradient, blob, and shadow treatments from the homepage.

**Files:**
- Modify: `home.css`
- Modify: `index.html` (remove background shapes markup)

**Interfaces:**
- Consumes: `body.calm` from Task 1
- Produces: custom properties `--color-ground`, `--color-card`, `--radius-panel`, `--radius-card`, `--radius-image`, `--radius-pill`, `--accent`, `--pad-card`, all declared on `body.calm` and available to every later task

- [ ] **Step 1: Replace `home.css` with the foundation layer**

```css
/* Birchtree Productions homepage.
   Loaded only by index.html. Every rule is scoped under .calm so these
   styles cannot reach the app sub-pages under apps/.
   Verified by tools/check-isolation.py. */

body.calm {
    /* Surfaces */
    --color-ground: #f7f7f7;
    --color-card: #ffffff;

    /* Radii */
    --radius-panel: 2.4rem;
    --radius-card: 2rem;
    --radius-image: 1.5rem;
    --radius-pill: 99999px;

    /* Ink */
    --accent: rgb(136, 57, 239);

    /* Rhythm */
    --pad-card: clamp(1.5rem, 4vw, 4rem);
    --gap-section: clamp(2rem, 5vw, 5rem);

    background-color: var(--color-ground);
}

/* The homepage carries no decorative gradients, blobs, or shadows.
   Content surfaces separate from the ground by radius and contrast alone. */
.calm .background-shapes,
.calm .grain-overlay,
.calm .grain-svg {
    display: none;
}

.calm .section {
    background: var(--color-ground);
}

.calm .app-feature,
.calm .content-card,
.calm .about-wrapper {
    box-shadow: none;
    background: var(--color-card);
    border-radius: var(--radius-card);
}

/* Purple survives as ink only. */
.calm a {
    color: inherit;
}

.calm .about-text a,
.calm .app-award a {
    color: var(--accent);
}

.calm :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
}
```

- [ ] **Step 2: Verify the guard still passes**

Run: `python3 tools/check-isolation.py`

Expected: `PASS: homepage styles are isolated`, exit code 0.

- [ ] **Step 3: Remove the decorative markup from `index.html`**

Delete these three blocks from `index.html` (they sit between `<body class="calm">` and `<nav class="navbar">`):

```html
    <!-- Grain texture filter -->
    <svg class="grain-svg" aria-hidden="true">
        <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.80" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
        </filter>
    </svg>

    <div class="background-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
    </div>

    <div class="grain-overlay" aria-hidden="true"></div>
```

The CSS rule hiding them stays as a defensive measure in case any of it is reintroduced.

- [ ] **Step 4: Verify in the browser**

Run: `./cache-bust.sh && open index.html`

Expected: no purple blobs behind the content, no grain texture, page background is off-white, content sections sit on white rounded surfaces with no drop shadows.

- [ ] **Step 5: Verify sub-pages are untouched**

```bash
git diff -- styles.css | head
git diff -- apps/ | grep '^[+-]' | grep -v '^[+-][+-]' | grep -v -E '(styles|home)\.(css|js)\?v='
```

Expected: no output from either command.

- [ ] **Step 6: Commit**

```bash
git add home.css index.html apps/
git commit -m "Establish calm foundation tokens and remove homepage gradients and blobs"
```

---

### Task 3: Pill nav and dot buttons

**Files:**
- Modify: `home.css`
- Modify: `index.html:60-71` (nav markup region, line numbers shift after Task 2 removals)

**Interfaces:**
- Consumes: tokens from Task 2
- Produces: `.calm .btn-dot` button class used by Task 7's app cards

- [ ] **Step 1: Append the nav and button styles to `home.css`**

```css
/* ---------- Pill nav ---------- */

.calm .navbar {
    position: fixed;
    top: clamp(1rem, 2.5vw, 2.4rem);
    left: 50%;
    transform: translateX(-50%);
    width: auto;
    max-width: calc(100vw - 2rem);
    background: var(--color-card);
    border-radius: var(--radius-pill);
    border: none;
    box-shadow: none;
    z-index: 5000;
    transition: background-color 0.3s ease;
}

.calm .navbar.scrolled {
    background: var(--color-card);
}

.calm .nav-container {
    display: flex;
    align-items: center;
    gap: clamp(1rem, 2vw, 2rem);
    max-width: none;
    padding: clamp(0.6rem, 1.2vw, 0.9rem) clamp(1rem, 2.5vw, 1.6rem);
}

.calm .nav-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: clamp(0.85rem, 1.4vw, 1rem);
    font-weight: 700;
    white-space: nowrap;
}

.calm .nav-logo-icon {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 22%;
}

.calm .nav-links {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 1.6vw, 1.4rem);
    margin: 0;
    padding: 0;
    list-style: none;
}

.calm .nav-links a {
    font-size: clamp(0.75rem, 1.1vw, 0.875rem);
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

/* On narrow screens the wordmark would force the pill off-screen. */
@media (max-width: 640px) {
    .calm .nav-logo span,
    .calm .nav-logo {
        font-size: 0;
    }

    .calm .nav-logo-icon {
        font-size: 1rem;
    }
}

/* ---------- Pill buttons with dot ---------- */

.calm .btn,
.calm .btn-dot,
.calm .contact-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.9rem 1.4rem;
    border-radius: var(--radius-pill);
    border: 1px solid #d7dbe2;
    background: var(--color-card);
    color: #000;
    font-size: clamp(0.75rem, 1.1vw, 0.875rem);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-decoration: none;
    transition: border-color 0.25s ease, background-color 0.25s ease;
}

.calm .btn::after,
.calm .btn-dot::after {
    content: "";
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: #000;
    transition: background-color 0.25s ease, transform 0.25s ease;
}

.calm .btn:hover,
.calm .btn-dot:hover,
.calm .contact-btn:hover {
    border-color: var(--accent);
}

.calm .btn:hover::after,
.calm .btn-dot:hover::after {
    background: var(--accent);
    transform: scale(1.6);
}
```

- [ ] **Step 2: Wrap the nav wordmark so it can be hidden on mobile**

In `index.html`, change:

```html
            <a href="#" class="nav-logo"><img src="images/birchtree-icon.png" alt="" class="nav-logo-icon">Birchtree Productions</a>
```

to:

```html
            <a href="#" class="nav-logo" aria-label="Birchtree Productions home"><img src="images/birchtree-icon.png" alt="" class="nav-logo-icon"><span>Birchtree Productions</span></a>
```

- [ ] **Step 3: Verify the guard passes**

Run: `python3 tools/check-isolation.py`

Expected: `PASS`, exit 0.

- [ ] **Step 4: Verify in the browser at two widths**

Run: `./cache-bust.sh && open index.html`

Expected at 1440px wide: a white pill floating centered near the top, containing the icon, the wordmark, and four links. It sits on top of content as you scroll.

Expected at 375px wide (resize the window or use responsive mode): the wordmark is hidden, the icon and four links remain, and the pill does not overflow the viewport.

- [ ] **Step 5: Commit**

```bash
git add home.css index.html apps/
git commit -m "Add floating pill nav and dot buttons to homepage"
```

---

### Task 4: Hero stage, static layout

Builds the concentric ring composition with no motion yet, so geometry can be verified independently of the interaction code.

**Files:**
- Modify: `index.html:73-100` (hero region)
- Modify: `home.css`

**Interfaces:**
- Consumes: tokens from Task 2
- Produces: DOM contract used by Task 5's JavaScript:
  - `.stage` is the pointer-tracking container
  - `.stage-ring` elements carry `data-ring="outer|mid|inner"` and inherit a `--radius` custom property
  - `.stage-icon` elements carry a `--angle` custom property and read `--mx`, `--my`, and `--spin`
  - `.stage-copy` carries the tagline

- [ ] **Step 1: Replace the hero markup in `index.html`**

Replace the entire `<header class="hero">...</header>` block with:

```html
    <header class="hero stage" id="stage">
        <div class="stage-rings" aria-hidden="true">
            <div class="stage-ring" data-ring="outer">
                <img src="images/quick-reviews.png" alt="" class="stage-icon" style="--angle: 20deg;">
                <img src="images/quick-reads.png" alt="" class="stage-icon" style="--angle: 140deg;">
                <img src="images/chapterpod.png" alt="" class="stage-icon" style="--angle: 260deg;">
            </div>
            <div class="stage-ring" data-ring="mid">
                <img src="images/yearly run goals.png" alt="" class="stage-icon" style="--angle: 75deg;">
                <img src="images/quick subtitles.png" alt="" class="stage-icon" style="--angle: 195deg;">
                <img src="images/quick notes.png" alt="" class="stage-icon" style="--angle: 315deg;">
            </div>
            <div class="stage-ring" data-ring="inner">
                <img src="images/typefully-icon.png" alt="" class="stage-icon" style="--angle: 40deg;">
                <img src="images/best-o-masto.png" alt="" class="stage-icon" style="--angle: 220deg;">
            </div>
        </div>

        <div class="stage-center">
            <img src="images/birchtree-icon.png" alt="Birchtree Productions" class="stage-mark">
        </div>

        <div class="stage-copy">
            <h1 class="stage-title wipe">Birchtree Productions</h1>
            <p class="stage-tagline wipe">Indie apps and content for people who believe technology should serve us, not the other way around.</p>
        </div>
    </header>
```

Note: the icons are `aria-hidden` because they are decorative here. Each app is named in full in the Apps section below, so no information is lost to screen readers.

- [ ] **Step 2: Append the stage styles to `home.css`**

```css
/* ---------- Hero stage ---------- */

.calm .stage {
    position: relative;
    display: grid;
    place-items: center;
    height: 100vh;
    min-height: 34rem;
    margin: clamp(0.5rem, 1.5vw, 1rem);
    border-radius: var(--radius-panel);
    background: #f0f0f2;
    overflow: hidden;
    touch-action: pan-y;
}

.calm .stage-rings {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.calm .stage-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    transform: rotate(var(--spin, 0deg));
}

.calm .stage-ring[data-ring="outer"] {
    --radius: 46vmin;
    --icon-size: clamp(44px, 5.5vmin, 72px);
}

.calm .stage-ring[data-ring="mid"] {
    --radius: 32vmin;
    --icon-size: clamp(38px, 4.6vmin, 60px);
}

.calm .stage-ring[data-ring="inner"] {
    --radius: 20vmin;
    --icon-size: clamp(32px, 3.8vmin, 50px);
}

.calm .stage-icon {
    position: absolute;
    top: 0;
    left: 0;
    width: var(--icon-size);
    height: var(--icon-size);
    margin: calc(var(--icon-size) / -2);
    border-radius: 22%;
    /* Orbit to the ring position, counter-rotate to stay upright, then
       apply the magnetic offset set by home.js. */
    transform:
        rotate(var(--angle))
        translateY(calc(var(--radius) * -1))
        rotate(calc((var(--angle) + var(--spin, 0deg)) * -1))
        translate(var(--mx, 0px), var(--my, 0px));
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

/* While the pointer is over the stage, magnetic updates must not lag behind
   a half-second transition. home.js toggles this class. */
.calm .stage.is-tracking .stage-icon {
    transition: none;
}

.calm .stage-center {
    position: relative;
    z-index: 2;
}

.calm .stage-mark {
    display: block;
    width: clamp(120px, 14vw, 200px);
    height: auto;
    border-radius: 22%;
}

.calm .stage-copy {
    position: absolute;
    right: clamp(1.5rem, 4vw, 4rem);
    bottom: clamp(1.5rem, 4vw, 4rem);
    z-index: 2;
    max-width: 26rem;
    text-align: right;
}

.calm .stage-title {
    font-size: clamp(1rem, 1.6vw, 1.25rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 0.4rem;
}

.calm .stage-tagline {
    font-size: clamp(0.9rem, 1.3vw, 1.05rem);
    line-height: 1.7;
    letter-spacing: -0.02em;
    font-weight: 700;
    margin: 0;
}

/* Below this width the rings crowd the mark and the pinned copy overlaps
   the composition, so the copy moves beneath it. */
@media (max-width: 768px) {
    .calm .stage {
        height: auto;
        min-height: 0;
        padding: 8rem 1.5rem 3rem;
        grid-template-rows: auto auto;
        gap: 2rem;
    }

    .calm .stage-rings {
        position: absolute;
        inset: 0 0 auto 0;
        height: 60vh;
    }

    .calm .stage-ring[data-ring="outer"] {
        --radius: 40vmin;
    }

    .calm .stage-ring[data-ring="mid"] {
        --radius: 28vmin;
    }

    .calm .stage-ring[data-ring="inner"] {
        --radius: 17vmin;
    }

    .calm .stage-copy {
        position: static;
        max-width: none;
        text-align: center;
    }
}
```

- [ ] **Step 3: Verify the guard passes**

Run: `python3 tools/check-isolation.py`

Expected: `PASS`, exit 0.

- [ ] **Step 4: Verify geometry in the browser**

Run: `./cache-bust.sh && open index.html`

Expected at 1440px:
- The hero is a rounded off-white panel with visible corners inset from the viewport edge
- The Birchtree mark is centered
- Eight app icons sit on three concentric rings, all upright, none overlapping the mark
- Icons get smaller toward the center
- No two icons on adjacent rings line up radially
- Title and tagline sit bottom-right

Expected at 375px: rings tighten, copy sits centered below the mark, nothing overflows horizontally.

- [ ] **Step 5: Confirm no horizontal page scroll**

In the browser console:

```javascript
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

Expected: `true` at both 1440px and 375px.

- [ ] **Step 6: Commit**

```bash
git add home.css index.html apps/
git commit -m "Build concentric app-icon hero stage with static ring layout"
```

---

### Task 5: Hero magnetic hover and ring drag

**Files:**
- Modify: `home.js`

**Interfaces:**
- Consumes: the DOM contract from Task 4
- Produces: nothing consumed by later tasks

**Spec amendment implemented here:** the design document originally specified drag on the inner ring only. With two icons on the inner ring that is an unsatisfying target, so drag is grabbed anywhere on the stage and rotates all three rings at different rates (inner fastest). This is recorded in the spec's Decisions table.

- [ ] **Step 1: Append the hero module to `home.js`, inside the existing IIFE, above the `window.__calmReduceMotion` line**

```javascript
    function initStage() {
        var stage = document.getElementById('stage');
        if (!stage) { return; }

        var rings = Array.prototype.slice.call(
            stage.querySelectorAll('.stage-ring')
        );
        var icons = Array.prototype.slice.call(
            stage.querySelectorAll('.stage-icon')
        );
        if (!icons.length) { return; }

        var MAX_PULL = 20;      // px an icon can travel toward the cursor
        var FALLOFF = 260;      // px at which the pull reaches zero
        var DRAG_RATE = {       // deg of spin per px dragged, per ring
            outer: 0.06,
            mid: 0.11,
            inner: 0.18
        };
        var FRICTION = 0.94;    // momentum decay per frame
        var MIN_VELOCITY = 0.01;

        var spin = { outer: 0, mid: 0, inner: 0 };
        var velocity = 0;
        var pointer = null;
        var dragging = false;
        var lastX = 0;
        var frame = null;

        function ringRadiusPx(ring) {
            // --radius is authored in vmin, so resolve it against the element.
            var raw = getComputedStyle(ring).getPropertyValue('--radius').trim();
            var probe = document.createElement('div');
            probe.style.position = 'absolute';
            probe.style.visibility = 'hidden';
            probe.style.width = raw;
            stage.appendChild(probe);
            var px = probe.getBoundingClientRect().width;
            stage.removeChild(probe);
            return px;
        }

        function applySpin() {
            rings.forEach(function (ring) {
                var key = ring.getAttribute('data-ring');
                ring.style.setProperty('--spin', spin[key] + 'deg');
            });
        }

        function applyMagnetic() {
            if (!pointer) {
                icons.forEach(function (icon) {
                    icon.style.setProperty('--mx', '0px');
                    icon.style.setProperty('--my', '0px');
                });
                return;
            }

            var box = stage.getBoundingClientRect();
            var cx = box.left + box.width / 2;
            var cy = box.top + box.height / 2;

            icons.forEach(function (icon) {
                var ring = icon.parentNode;
                var key = ring.getAttribute('data-ring');
                var radius = parseFloat(ring.dataset.radiusPx) || 0;
                var angleDeg = parseFloat(
                    getComputedStyle(icon).getPropertyValue('--angle')
                ) || 0;
                var theta = (angleDeg + spin[key]) * Math.PI / 180;

                // Rest position computed analytically, so reading it back is
                // never contaminated by the offset we are about to apply.
                var restX = cx + Math.sin(theta) * radius;
                var restY = cy - Math.cos(theta) * radius;

                var dx = pointer.x - restX;
                var dy = pointer.y - restY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var strength = Math.max(0, 1 - dist / FALLOFF);
                var pull = strength * strength * MAX_PULL;

                if (dist < 0.5) {
                    icon.style.setProperty('--mx', '0px');
                    icon.style.setProperty('--my', '0px');
                    return;
                }

                icon.style.setProperty('--mx', (dx / dist * pull).toFixed(2) + 'px');
                icon.style.setProperty('--my', (dy / dist * pull).toFixed(2) + 'px');
            });
        }

        function tick() {
            frame = null;

            if (!dragging && Math.abs(velocity) > MIN_VELOCITY) {
                Object.keys(spin).forEach(function (key) {
                    spin[key] += velocity * DRAG_RATE[key];
                });
                velocity *= FRICTION;
                applySpin();
                schedule();
            } else if (!dragging) {
                velocity = 0;
            }

            applyMagnetic();
        }

        function schedule() {
            if (frame === null) {
                frame = window.requestAnimationFrame(tick);
            }
        }

        function measure() {
            rings.forEach(function (ring) {
                ring.dataset.radiusPx = ringRadiusPx(ring);
            });
            schedule();
        }

        // Magnetic hover is pointer-driven, so it only makes sense where a
        // hovering pointer exists.
        var canHover = window.matchMedia('(hover: hover)').matches;

        if (canHover && !reduceMotion.matches) {
            stage.addEventListener('pointermove', function (e) {
                if (e.pointerType !== 'mouse') { return; }
                pointer = { x: e.clientX, y: e.clientY };
                stage.classList.add('is-tracking');
                schedule();
            });

            stage.addEventListener('pointerleave', function () {
                pointer = null;
                stage.classList.remove('is-tracking');
                schedule();
            });
        }

        if (!reduceMotion.matches) {
            stage.style.cursor = 'grab';

            stage.addEventListener('pointerdown', function (e) {
                dragging = true;
                lastX = e.clientX;
                velocity = 0;
                stage.style.cursor = 'grabbing';
                stage.setPointerCapture(e.pointerId);
            });

            stage.addEventListener('pointermove', function (e) {
                if (!dragging) { return; }
                var dx = e.clientX - lastX;
                lastX = e.clientX;
                velocity = dx;
                Object.keys(spin).forEach(function (key) {
                    spin[key] += dx * DRAG_RATE[key];
                });
                applySpin();
                schedule();
            });

            function endDrag(e) {
                if (!dragging) { return; }
                dragging = false;
                stage.style.cursor = 'grab';
                if (e && e.pointerId !== undefined &&
                    stage.hasPointerCapture(e.pointerId)) {
                    stage.releasePointerCapture(e.pointerId);
                }
                schedule();
            }

            stage.addEventListener('pointerup', endDrag);
            stage.addEventListener('pointercancel', endDrag);
        }

        window.addEventListener('resize', measure);
        measure();
    }

    initStage();
```

- [ ] **Step 2: Verify magnetic hover**

Run: `./cache-bust.sh && open index.html`

Move the mouse slowly across the hero.

Expected: icons near the cursor lean toward it by roughly 20px at most, the effect fades out at about 260px away, and icons glide back to rest when the pointer leaves the hero.

- [ ] **Step 3: Verify drag and momentum**

Click and drag horizontally across the hero, then release mid-motion.

Expected: all three rings rotate, the inner ring rotates roughly three times as fast as the outer, icons stay upright throughout, and on release the rotation coasts to a stop rather than halting instantly. The cursor reads `grab` at rest and `grabbing` while dragging.

- [ ] **Step 4: Verify reduced motion**

On macOS, enable System Settings > Accessibility > Display > Reduce motion. Reload the page.

Expected: rings render static, the cursor is the default arrow, dragging does nothing, and hovering produces no icon movement.

Turn the setting back off before continuing.

- [ ] **Step 5: Verify touch**

Open the page in Safari's responsive design mode set to iPhone, or on a device.

Expected: dragging with touch rotates the rings. No magnetic effect (there is no hovering pointer). Vertical swipes still scroll the page normally rather than being captured by the drag handler.

- [ ] **Step 6: Verify no console errors**

Open the browser console and reload.

Expected: no errors or warnings.

- [ ] **Step 7: Commit**

```bash
git add home.js index.html apps/
git commit -m "Add magnetic hover and ring drag to hero stage"
```

---

### Task 6: Clip-path reveal wipes

Replaces fade-based reveals on the homepage with left-to-right wipes.

**Files:**
- Modify: `home.css`
- Modify: `index.html` (add `wipe` class to revealing elements)

**Interfaces:**
- Consumes: the existing IntersectionObserver in the inline `<script>`, which already adds `.revealed` to any `.scroll-reveal` element
- Produces: the `.wipe` class, applied by Tasks 7 and 10

- [ ] **Step 1: Append the wipe styles to `home.css`**

```css
/* ---------- Reveal wipes ---------- */

/* Copy reveals by wiping left to right rather than fading. Elements that
   also carry .scroll-reveal are driven by the IntersectionObserver in
   index.html, which adds .revealed. Hero elements reveal on load. */
.calm .wipe {
    clip-path: inset(0 100% 0 0);
    transition: clip-path 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Scroll-driven elements are revealed by the IntersectionObserver.
   Hero copy is revealed by the load gate instead, since it is above the
   fold and would otherwise reveal before the browser has painted the
   clipped state, skipping the transition entirely. */
.calm .wipe.revealed,
.calm.is-loaded .stage-copy .wipe {
    clip-path: inset(0 0 0 0);
}

.calm .stage-copy .stage-title.wipe {
    transition-delay: 0.3s;
}

.calm .stage-copy .stage-tagline.wipe {
    transition-delay: 0.45s;
}

/* Stagger reveals within a section header. */
.calm .section-header .wipe:nth-child(2) {
    transition-delay: 0.1s;
}

.calm .section-header .wipe:nth-child(3) {
    transition-delay: 0.2s;
}

@media (prefers-reduced-motion: reduce) {
    .calm .wipe {
        clip-path: none;
        opacity: 0;
        transition: opacity 0.4s ease;
    }

    .calm .wipe.revealed,
    .calm.is-loaded .stage-copy .wipe {
        opacity: 1;
    }
}
```

- [ ] **Step 2: Set the load flag in `home.js`**

Inside the existing IIFE in `home.js`, immediately before the `initStage();` call, add:

```javascript
    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            document.body.classList.add('is-loaded');
        });
    });
```

The double rAF guarantees the browser has painted the clipped initial state before the class flips, so the transition actually runs.

- [ ] **Step 3: Add the `wipe` class to the section headers in `index.html`**

For each of the four `<div class="section-header">` blocks (Apps, Creative, Contact) and the About block, add `wipe` alongside the existing `scroll-reveal` class. For example, change:

```html
                <h2 class="section-label scroll-reveal">Apps</h2>
                <p class="section-title scroll-reveal">Handcrafted with intention.</p>
                <p class="section-subtitle scroll-reveal">Apps designed for people who need their computers to work for them, not to suck them in with the sole purpose of "driving stakeholder value".</p>
```

to:

```html
                <h2 class="section-label scroll-reveal wipe">Apps</h2>
                <p class="section-title scroll-reveal wipe">Handcrafted with intention.</p>
                <p class="section-subtitle scroll-reveal wipe">Apps designed for people who need their computers to work for them, not to suck them in with the sole purpose of "driving stakeholder value".</p>
```

Apply the same change to the Creative and Contact section headers, and to the `<h2 class="section-label">About</h2>` line (which has no `scroll-reveal`, so add both classes there).

- [ ] **Step 4: Verify the guard passes**

Run: `python3 tools/check-isolation.py`

Expected: `PASS`, exit 0.

- [ ] **Step 5: Verify in the browser**

Run: `./cache-bust.sh && open index.html`

Expected on load: the hero title wipes in from the left, then the tagline follows shortly after.

Expected on scroll: each section header wipes in left to right, staggered by line, as it enters the viewport.

- [ ] **Step 6: Verify reduced motion**

Enable Reduce motion, reload.

Expected: text fades in rather than wiping. No text is permanently invisible. Turn the setting back off.

- [ ] **Step 7: Commit**

```bash
git add home.css home.js index.html apps/
git commit -m "Replace homepage fades with clip-path reveal wipes"
```

---

### Task 7: Apps card stack

**Files:**
- Modify: `index.html` (the eight `<article class="app-feature">` blocks)
- Modify: `home.css`

**Interfaces:**
- Consumes: tokens from Task 2, `.btn-dot` from Task 3, `.wipe` from Task 6
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Restructure the first app card in `index.html`**

Replace the Quick Reviews `<article>` with:

```html
                <article class="app-card scroll-reveal">
                    <div class="app-card-head">
                        <div class="app-card-icon">
                            <img src="images/quick-reviews.png" alt="Quick Reviews icon" class="app-icon" style="view-transition-name: quick-reviews-icon;">
                        </div>
                        <div class="app-card-shot">
                            <img src="images/quick-reviews-main.png" alt="Quick Reviews app screenshot" class="app-screenshot">
                        </div>
                    </div>
                    <div class="app-card-body">
                        <div class="app-card-title">
                            <h3 class="app-name">Quick Reviews</h3>
                            <p class="app-award"><a href="https://www.macstories.net/stories/macstories-selects-2025-recognizing-the-best-apps-of-the-year/#best-new-app" target="_blank" rel="noopener noreferrer">MacStories Best New App of 2025 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></p>
                        </div>
                        <p class="app-card-copy">Review the things you love and share them to social media.</p>
                        <div class="app-card-link">
                            <a href="apps/quick-reviews/" class="btn-dot">Learn more</a>
                        </div>
                    </div>
                </article>
```

- [ ] **Step 2: Restructure the remaining seven app cards**

Apply the identical structure to each. The full set, in page order, with their exact icon, screenshot, name, and description values:

| Icon `src` | `view-transition-name` | Screenshot `src` | Name | Description | Link |
| --- | --- | --- | --- | --- | --- |
| `images/quick-reads-icon.svg` | `quick-reads-icon` | `images/quick-reads-hero.png` | Quick Reads | A beautiful read-later service for the articles that matter. Save from anywhere, highlight what resonates, and build your personal library. | `apps/quick-reads/` |
| `images/chapterpod.png` | `chapterpod-icon` | `images/quick-chapters-main.png` | Chapterize | Create professional podcast chapters with titles, images, and links while you listen, all on your Apple devices. | `apps/chapterpod/` |
| `images/yearly run goals.png` | `yearly-run-goals-icon` | `images/yearly-run-tracker-main.png` | Yearly Run Goals | Set, track, and achieve yearly distance goals for running, walking, cycling, or swimming. | `apps/yearly-run-goals/` |
| `images/quick subtitles.png` | `quick-subtitles-icon` | `images/quick-subtitles-main.png` | Quick Subtitles | Transcribe audio and video to text or SRT subtitles using fast, private, on-device AI. | `apps/quick-subtitles/` |
| `images/quick notes.png` | `quick-notes-icon` | `images/quick-notes-main.png` | Quick Notes | Turn your voice into high-quality text using Apple's on-device language models. | `apps/quick-notes/` |
| `images/typefully-icon.png` | `weave-icon` | `images/weave-main.png` | Weave | A native iOS app for Typefully. Write threads, schedule posts, and publish everywhere. | `apps/weave/` |
| `images/best-o-masto.png` | `best-o-masto-icon` | `images/best-o-masto-main.png` | Best-o-Masto | Catch up without getting sucked in. Mastodon, efficiently. | `apps/best-o-masto/` |

Only Quick Reviews has an `app-award` paragraph. For the other seven, the `app-card-title` div contains only the `<h3 class="app-name">`.

Note the Chapterize description: the original used an em dash before "all on your Apple devices". It is replaced with a comma per the project-wide no-em-dash rule.

Remove the now-unused `app-feature-reverse` classes entirely. There is no alternation in this layout.

- [ ] **Step 3: Append the card styles to `home.css`**

```css
/* ---------- Apps card stack ---------- */

.calm .apps-showcase {
    display: flex;
    flex-direction: column;
    gap: clamp(1rem, 2vw, 2rem);
}

.calm .app-card {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.calm .app-card-head,
.calm .app-card-body {
    background: var(--color-card);
    border-radius: var(--radius-card);
    padding: var(--pad-card);
}

.calm .app-card-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: center;
    gap: clamp(1.5rem, 4vw, 4rem);
}

.calm .app-card-icon {
    display: grid;
    place-items: center;
}

.calm .app-card-icon .app-icon {
    width: clamp(72px, 12vw, 140px);
    height: auto;
    border-radius: 22%;
}

.calm .app-card-shot {
    border-radius: var(--radius-image);
    overflow: hidden;
}

.calm .app-card-shot .app-screenshot {
    display: block;
    width: 100%;
    height: auto;
    cursor: zoom-in;
}

.calm .app-card-body {
    display: grid;
    grid-template-columns: minmax(0, 20rem) minmax(0, 1fr) auto;
    align-items: start;
    gap: clamp(1.5rem, 4vw, 4rem);
    font-weight: 700;
}

.calm .app-card-title .app-name {
    font-size: clamp(1.4rem, 2.4vw, 1.75rem);
    line-height: 1.5;
    font-weight: 700;
    margin: 0;
}

.calm .app-card-title .app-award {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    font-weight: 400;
}

.calm .app-card-title .app-award a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--accent);
}

.calm .app-card-copy {
    margin: 0;
    line-height: 1.76;
    letter-spacing: -0.02em;
    font-weight: 400;
}

.calm .app-card-link {
    display: flex;
    justify-content: flex-end;
}

@media (max-width: 900px) {
    .calm .app-card-head,
    .calm .app-card-body {
        grid-template-columns: minmax(0, 1fr);
        gap: 1.5rem;
    }

    .calm .app-card-icon {
        justify-items: start;
    }

    .calm .app-card-link {
        justify-content: flex-start;
    }
}
```

- [ ] **Step 4: Verify the guard passes**

Run: `python3 tools/check-isolation.py`

Expected: `PASS`, exit 0.

- [ ] **Step 5: Verify every app still links and transitions correctly**

Run: `./cache-bust.sh && open index.html`

In the browser console:

```javascript
document.querySelectorAll('.app-card').length
```

Expected: `8`

```javascript
Array.from(document.querySelectorAll('.app-card .app-icon'))
     .map(i => i.style.viewTransitionName)
```

Expected: an array of eight non-empty names matching the table in Step 2, with no empty strings.

- [ ] **Step 6: Verify the lightbox still works**

Click any screenshot.

Expected: the lightbox opens with the full-size image. Escape or a click closes it. This confirms the inline script's `.app-screenshot` selector still matches after the restructure.

- [ ] **Step 7: Verify layout**

Expected at 1440px: every card has an identical rhythm, icon left and screenshot right in the head, and title / copy / right-aligned pill link in the body. No left-right alternation.

Expected at 375px: each card collapses to a single column, the link is left-aligned, and nothing overflows.

- [ ] **Step 8: Commit**

```bash
git add home.css index.html apps/
git commit -m "Rebuild apps section as a fixed-column card stack"
```

---

### Task 8: Parallax screenshot band

**Files:**
- Modify: `index.html` (insert band between the Apps and Creative sections)
- Modify: `home.css`
- Modify: `home.js`

**Interfaces:**
- Consumes: tokens from Task 2
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Insert the band markup in `index.html`**

Between the closing `</section>` of `#apps` and the opening `<section id="creative">`, insert:

```html
    <div class="band" aria-hidden="true">
        <div class="band-col" data-speed="0.10">
            <img src="images/quick-reviews-main.png" alt="">
            <img src="images/quick-reads-reader.jpg" alt="">
        </div>
        <div class="band-col" data-speed="-0.16">
            <img src="images/quick-notes-hero.jpg" alt="">
            <img src="images/weave-threads.png" alt="">
        </div>
        <div class="band-col" data-speed="0.22">
            <img src="images/quick-subtitles-hero.jpeg" alt="">
            <img src="images/yearly-run-tracker-insights.png" alt="">
        </div>
        <div class="band-col" data-speed="-0.12">
            <img src="images/chapter-details.png" alt="">
            <img src="images/best-o-masto-main.png" alt="">
        </div>
        <div class="band-col" data-speed="0.18">
            <img src="images/quick-reads-queue.jpg" alt="">
            <img src="images/quick-notes-writer.jpg" alt="">
        </div>
        <div class="band-col" data-speed="-0.20">
            <img src="images/quick-reviews-example-1.jpg" alt="">
            <img src="images/transcript-view.png" alt="">
        </div>
    </div>
```

The band is `aria-hidden` because it is purely decorative. Every image in it also appears, captioned, elsewhere on the site.

- [ ] **Step 2: Append the band styles to `home.css`**

```css
/* ---------- Parallax screenshot band ---------- */

.calm .band {
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1440 / 550;
    overflow: hidden;
    background: var(--color-card);
    margin: var(--gap-section) 0;
}

.calm .band::before {
    content: "";
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1;
}

.calm .band-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 16.6667%;
    flex: 0 0 16.6667%;
    padding: 0 0.5rem;
    align-self: flex-start;
    will-change: transform;
}

.calm .band-col:nth-child(2n) {
    align-self: flex-end;
}

.calm .band-col img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius-image);
    object-fit: cover;
}

@media (max-width: 768px) {
    .calm .band {
        aspect-ratio: 390 / 340;
    }

    .calm .band-col {
        width: 33.3333%;
        flex: 0 0 33.3333%;
    }

    .calm .band-col:nth-child(n + 4) {
        display: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .calm .band-col {
        transform: none !important;
        will-change: auto;
    }
}
```

- [ ] **Step 3: Append the band module to `home.js`, inside the IIFE, before `initStage();`**

```javascript
    function initBand() {
        var band = document.querySelector('.band');
        if (!band || reduceMotion.matches) { return; }

        var cols = Array.prototype.slice.call(band.querySelectorAll('.band-col'));
        if (!cols.length) { return; }

        var frame = null;
        var visible = false;

        function update() {
            frame = null;
            if (!visible) { return; }

            var box = band.getBoundingClientRect();
            // -1 when the band is just below the viewport, +1 when just above.
            var progress = (window.innerHeight / 2 - (box.top + box.height / 2)) /
                           ((window.innerHeight + box.height) / 2);

            cols.forEach(function (col) {
                var speed = parseFloat(col.getAttribute('data-speed')) || 0;
                var shift = progress * speed * box.height;
                col.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
            });
        }

        function schedule() {
            if (frame === null) {
                frame = window.requestAnimationFrame(update);
            }
        }

        // Only run the scroll handler while the band is actually on screen.
        var io = new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible) { schedule(); }
        }, { rootMargin: '100px' });
        io.observe(band);

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        schedule();
    }

    initBand();
```

- [ ] **Step 4: Verify the guard passes**

Run: `python3 tools/check-isolation.py`

Expected: `PASS`, exit 0.

- [ ] **Step 5: Verify the band**

Run: `./cache-bust.sh && open index.html`

Scroll past the Apps section.

Expected at 1440px: a full-width band of six screenshot columns under a dark scrim. Alternate columns are anchored to the opposite vertical edge. As you scroll, columns drift at visibly different rates and in opposing directions. No gaps appear at the top or bottom of the band at any scroll position.

Expected at 375px: three columns, shorter band, still parallaxing.

- [ ] **Step 6: Verify reduced motion**

Enable Reduce motion, reload, scroll past the band.

Expected: the band renders with no column movement at all. Turn the setting back off.

- [ ] **Step 7: Verify every band image resolves**

In the browser console:

```javascript
Array.from(document.querySelectorAll('.band-col img')).filter(i => !i.naturalWidth)
```

Expected: an empty array. A non-empty result means one of the filenames in Step 1 is wrong.

- [ ] **Step 8: Commit**

```bash
git add home.css home.js index.html apps/
git commit -m "Add parallax screenshot band between apps and creative sections"
```

---

### Task 9: Text shuffle on section labels

**Files:**
- Modify: `home.js`
- Modify: `home.css`

**Interfaces:**
- Consumes: `.section-label` elements in `index.html`
- Produces: nothing consumed by later tasks

**Constraint from the spec:** applies only to `.section-label` elements (Apps, Creative, About, Contact). Never to app names, descriptions, body headings, or the hero tagline. Fires once on first reveal, never on hover. This containment exists because the site uses Atkinson Hyperlegible Next, a typeface chosen for legibility, and scrambling letters works against that.

- [ ] **Step 1: Append the shuffle module to `home.js`, inside the IIFE, before `initStage();`**

```javascript
    function initShuffle() {
        // Deliberately scoped to section labels only. Do not widen this
        // selector: scrambling body copy fights the legibility typeface.
        var labels = Array.prototype.slice.call(
            document.querySelectorAll('.section-label')
        );
        if (!labels.length || reduceMotion.matches) { return; }

        var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+=@';
        var DURATION = 600;   // ms for the whole word to settle
        var SETTLE = 0.55;    // fraction of DURATION each char stays scrambled

        function randomGlyph() {
            return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
        }

        function shuffle(el) {
            if (el.dataset.shuffled === 'true') { return; }
            el.dataset.shuffled = 'true';

            var text = el.textContent;
            var start = null;

            function step(now) {
                if (start === null) { start = now; }
                var elapsed = now - start;
                var out = '';
                var settled = 0;

                for (var i = 0; i < text.length; i++) {
                    var ch = text.charAt(i);
                    if (ch === ' ') {
                        out += ' ';
                        settled++;
                        continue;
                    }
                    // Each character settles a little later than the one
                    // before it, producing a left-to-right resolve.
                    var charStart = (i / text.length) * DURATION * SETTLE;
                    if (elapsed >= charStart + DURATION * (1 - SETTLE)) {
                        out += ch;
                        settled++;
                    } else if (elapsed >= charStart) {
                        out += randomGlyph();
                    } else {
                        out += randomGlyph();
                    }
                }

                el.textContent = out;

                if (settled < text.length) {
                    window.requestAnimationFrame(step);
                } else {
                    el.textContent = text;
                }
            }

            window.requestAnimationFrame(step);
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    shuffle(entry.target);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        labels.forEach(function (label) { io.observe(label); });
    }

    initShuffle();
```

- [ ] **Step 2: Stabilize label width so shuffling does not reflow the layout**

Append to `home.css`:

```css
/* Scrambled glyphs have different widths than the real ones, so the label
   is given tabular figures and a reserved minimum width to stop the
   surrounding layout from jittering mid-animation. */
.calm .section-label {
    display: inline-block;
    min-width: 6ch;
    font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: Verify the guard passes**

Run: `python3 tools/check-isolation.py`

Expected: `PASS`, exit 0.

- [ ] **Step 4: Verify the shuffle**

Run: `./cache-bust.sh && open index.html`

Scroll slowly to each section.

Expected: the small label above each section title (Apps, Creative, About, Contact) scrambles briefly and resolves left to right in roughly 600ms. It fires once. Scrolling away and back does not re-trigger it. Nothing else on the page scrambles.

- [ ] **Step 5: Verify no layout shift**

Watch the section title directly beneath each label while it resolves.

Expected: the title does not move horizontally or vertically during the animation.

- [ ] **Step 6: Verify final text is correct**

In the browser console, after scrolling through the whole page:

```javascript
Array.from(document.querySelectorAll('.section-label')).map(e => e.textContent)
```

Expected: `["Apps", "Creative", "About", "Contact"]` with no leftover glyphs.

- [ ] **Step 7: Verify reduced motion**

Enable Reduce motion, reload, scroll through.

Expected: labels render as plain text immediately with no scrambling. Turn the setting back off.

- [ ] **Step 8: Commit**

```bash
git add home.css home.js index.html apps/
git commit -m "Add contained text shuffle to homepage section labels"
```

---

### Task 10: Creative, About, and Contact as cards

**Files:**
- Modify: `home.css`
- Modify: `index.html` (Creative section markup)

**Interfaces:**
- Consumes: tokens from Task 2, `.btn-dot` from Task 3
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Convert the Creative cards to editorial rows in `index.html`**

Replace the `<div class="content-grid">` block and both `<article class="content-card">` children with:

```html
            <div class="creative-rows">
                <article class="creative-row scroll-reveal">
                    <div class="creative-row-thumb">
                        <img src="images/ABC_header.png" alt="A Better Computer YouTube channel">
                    </div>
                    <div class="creative-row-label">
                        <span class="content-label">YouTube</span>
                        <h3 class="content-title">A Better Computer</h3>
                    </div>
                    <p class="creative-row-copy">Software tutorials, and, well, as the name implies, just a bunch of ways I think you can make yourself a better computer.</p>
                    <div class="creative-row-link">
                        <a href="https://www.youtube.com/@ABetterComputer" target="_blank" rel="noopener noreferrer" class="btn-dot">Visit Channel</a>
                    </div>
                </article>

                <article class="creative-row scroll-reveal">
                    <div class="creative-row-thumb">
                        <img src="images/birchtree-icon.png" alt="Birchtree blog">
                    </div>
                    <div class="creative-row-label">
                        <span class="content-label">Blog</span>
                        <h3 class="content-title">Birchtree</h3>
                    </div>
                    <p class="creative-row-copy">My personal blog about tech, Apple, and generally whatever else I want to talk about. Running since 2010.</p>
                    <div class="creative-row-link">
                        <a href="https://birchtree.me" target="_blank" rel="noopener noreferrer" class="btn-dot">Read Blog</a>
                    </div>
                </article>
            </div>
```

The second card previously used a purple gradient block as its visual. That gradient is removed per the accent decision, so the Birchtree icon stands in.

- [ ] **Step 2: Append the section styles to `home.css`**

```css
/* ---------- Creative rows ---------- */

.calm .creative-rows {
    background: var(--color-card);
    border-radius: var(--radius-card);
    padding: var(--pad-card);
}

.calm .creative-row {
    display: grid;
    grid-template-columns: 6rem minmax(0, 14rem) minmax(0, 1fr) auto;
    align-items: center;
    gap: clamp(1rem, 3vw, 3rem);
    padding: 2rem 0;
    background: none;
    border-radius: 0;
}

.calm .creative-row + .creative-row {
    border-top: 1px solid #d7dbe2;
}

.calm .creative-row-thumb img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 1rem;
}

.calm .creative-row-label .content-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #86868b;
    margin-bottom: 0.3rem;
}

.calm .creative-row-label .content-title {
    font-size: clamp(1.2rem, 2vw, 1.5rem);
    font-weight: 700;
    margin: 0;
}

.calm .creative-row-copy {
    margin: 0;
    line-height: 1.76;
    letter-spacing: -0.02em;
}

.calm .creative-row-link {
    display: flex;
    justify-content: flex-end;
}

/* ---------- About ---------- */

.calm .about-wrapper {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: center;
    gap: clamp(1.5rem, 4vw, 4rem);
    padding: var(--pad-card);
}

.calm .about-photo .headshot {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius-image);
}

.calm .about-title {
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0.5rem 0 1rem;
}

.calm .about-text {
    line-height: 1.76;
    letter-spacing: -0.02em;
}

/* ---------- Contact ---------- */

.calm .contact-section .contact-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
}

.calm .contact-btn svg {
    width: 1.1rem;
    height: 1.1rem;
}

/* ---------- Footer ---------- */

.calm .footer {
    background: var(--color-card);
    border-radius: var(--radius-card);
    margin: var(--gap-section) clamp(0.5rem, 1.5vw, 1rem) clamp(0.5rem, 1.5vw, 1rem);
    border-top: none;
}

@media (max-width: 900px) {
    .calm .creative-row {
        grid-template-columns: 4rem minmax(0, 1fr);
        grid-template-areas:
            "thumb label"
            "copy copy"
            "link link";
        gap: 1rem;
    }

    .calm .creative-row-thumb { grid-area: thumb; }
    .calm .creative-row-label { grid-area: label; }
    .calm .creative-row-copy { grid-area: copy; }
    .calm .creative-row-link { grid-area: link; justify-content: flex-start; }

    .calm .about-wrapper {
        grid-template-columns: minmax(0, 1fr);
    }

    .calm .about-photo {
        max-width: 12rem;
    }
}
```

- [ ] **Step 3: Verify the guard passes**

Run: `python3 tools/check-isolation.py`

Expected: `PASS`, exit 0.

- [ ] **Step 4: Verify in the browser**

Run: `./cache-bust.sh && open index.html`

Expected at 1440px: Creative is a single white card containing two rows separated by a hairline, each row reading thumbnail / label / copy / right-aligned link. About is a white card with the headshot left and text right. The footer is a white rounded card. No purple gradient block anywhere.

Expected at 375px: Creative rows stack into thumbnail-and-label on one line with copy and link beneath. About stacks with a constrained headshot.

- [ ] **Step 5: Verify no dead images**

In the browser console:

```javascript
Array.from(document.images).filter(i => !i.naturalWidth).map(i => i.src)
```

Expected: an empty array.

- [ ] **Step 6: Commit**

```bash
git add home.css index.html apps/
git commit -m "Restyle creative, about, and contact sections as calm cards"
```

---

### Task 11: Documentation and final verification

**Files:**
- Modify: `CLAUDE.md`
- Verify: everything

**Interfaces:**
- Consumes: all prior tasks
- Produces: the finished feature

- [ ] **Step 1: Update `CLAUDE.md` so it stops mandating the removed treatments**

In the Design System section, change:

```markdown
- **Gradient**: `linear-gradient(135deg, rgb(136, 57, 239) 0%, #db2777 100%)`
```

to:

```markdown
- **Gradient**: `linear-gradient(135deg, rgb(136, 57, 239) 0%, #db2777 100%)` (app sub-pages only; the homepage uses no gradients)
```

In the "All Pages Must Include" section, change the heading of item 1 from:

```markdown
1. **Background shapes** - Floating colored blobs for visual interest
```

to:

```markdown
1. **Background shapes** (app sub-pages only) - Floating colored blobs for visual interest. The homepage (`index.html`) deliberately omits these; see `docs/superpowers/specs/2026-07-21-homepage-calm-redesign-design.md`.
```

Add a new section after the "CSS Cache Busting" section:

```markdown
## Homepage Styles

The homepage uses its own `home.css` and `home.js`, loaded only by
`index.html`, with every CSS rule scoped under `body.calm`. This keeps the
calm card architecture off the app sub-pages, which still use the original
`styles.css` treatment.

**Never modify `styles.css` when working on the homepage.** Run
`python3 tools/check-isolation.py` to verify isolation holds. It fails if any
rule in `home.css` is unscoped or if either homepage asset is referenced by a
sub-page.
```

Update the File Organization tree to include the new files:

```markdown
├── index.html              # Main landing page
├── home.css                # Homepage-only styles (scoped under body.calm)
├── home.js                 # Homepage-only behavior
├── styles.css              # Shared styles (app sub-pages)
├── cache-bust.sh           # Run after changing styles.css, home.css, or home.js
├── tools/
│   └── check-isolation.py  # Verifies homepage styles cannot reach sub-pages
```

- [ ] **Step 2: Run the isolation guard**

Run: `python3 tools/check-isolation.py`

Expected: `PASS: homepage styles are isolated`, exit 0.

- [ ] **Step 3: Prove `styles.css` was never touched across the whole feature**

Run:

```bash
git diff 76573d0 -- styles.css
```

Expected: no output. `76573d0` is the spec commit, immediately before implementation began.

- [ ] **Step 4: Prove the app sub-pages changed only in cache-bust query strings**

Run:

```bash
git diff 76573d0 -- apps/ | grep '^[+-]' | grep -v '^[+-][+-]' | grep -v -E '(styles|home)\.(css|js)\?v='
```

Expected: no output.

- [ ] **Step 5: Spot-check three app sub-pages visually**

Run:

```bash
open apps/quick-reads/index.html apps/chapterpod/index.html apps/best-o-masto/index.html
```

Expected: each renders exactly as before, with purple accents, background blobs, and gradients intact. None of the calm treatment leaks in.

- [ ] **Step 6: Full homepage pass at three widths**

Run: `open index.html`

Check at 1440px, 900px, and 375px:
- No horizontal scroll: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` returns `true`
- Nav pill visible and not overflowing
- Hero rings composed correctly, mark centered
- All eight app cards present with identical rhythm
- Parallax band renders and moves
- Creative, About, Contact, and footer are white cards on off-white
- No console errors

- [ ] **Step 7: Full reduced-motion pass**

Enable System Settings > Accessibility > Display > Reduce motion. Reload.

Expected:
- Hero rings static, no drag, no magnetic, default cursor
- Text fades rather than wipes, nothing permanently invisible
- Band columns do not move
- Section labels render as plain text, no scrambling
- All content readable and reachable

Turn the setting back off.

- [ ] **Step 8: Keyboard and accessibility pass**

Tab through the page from the top.

Expected:
- Focus ring is a visible purple outline on every interactive element
- Tab order is logical: nav links, then app card links in page order, then creative links, then contact links, then footer
- The decorative hero icons and band images are not in the tab order and are not announced (they are `aria-hidden`)
- Every app name is reachable as real text

- [ ] **Step 9: Run cache-bust one final time**

Run: `./cache-bust.sh`

Expected: three "Cache-busting" lines with the final hashes.

- [ ] **Step 10: Commit**

```bash
git add CLAUDE.md index.html apps/ home.css home.js
git commit -m "Document homepage style isolation and finalize calm redesign"
```

---

## Self-Review Notes

**Spec coverage check.** Every spec section maps to a task: Foundation to Task 2, Hero stage to Tasks 4 and 5, Nav and buttons to Task 3, Apps section to Task 7, Parallax band to Task 8, Text shuffle to Task 9, Remaining sections to Task 10, Housekeeping to Task 11. The style isolation strategy is Task 1 and is verified in Task 11. All six success criteria have explicit verification steps in Task 11.

**Deviation from spec, recorded.** The spec's style isolation section specified scoping inside the shared `styles.css`. This plan uses a separate `home.css` instead, still scoped under `.calm`. This is a strictly stronger form of the same guarantee: sub-pages cannot be affected because they do not load the file, and "was `styles.css` touched?" becomes a one-line check.

**Amendment to spec, requires sign-off.** The spec specified 4 outer / 3 mid / 1 inner icon distribution with drag on the inner ring only. Task 4 uses 3 / 3 / 2 and Task 5 grabs anywhere on the stage, rotating all three rings at different rates. A single-icon ring is a poor drag target, and a whole-stage grab is more discoverable.
