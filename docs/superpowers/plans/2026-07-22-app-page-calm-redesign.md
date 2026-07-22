# App Page Calm Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the homepage's calm design system to the app sub-pages via a self-contained, reusable `app.css` + `app.js`, and rebuild the Quick Reads page on it as the reference implementation without changing any copy.

**Architecture:** Two new root files (`app.css`, `app.js`), every CSS rule scoped under `body.calm-app`, mirroring the homepage's `home.css`/`.calm` isolation. Converted pages drop `styles.css` and their inline `<style>` block; `app.css` is self-contained (reset, tokens, components). Per-app theming is one custom property on the body. The isolation guard is generalized to check both scope tokens and both reference directions.

**Tech Stack:** Vanilla HTML/CSS/JS. Python 3 stdlib for the isolation guard and its test suite. No build step.

## Global Constraints

- Never use em dashes (`—`) in user-facing text. (Comments/plan text may.)
- Do not change any user-facing copy, pricing, links, meta tags, structured data, Plausible domain, canonical URL, or `view-transition-name` values on the Quick Reads page. Layout only.
- Every CSS rule in `app.css` must be scoped under a whole `.calm-app` class token. A `.calm` selector does NOT satisfy `.calm-app` and vice versa.
- `app.css`/`app.js` may be referenced only by HTML files under `apps/`. `home.css`/`home.js` may be referenced only by `index.html`. Neither set crosses over.
- All motion animates `transform`/`opacity`/`clip-path` only, stays within ~600ms for UI, and has a `prefers-reduced-motion: reduce` treatment.
- Content is visible by default; any hidden-then-revealed state is armed only after JS confirms it is running (`body.calm-app.is-armed`). The one exception is the hero icon entrance, which is a pure-CSS keyframe (no JS dependency, no strand risk) gated on `prefers-reduced-motion: no-preference`.
- No heartbeat on app pages (that is the homepage heart mark's joke). The app icon pops in once and rests still.
- No parallax band on app pages. Screenshots drift gently in-section instead.
- Accent color is ink only: labels, links, focus rings, hover dots, featured pricing border, hero title accent line. No gradients, blobs, or drop shadows.
- Run `./cache-bust.sh` after changing `app.css`/`app.js`/`home.css`/`home.js`/`styles.css`, before considering the work done.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `tools/check-isolation.py` (modify) | Scope-check any `(file, token)` pair; classify asset references in both directions. |
| `tools/test-check-isolation.py` (modify) | Add `.calm-app` scope cases and `classify_asset_reference` cases. |
| `app.css` (create) | Self-contained calm styling for app sub-pages, scoped under `.calm-app`. |
| `app.js` (create) | Reveal arming, scroll reveal, label shuffle, screenshot drift, pricing toggle, year fill. |
| `apps/quick-reads/index.html` (rewrite body + head links) | Quick Reads rebuilt on the calm system; copy preserved verbatim. |
| `cache-bust.sh` (modify) | Also cache-bust `app.css` and `app.js`. |

---

## Task 1: Generalize the isolation guard for two scope tokens and two reference directions

**Files:**
- Modify: `tools/check-isolation.py`
- Test: `tools/test-check-isolation.py`

**Interfaces:**
- Produces: `check_scoped_css_text(css_text, scope_token="calm") -> list[str]`; `check_home_css_text(css_text)` retained as a thin wrapper (token `"calm"`); `classify_asset_reference(asset, rel_path, is_index) -> str | None`.
- Consumes: existing `strip_comments`, `top_level_units`, `split_selector_list`, `mask_not_content`, `check_asset_references`.

- [ ] **Step 1: Add failing tests for the new behavior**

Append these cases and a new test section to `tools/test-check-isolation.py`. Add the scoped-token cases after the existing `property_at_rule_must_pass` case:

```python
# --- .calm-app scope token: scoped passes, unscoped fails ------------------
SCOPED_CASES = []


def scoped_case(name, kind, token, css):
    SCOPED_CASES.append((name, kind, token, css))


scoped_case(
    "calm_app_scoped_must_pass", "pass", "calm-app",
    ".calm-app .feature-card { color: red; }",
)
scoped_case(
    "calm_app_unscoped_must_fail", "fail", "calm-app",
    ".feature-card { color: red; }",
)
# Cross-token isolation: .calm is NOT .calm-app and vice versa.
scoped_case(
    "calm_does_not_satisfy_calm_app_must_fail", "fail", "calm-app",
    ".calm .thing { color: red; }",
)
scoped_case(
    "calm_app_does_not_satisfy_calm_must_fail", "fail", "calm",
    ".calm-app .thing { color: red; }",
)
scoped_case(
    "calm_app_body_scoped_must_pass", "pass", "calm-app",
    "body.calm-app { color: red; }",
)
```

Add the classify cases and wire both new sections into `run()`. Replace the `run()` function's final `print`/`return` block so it also exercises `SCOPED_CASES` and the classify cases:

```python
    # Scoped-token CSS tests (parameterized scope token).
    for name, kind, token, css in SCOPED_CASES:
        violations = check_isolation.check_scoped_css_text(css, token)
        got_fail = len(violations) > 0
        want_fail = kind == "fail"
        ok = got_fail == want_fail
        status = "ok" if ok else "FAILED"
        detail = f" violations={violations!r}" if not ok else ""
        print(f"[{status}] {name}{detail}")
        if not ok:
            failures.append(name)

    # Asset-reference classification (index vs apps/ direction rules).
    classify_cases = [
        ("home_css_by_index_ok", "home.css", "index.html", True, None),
        ("home_css_by_app_fails", "home.css", "apps/quick-reads/index.html", False,
         "home.css referenced by apps/quick-reads/index.html"),
        ("app_css_by_app_ok", "app.css", "apps/quick-reads/index.html", False, None),
        ("app_css_by_index_fails", "app.css", "index.html", True,
         "app.css referenced by index.html"),
        ("app_js_by_index_fails", "app.js", "index.html", True,
         "app.js referenced by index.html"),
    ]
    for name, asset, rel, is_index, expected in classify_cases:
        got = check_isolation.classify_asset_reference(asset, rel, is_index)
        ok = got == expected
        status = "ok" if ok else "FAILED"
        detail = f" got={got!r} expected={expected!r}" if not ok else ""
        print(f"[{status}] {name}{detail}")
        if not ok:
            failures.append(name)

    print()
    if failures:
        print(f"FAIL: {len(failures)} case(s) failed: {', '.join(failures)}")
        return 1
    total = len(CASES) + len(html_cases) + len(SCOPED_CASES) + len(classify_cases)
    print(f"PASS: all {total} cases behaved as expected")
    return 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 tools/test-check-isolation.py`
Expected: FAIL with `AttributeError` (no `check_scoped_css_text` / `classify_asset_reference`), or failing new cases.

- [ ] **Step 3: Generalize the guard**

In `tools/check-isolation.py`, replace the module-level `CALM_TOKEN_RE` definition with a builder, and thread a compiled token regex through `check_selector` and `walk`. Make these exact edits:

Replace:
```python
# Whole-token match for the .calm class: a literal ".calm" not immediately
# followed by another word character or hyphen (which would make it a
# different class, e.g. ".calmXtra" or ".calm-extra").
CALM_TOKEN_RE = re.compile(r"\.calm\b(?![\w-])")
```
with:
```python
def scope_token_re(token):
    """Whole-token matcher for a scope class like "calm" or "calm-app": a
    literal ".<token>" not immediately followed by another word character or
    hyphen (which would make it a different class, e.g. ".calmXtra" or
    ".calm-app-extra"). Because of the trailing guard, ".calm" does not match
    ".calm-app" and ".calm-app" does not match ".calm", so checking each file
    against its own token gives cross-token isolation for free."""
    return re.compile(r"\." + re.escape(token) + r"\b(?![\w-])")
```

Change `check_selector` to take the token regex:
```python
def check_selector(selector, violations, token_re):
    for part in split_selector_list(selector):
        part = part.strip()
        if not part:
            continue
        if token_re.search(mask_not_content(part)):
            continue
        if token_re.search(part):
            violations.append(
                f"selector scoped only inside a negation (:not()), which is "
                f"inverted and does not count as scoped: {part!r}"
            )
        else:
            violations.append(f"unscoped selector: {part!r}")
```

Change `walk` to take and forward the token regex:
```python
def walk(css, violations, token_re):
    for unit in top_level_units(css):
        if unit[0] == "statement":
            text = unit[1]
            if not text.startswith("@"):
                continue
            name = text.split()[0]
            if name in STATEMENT_SAFE_AT_RULES:
                continue
            violations.append(f"unsupported at-rule: {text!r}")
            continue

        _, selector, body = unit
        if selector.startswith("@"):
            name = selector.split()[0]
            if name in BLOCK_RECURSE_AT_RULES:
                walk(body, violations, token_re)
            elif name in BLOCK_OPAQUE_AT_RULES:
                continue
            else:
                violations.append(f"unsupported at-rule: {selector!r}")
        else:
            check_selector(selector, violations, token_re)
```

Replace `check_home_css_text` with a general version plus a back-compat wrapper:
```python
def check_scoped_css_text(css_text, scope_token="calm"):
    """Return a list of violation strings for CSS that must be fully scoped
    under a whole `.<scope_token>` class."""
    violations = []
    walk(strip_comments(css_text), violations, scope_token_re(scope_token))
    return violations


def check_home_css_text(css_text):
    """Back-compat wrapper: home.css is scoped under `.calm`."""
    return check_scoped_css_text(css_text, "calm")
```

Add the reference classifier (after `check_asset_references`):
```python
def classify_asset_reference(asset, rel_path, is_index):
    """Given one asset referenced (via href/src) by a file, return a violation
    string if that reference is not allowed, else None.

    Policy: home.css/home.js may be referenced only by index.html; app.css/
    app.js may be referenced only by files under apps/. rel_path is the file's
    path relative to the repo root, using forward slashes."""
    norm = rel_path.replace("\\", "/")
    under_apps = norm.startswith("apps/")
    if asset in ("home.css", "home.js"):
        return None if is_index else f"{asset} referenced by {rel_path}"
    if asset in ("app.css", "app.js"):
        return None if under_apps else f"{asset} referenced by {rel_path}"
    return None
```

Rewrite `main` to check both files and both reference directions:
```python
def main():
    violations = []

    # Scope checks. home.css must exist; app.css is optional until the first
    # app page is converted.
    home_css = ROOT / "home.css"
    if not home_css.exists():
        print("FAIL: home.css does not exist")
        return 1
    violations.extend(check_scoped_css_text(home_css.read_text(), "calm"))

    app_css = ROOT / "app.css"
    if app_css.exists():
        violations.extend(check_scoped_css_text(app_css.read_text(), "calm-app"))

    # Reference checks for all four managed assets, in both directions.
    root_index = ROOT / "index.html"
    managed = ("home.css", "home.js", "app.css", "app.js")
    for html in sorted(ROOT.rglob("*.html")):
        text = html.read_text()
        rel = str(html.relative_to(ROOT))
        is_index = html == root_index
        for asset in check_asset_references(text, assets=managed):
            problem = classify_asset_reference(asset, rel, is_index)
            if problem:
                violations.append(problem)

    if violations:
        print("FAIL: page styles are not isolated")
        for v in violations:
            print(f"  - {v}")
        return 1

    print("PASS: page styles are isolated")
    return 0
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 tools/test-check-isolation.py`
Expected: `PASS: all 30 cases behaved as expected` (20 original + 5 scoped + 5 classify).

Run: `python3 tools/check-isolation.py`
Expected: `PASS: page styles are isolated` (app.css absent is tolerated).

- [ ] **Step 5: Commit**

```bash
git add tools/check-isolation.py tools/test-check-isolation.py
git commit -m "Generalize isolation guard for app.css/.calm-app scope"
```

---

## Task 2: Create the self-contained `app.css`

**Files:**
- Create: `app.css`

**Interfaces:**
- Produces the class contract the HTML (Task 4) and JS (Task 3) rely on: `body.calm-app` + `--app-accent`; `.app-nav`/`.app-nav-brand`/`.app-nav-links`; `.btn-dot`/`.btn-fill`/`.download-buttons`; `.app-hero`/`.app-hero-inner`/`.app-hero-icon`/`.app-hero-title`/`.accent-line`/`.app-hero-subtitle`; `.hero-screenshot`; `.wipe` + `.is-armed`/`.is-loaded`/`.is-revealed-all`/`.revealed`; `.section`/`.section-header`/`.section-label`/`.section-title`/`.section-subtitle`; `.feature-row`/`.feature-flip`/`.feature-row-media` (drift target)/`.feature-title`/`.feature-description`; `.features-grid`/`.feature-card`/`.feature-card-icon`/`.feature-card-title`/`.feature-card-description`/`.feature-card-badge`; `.pricing-cards`/`.pricing-card`/`.pricing-card-featured`/`.pricing-toggle`/`.pricing-toggle-btn`/`.pricing-swap`/`.pricing-card-badge`/`.pricing-card-price`/`.pricing-card-period`/`.pricing-features`/`.pricing-save`/`.pricing-cta`; `.cta`/`.cta-copy`; `.app-footer`/`.app-footer-container`/`.app-footer-brand`/`.app-footer-links`/`.app-footer-sep`; `.scroll-reveal`.

- [ ] **Step 1: Write `app.css`**

Create `app.css` with exactly this content:

```css
/* Birchtree Productions - app sub-page calm styles.
   Loaded by app sub-pages under apps/ (never by index.html). Every rule is
   scoped under .calm-app so these styles cannot reach the homepage or leak
   between pages. Self-contained: reset, tokens, and components live here, so
   pages that load this drop styles.css entirely.
   Verified by tools/check-isolation.py. */

/* ---------- Reset (scoped) ---------- */
body.calm-app,
.calm-app *,
.calm-app *::before,
.calm-app *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body.calm-app {
    /* Surfaces */
    --color-ground: #f7f7f7;
    --color-card: #ffffff;
    --color-panel: #f0f0f2;
    --color-text: #1d1d1f;
    --color-text-secondary: #6e6e73;
    --color-border: #d7dbe2;

    /* Ink (accent is per-app, defaults to the brand purple) */
    --accent: var(--app-accent, rgb(136, 57, 239));

    /* Radii */
    --radius-panel: 2.4rem;
    --radius-card: 2rem;
    --radius-image: 1.5rem;
    --radius-pill: 99999px;

    /* Rhythm */
    --pad-card: clamp(1.5rem, 4vw, 4rem);
    --gap-section: clamp(2rem, 5vw, 5rem);

    /* Type */
    --font-sans: 'Atkinson Hyperlegible Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-display: 'Fraunces', Georgia, serif;

    background-color: var(--color-ground);
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: 1rem;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.calm-app img {
    display: block;
    max-width: 100%;
}

.calm-app a {
    color: inherit;
    text-decoration: none;
}

.calm-app :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
}

/* ---------- Pill nav ---------- */
.calm-app .app-nav {
    position: fixed;
    top: clamp(1rem, 2.5vw, 2.4rem);
    left: 50%;
    transform: translateX(-50%);
    width: auto;
    max-width: calc(100vw - 2rem);
    background: var(--color-card);
    border-radius: var(--radius-pill);
    z-index: 5000;
}

.calm-app .app-nav-container {
    display: flex;
    align-items: center;
    gap: clamp(1rem, 2vw, 2rem);
    padding: clamp(0.6rem, 1.2vw, 0.9rem) clamp(1rem, 2.5vw, 1.6rem);
}

.calm-app .app-nav-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: clamp(0.85rem, 1.4vw, 1rem);
    font-weight: 700;
    white-space: nowrap;
}

.calm-app .app-nav-brand img {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 22%;
}

.calm-app .app-nav-links {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 1.6vw, 1.4rem);
    list-style: none;
}

.calm-app .app-nav-links a {
    font-size: clamp(0.75rem, 1.1vw, 0.875rem);
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

@media (max-width: 640px) {
    .calm-app .app-nav-brand span {
        display: none;
    }
}

/* ---------- Pill buttons ---------- */
.calm-app .btn-dot,
.calm-app .btn-fill {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.9rem 1.4rem;
    border-radius: var(--radius-pill);
    font-size: clamp(0.8rem, 1.1vw, 0.95rem);
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: border-color 0.25s ease, background-color 0.25s ease,
                transform 0.15s cubic-bezier(0.22, 1, 0.36, 1);
}

.calm-app .btn-dot {
    border: 1px solid #8c8c8c;
    background: var(--color-card);
    color: #000;
}

.calm-app .btn-dot::after {
    content: "";
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: #000;
    transition: background-color 0.25s ease, transform 0.25s ease;
}

.calm-app .btn-dot:hover {
    border-color: var(--accent);
}

.calm-app .btn-dot:hover::after {
    background: var(--accent);
    transform: scale(1.6);
}

.calm-app .btn-fill {
    border: 1px solid var(--color-text);
    background: var(--color-text);
    color: #fff;
}

.calm-app .btn-fill:hover {
    background: #000;
    border-color: #000;
}

.calm-app .download-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
}

.calm-app .download-buttons svg {
    width: 1.15rem;
    height: 1.15rem;
}

/* ---------- Hero (icon stage) ---------- */
.calm-app .app-hero {
    position: relative;
    margin: clamp(0.5rem, 1.5vw, 1rem);
    margin-top: clamp(6rem, 12vw, 9rem);
    padding: clamp(2.5rem, 6vw, 5rem) clamp(1.5rem, 4vw, 4rem);
    border-radius: var(--radius-panel);
    background: var(--color-panel);
    text-align: center;
}

.calm-app .app-hero-inner {
    max-width: 40rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
}

.calm-app .app-hero-icon {
    width: clamp(96px, 12vw, 148px);
    height: auto;
    border-radius: 22%;
}

/* Pure-CSS entrance: pops once on load, then rests. No JS dependency, so a
   script failure can never strand the icon invisible. Reduced motion skips it
   and the icon is simply present (default opacity/scale). */
@media (prefers-reduced-motion: no-preference) {
    .calm-app .app-hero-icon {
        animation: app-icon-pop 0.6s cubic-bezier(0.34, 1.25, 0.5, 1) both;
    }
}

@keyframes app-icon-pop {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
}

.calm-app .app-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.08;
}

.calm-app .accent-line {
    color: var(--accent);
}

.calm-app .app-hero-subtitle {
    font-size: clamp(1.05rem, 1.6vw, 1.25rem);
    color: var(--color-text-secondary);
    line-height: 1.6;
    max-width: 34rem;
}

.calm-app .hero-screenshot {
    margin: var(--gap-section) auto 0;
    max-width: 960px;
    padding: 0 clamp(0.5rem, 2vw, 1rem);
}

.calm-app .hero-screenshot img {
    width: 100%;
    border-radius: var(--radius-image);
    max-height: 620px;
    object-fit: cover;
    object-position: top;
}

/* ---------- Reveal wipes ---------- */
/* Fail-safe: .wipe copy is VISIBLE by default; the clip is armed only once
   app.js adds .is-armed. Section headers carry .scroll-reveal on an UNCLIPPED
   ancestor so the IntersectionObserver has a non-zero-area target (a
   zero-area clip-path element never reports isIntersecting in Chromium), and
   .revealed cascades down to the .wipe children. */
.calm-app.is-armed .wipe {
    clip-path: inset(0 100% 0 0);
    transition: clip-path 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.calm-app .section-header.scroll-reveal {
    opacity: 1;
    transform: none;
    transition: none;
}

.calm-app .section-header.revealed .wipe,
.calm-app .wipe.revealed,
.calm-app.is-loaded .app-hero .wipe,
.calm-app.is-revealed-all .wipe {
    clip-path: inset(0 0 0 0);
}

.calm-app .app-hero .app-hero-title.wipe { transition-delay: 0.3s; }
.calm-app .app-hero .app-hero-subtitle.wipe { transition-delay: 0.45s; }
.calm-app .section-header .wipe:nth-child(2) { transition-delay: 0.1s; }
.calm-app .section-header .wipe:nth-child(3) { transition-delay: 0.2s; }

@media (prefers-reduced-motion: reduce) {
    .calm-app .wipe {
        clip-path: none;
        opacity: 0;
        transition: opacity 0.4s ease;
    }

    .calm-app .section-header.revealed .wipe,
    .calm-app .wipe.revealed,
    .calm-app.is-loaded .app-hero .wipe,
    .calm-app.is-revealed-all .wipe {
        opacity: 1;
    }
}

/* ---------- Sections ---------- */
.calm-app .section {
    padding: var(--gap-section) clamp(0.5rem, 1.5vw, 1rem);
}

.calm-app .section-header {
    max-width: 46rem;
    margin: 0 auto var(--gap-section);
    text-align: center;
}

/* Scrambled glyphs are not the real glyph widths, so the label reserves space
   to stop the heading below it jittering while it shuffles. */
.calm-app .section-label {
    display: inline-block;
    min-width: 6ch;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 0.4rem;
}

.calm-app .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.calm-app .section-subtitle {
    font-size: clamp(1rem, 1.5vw, 1.15rem);
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0.75rem auto 0;
    max-width: 40rem;
}

/* ---------- Feature rows ---------- */
.calm-app .feature-row {
    max-width: 1000px;
    margin: 0 auto clamp(1rem, 2vw, 2rem);
    background: var(--color-card);
    border-radius: var(--radius-card);
    padding: var(--pad-card);
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: clamp(1.5rem, 4vw, 3.5rem);
}

.calm-app .feature-row.feature-flip .feature-row-media {
    order: -1;
}

.calm-app .feature-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 2.5vw, 2rem);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.calm-app .feature-description {
    font-size: clamp(1rem, 1.4vw, 1.1rem);
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin-top: 0.75rem;
}

.calm-app .feature-description a {
    color: var(--accent);
    text-decoration: underline;
}

.calm-app .feature-row-media {
    border-radius: var(--radius-image);
    overflow: hidden;
    will-change: transform;
}

.calm-app .feature-row-media img {
    width: 100%;
    border-radius: var(--radius-image);
    max-height: 480px;
    object-fit: cover;
    object-position: top;
}

/* ---------- Feature grid ---------- */
.calm-app .features-grid {
    max-width: 1000px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(1rem, 2vw, 1.5rem);
}

.calm-app .feature-card {
    background: var(--color-card);
    border-radius: var(--radius-card);
    padding: clamp(1.5rem, 3vw, 2rem);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.calm-app .feature-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 1rem;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.calm-app .feature-card-icon i {
    font-size: 24px;
    color: var(--accent);
}

.calm-app .feature-card-title {
    font-size: 1.15rem;
    font-weight: 700;
}

.calm-app .feature-card-description {
    font-size: 0.95rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
}

.calm-app .feature-card-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #16a34a;
}

/* Card cascade: armed (hidden) only when JS is running; visible otherwise. */
.calm-app.is-armed .feature-card.scroll-reveal {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.calm-app.is-armed .feature-card.scroll-reveal.revealed,
.calm-app.is-revealed-all .feature-card.scroll-reveal {
    opacity: 1;
    transform: translateY(0);
}

.calm-app .features-grid .feature-card:nth-child(1).revealed { transition-delay: 0s; }
.calm-app .features-grid .feature-card:nth-child(2).revealed { transition-delay: 0.06s; }
.calm-app .features-grid .feature-card:nth-child(3).revealed { transition-delay: 0.12s; }
.calm-app .features-grid .feature-card:nth-child(4).revealed { transition-delay: 0.18s; }
.calm-app .features-grid .feature-card:nth-child(5).revealed { transition-delay: 0.24s; }
.calm-app .features-grid .feature-card:nth-child(6).revealed { transition-delay: 0.30s; }

/* ---------- Pricing ---------- */
.calm-app .pricing-cards {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(1rem, 2vw, 1.5rem);
    justify-content: center;
    align-items: flex-start;
    max-width: 1000px;
    margin: 0 auto;
}

.calm-app .pricing-card {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    padding: clamp(1.5rem, 3vw, 2.25rem);
    width: 100%;
    max-width: 340px;
    text-align: center;
}

.calm-app .pricing-card-featured {
    border-color: var(--accent);
}

.calm-app .pricing-toggle {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    margin-bottom: 1.25rem;
}

.calm-app .pricing-toggle-btn {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border);
    background: var(--color-card);
    color: var(--color-text);
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease,
                transform 0.15s cubic-bezier(0.22, 1, 0.36, 1);
}

.calm-app .pricing-toggle-btn.active {
    background: var(--color-text);
    color: #fff;
    border-color: var(--color-text);
}

.calm-app .pricing-swap {
    transition: opacity 0.15s ease;
}

.calm-app .pricing-swap.swapping {
    opacity: 0;
}

.calm-app .pricing-card-badge {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 0.75rem;
}

.calm-app .pricing-save {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    padding: 0.1rem 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.7rem;
    margin-left: 0.35rem;
}

.calm-app .pricing-card-price {
    font-size: clamp(2.2rem, 5vw, 2.8rem);
    font-weight: 700;
    line-height: 1;
}

.calm-app .pricing-card-price .unit {
    font-size: 1rem;
    font-weight: 400;
    color: var(--color-text-secondary);
}

.calm-app .pricing-card-period {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin-top: 0.4rem;
}

.calm-app .pricing-features {
    list-style: none;
    margin: 1.5rem 0 0;
    padding: 0;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.calm-app .pricing-features li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
}

.calm-app .pricing-features li.is-off {
    opacity: 0.5;
}

.calm-app .pricing-cta {
    margin-top: 1.5rem;
}

.calm-app .pricing-cta .btn-dot,
.calm-app .pricing-cta .btn-fill {
    width: 100%;
    justify-content: center;
}

/* ---------- CTA ---------- */
.calm-app .cta {
    max-width: 1000px;
    margin: var(--gap-section) auto;
    background: var(--color-card);
    border-radius: var(--radius-card);
    padding: clamp(2.5rem, 6vw, 4rem) var(--pad-card);
    text-align: center;
}

.calm-app .cta-copy {
    font-size: clamp(1rem, 1.5vw, 1.15rem);
    color: var(--color-text-secondary);
    margin: 0.75rem auto 1.75rem;
    max-width: 34rem;
}

/* ---------- Footer ---------- */
.calm-app .app-footer {
    background: var(--color-card);
    border-radius: var(--radius-card);
    margin: var(--gap-section) clamp(0.5rem, 1.5vw, 1rem) clamp(0.5rem, 1.5vw, 1rem);
    padding: clamp(1.5rem, 3vw, 2rem) var(--pad-card);
}

.calm-app .app-footer-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    max-width: 1000px;
    margin: 0 auto;
}

.calm-app .app-footer-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
}

.calm-app .app-footer-brand img {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 22%;
}

.calm-app .app-footer-links {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
}

.calm-app .app-footer-links a {
    color: var(--color-text-secondary);
}

.calm-app .app-footer-links a:hover {
    color: var(--color-text);
}

.calm-app .app-footer-sep {
    color: var(--color-border);
}

/* ---------- Motion polish ---------- */
@media (prefers-reduced-motion: no-preference) {
    .calm-app .btn-dot:active,
    .calm-app .btn-fill:active,
    .calm-app .pricing-toggle-btn:active {
        transform: scale(0.97);
    }
}

@media (hover: hover) and (pointer: fine) {
    .calm-app .feature-card-icon {
        transition: transform 0.22s cubic-bezier(0.34, 1.25, 0.5, 1);
    }

    .calm-app .feature-card:hover .feature-card-icon {
        transform: scale(1.06) rotate(-2deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .calm-app .feature-card:hover .feature-card-icon {
        transform: none;
    }
}

/* ---------- Responsive ---------- */
@media (max-width: 768px) {
    .calm-app .feature-row {
        grid-template-columns: 1fr;
        gap: clamp(1.25rem, 4vw, 2rem);
    }

    .calm-app .feature-row .feature-row-media {
        order: -1;
    }

    .calm-app .features-grid {
        grid-template-columns: 1fr;
    }

    .calm-app .app-nav-links {
        display: none;
    }

    .calm-app .app-footer-container {
        flex-direction: column;
        text-align: center;
    }

    .calm-app .pricing-cards {
        flex-direction: column;
        align-items: center;
    }
}
```

- [ ] **Step 2: Verify scope isolation**

Run: `python3 tools/check-isolation.py`
Expected: `PASS: page styles are isolated`

- [ ] **Step 3: Commit**

```bash
git add app.css
git commit -m "Add self-contained calm app-page stylesheet"
```

---

## Task 3: Create `app.js`

**Files:**
- Create: `app.js`

**Interfaces:**
- Consumes DOM hooks from `app.css`/HTML: `body.calm-app`, `.scroll-reveal`, `.section-label`, `[data-drift]` (on `.feature-row-media`), `[data-plan]` toggle buttons, `[data-pricing-pane]` panes inside `.pricing-swap`, `#current-year`.
- Produces classes: `is-armed`, `is-loaded`, `is-revealed-all`, `revealed`, `swapping`, `active`; exposes `window.__calmAppReduceMotion` for verification.

- [ ] **Step 1: Write `app.js`**

Create `app.js` with exactly this content:

```javascript
/* Birchtree Productions - app sub-page behavior.
   Loaded by app sub-pages under apps/ (never by index.html). */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Arm reveal wipes and the card cascade. Until this runs, wipe copy is
    // plain visible text and cards sit at full opacity, so a script failure
    // can never leave content hidden.
    document.body.classList.add('is-armed');

    // Reveal hero copy on load (double rAF so the clip transition has a frame
    // to arm before it animates open).
    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            document.body.classList.add('is-loaded');
        });
    });

    // Fail-safe: if any element never receives .revealed (observer that never
    // fires, a browser quirk), reveal everything rather than leaving copy
    // clipped. A missed animation is a far smaller failure than missing text.
    window.setTimeout(function () {
        document.body.classList.add('is-revealed-all');
    }, 3000);

    function initReveal() {
        var targets = Array.prototype.slice.call(
            document.querySelectorAll('.scroll-reveal')
        );
        if (!targets.length) { return; }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.1 });

        targets.forEach(function (el) { io.observe(el); });
    }

    function initShuffle() {
        // Scoped to section labels only. Do not widen this: scrambling body
        // copy fights Atkinson Hyperlegible Next, chosen for legibility.
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
                    var charStart = (i / text.length) * DURATION * SETTLE;
                    if (elapsed >= charStart + DURATION * (1 - SETTLE)) {
                        out += ch;
                        settled++;
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

    function initDrift() {
        // Gentle scroll-linked float on feature screenshots: the parallax
        // band's DNA, applied per-image at a fraction of the amplitude.
        var items = Array.prototype.slice.call(
            document.querySelectorAll('[data-drift]')
        );
        if (!items.length || reduceMotion.matches) { return; }

        var MAX_SHIFT = 20;   // px cap so drift never collides with neighbors
        var frame = null;

        function update() {
            frame = null;
            var vh = window.innerHeight;
            items.forEach(function (el) {
                var box = el.getBoundingClientRect();
                if (box.bottom < 0 || box.top > vh) { return; }
                var factor = parseFloat(el.getAttribute('data-drift')) || 0;
                // -1 when just below the viewport, +1 just above.
                var progress = (vh / 2 - (box.top + box.height / 2)) /
                               ((vh + box.height) / 2);
                var shift = progress * factor * box.height;
                if (shift > MAX_SHIFT) { shift = MAX_SHIFT; }
                if (shift < -MAX_SHIFT) { shift = -MAX_SHIFT; }
                el.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
            });
        }

        function schedule() {
            if (frame === null) {
                frame = window.requestAnimationFrame(update);
            }
        }

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        schedule();
    }

    function initPricingToggle() {
        var buttons = Array.prototype.slice.call(
            document.querySelectorAll('[data-plan]')
        );
        if (!buttons.length) { return; }

        var swap = document.querySelector('.pricing-swap');
        var panes = Array.prototype.slice.call(
            document.querySelectorAll('[data-pricing-pane]')
        );

        function show(plan) {
            panes.forEach(function (p) {
                p.style.display =
                    p.getAttribute('data-pricing-pane') === plan ? '' : 'none';
            });
            buttons.forEach(function (b) {
                b.classList.toggle('active',
                    b.getAttribute('data-plan') === plan);
            });
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var plan = btn.getAttribute('data-plan');
                if (reduceMotion.matches || !swap) {
                    show(plan);
                    return;
                }
                swap.classList.add('swapping');
                window.setTimeout(function () {
                    show(plan);
                    void swap.offsetWidth;   // reflow so the fade-back animates
                    swap.classList.remove('swapping');
                }, 150);
            });
        });
    }

    function initYear() {
        var el = document.getElementById('current-year');
        if (el) { el.textContent = new Date().getFullYear(); }
    }

    initReveal();
    initShuffle();
    initDrift();
    initPricingToggle();
    initYear();

    window.__calmAppReduceMotion = reduceMotion;
}());
```

- [ ] **Step 2: Syntax-check**

Run: `node --check app.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "Add calm app-page behavior (reveal, shuffle, drift, pricing)"
```

---

## Task 4: Rebuild `apps/quick-reads/index.html` on the calm system + wire tooling

**Files:**
- Rewrite: `apps/quick-reads/index.html` (head asset links + entire `<body>`; `<head>` metadata/structured-data preserved)
- Modify: `cache-bust.sh`

**Interfaces:**
- Consumes every class from Task 2 (`app.css`) and the DOM hooks Task 3 (`app.js`) reads.

- [ ] **Step 1: Extend `cache-bust.sh`**

In `cache-bust.sh`, update the comment on line 3 and add two `bust` calls after `bust home.js`:

Change line 3 from:
```bash
# Run this after making changes to styles.css, home.css, or home.js.
```
to:
```bash
# Run this after making changes to styles.css, home.css, home.js, app.css, or app.js.
```

After the `bust home.js` line, add:
```bash
bust app.css
bust app.js
```

- [ ] **Step 2: Rewrite the Quick Reads page**

Replace the entire contents of `apps/quick-reads/index.html` with the following. All copy is carried over verbatim from the current page; only layout/classes change. Note the head changes: Fraunces added to the font link, the inline `<style>` block removed, `styles.css` replaced by `app.css`, and `smooth` scroll set inline on `<html>`.

```html
<!DOCTYPE html>
<html lang="en" style="scroll-behavior: smooth;">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="view-transition" content="same-origin">
    <title>Quick Reads - A Beautiful Read Later Service</title>
    <meta name="description" content="Save articles from the web and read them later in a beautiful, focused interface. Available on the web, iOS, and all major browsers. Developer-first with a full API.">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Quick Reads - A Beautiful Read Later Service">
    <meta property="og:description" content="Save articles from the web and read them later in a beautiful, focused interface. Available on the web, iOS, and all major browsers.">
    <meta property="og:image" content="https://quickreads.app/images/quick-reads.png">
    <meta property="og:url" content="https://quickreads.app">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Quick Reads - A Beautiful Read Later Service">
    <meta name="twitter:description" content="Save articles from the web and read them later in a beautiful, focused interface. Available on the web, iOS, and all major browsers.">
    <meta name="twitter:image" content="https://quickreads.app/images/quick-reads.png">

    <link rel="canonical" href="https://quickreads.app">
    <link rel="icon" href="../../images/quick-reads-icon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css">
    <link rel="stylesheet" href="../../app.css">
    <script defer data-domain="quickreads.app" src="https://plausible.io/js/script.js"></script>

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Quick Reads",
        "description": "A beautiful read later service. Save articles from the web and read them later in a focused, distraction-free interface.",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "iOS, Web",
        "offers": {
            "@type": "Offer",
            "price": "3.99",
            "priceCurrency": "USD",
            "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": "3.99",
                "priceCurrency": "USD",
                "billingDuration": "P1M"
            }
        },
        "author": {
            "@type": "Organization",
            "name": "Birchtree Productions, LLC"
        }
    }
    </script>
</head>
<body class="calm-app" style="--app-accent: #8b5cf6;">
    <!-- Navigation -->
    <nav class="app-nav">
        <div class="app-nav-container">
            <a href="../../" class="app-nav-brand">
                <img src="../../images/quick-reads-icon.svg" alt="Quick Reads" style="view-transition-name: quick-reads-icon;">
                <span>Quick Reads</span>
            </a>
            <ul class="app-nav-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
            </ul>
        </div>
    </nav>

    <main>
        <!-- Hero -->
        <header class="app-hero">
            <div class="app-hero-inner">
                <img src="../../images/quick-reads-icon.svg" alt="Quick Reads" class="app-hero-icon">
                <h1 class="app-hero-title wipe">
                    Save articles.<br>
                    Read them later.<br>
                    <span class="accent-line">Simple as that.</span>
                </h1>
                <p class="app-hero-subtitle wipe">
                    A beautiful, distraction-free space for the articles that matter. Save from anywhere, highlight what resonates, and build your personal library.
                </p>
                <div class="download-buttons">
                    <a href="https://quickreads.app" class="btn-fill">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                        Get Started Free
                    </a>
                </div>
            </div>
        </header>

        <div class="hero-screenshot">
            <img src="../../images/quick-reads-queue.jpg" alt="Your reading queue in Quick Reads" data-drift="0.06">
        </div>

        <!-- Feature: Beautiful Reading -->
        <section id="features" class="section">
            <div class="feature-row">
                <div class="feature-row-copy">
                    <p class="section-label">Reading Experience</p>
                    <h2 class="feature-title">Beautiful reading experience.</h2>
                    <p class="feature-description">
                        Articles are stripped down to just the words and images. Highlight passages and read free from distractions.
                    </p>
                </div>
                <div class="feature-row-media" data-drift="0.05">
                    <img src="../../images/quick-reads-reader.jpg" alt="Distraction-free article reader">
                </div>
            </div>
        </section>

        <!-- Feature: Obsidian Plugin -->
        <section class="section">
            <div class="feature-row feature-flip">
                <div class="feature-row-copy">
                    <p class="section-label">Obsidian Plugin</p>
                    <h2 class="feature-title">Highlights, synced to Obsidian.</h2>
                    <p class="feature-description">
                        Sync your highlights directly into Obsidian and connect them to your notes.
                    </p>
                </div>
                <div class="feature-row-media" data-drift="0.05">
                    <img src="../../images/quick-reads-obsidian.png" alt="Obsidian plugin for Quick Reads">
                </div>
            </div>
        </section>

        <!-- Feature Grid -->
        <section class="section">
            <div class="section-header scroll-reveal">
                <p class="section-label wipe">Everything You Need</p>
                <h2 class="section-title wipe">A focused set of features designed for thoughtful reading.</h2>
            </div>
            <div class="features-grid">
                <div class="feature-card scroll-reveal">
                    <div class="feature-card-icon">
                        <i class="ph ph-queue"></i>
                    </div>
                    <h3 class="feature-card-title">Reading Queue</h3>
                    <p class="feature-card-description">Save articles from anywhere and read them when you're ready, free from distractions.</p>
                </div>
                <div class="feature-card scroll-reveal">
                    <div class="feature-card-icon">
                        <i class="ph ph-bookmark-simple"></i>
                    </div>
                    <h3 class="feature-card-title">Highlights</h3>
                    <p class="feature-card-description">Mark the passages that matter. All your highlights in one place, easy to revisit.</p>
                </div>
                <div class="feature-card scroll-reveal">
                    <div class="feature-card-icon">
                        <i class="ph ph-code"></i>
                    </div>
                    <h3 class="feature-card-title">Full API</h3>
                    <p class="feature-card-description">Build your own tools, automations, and integrations with a complete REST API.</p>
                </div>
                <a class="feature-card scroll-reveal" href="https://chromewebstore.google.com/detail/quick-reads/ldopokalpolaeofalkgkmeeofojlgifc" target="_blank" rel="noopener noreferrer">
                    <span class="feature-card-badge">Available Now</span>
                    <div class="feature-card-icon">
                        <i class="ph ph-globe"></i>
                    </div>
                    <h3 class="feature-card-title">Chrome Extension</h3>
                    <p class="feature-card-description">Save articles with one click directly from your browser as you browse the web.</p>
                </a>
                <div class="feature-card scroll-reveal">
                    <span class="feature-card-badge">TestFlight Beta</span>
                    <div class="feature-card-icon">
                        <i class="ph ph-device-mobile"></i>
                    </div>
                    <h3 class="feature-card-title">iOS App</h3>
                    <p class="feature-card-description">Read anywhere with a native app designed for iPhone and iPad.</p>
                </div>
                <div class="feature-card scroll-reveal">
                    <span class="feature-card-badge">Available Now</span>
                    <div class="feature-card-icon">
                        <i class="ph ph-vault"></i>
                    </div>
                    <h3 class="feature-card-title">Obsidian Plugin</h3>
                    <p class="feature-card-description">Sync your highlights directly into Obsidian and connect them to your notes.</p>
                </div>
            </div>
        </section>

        <!-- Pricing -->
        <section id="pricing" class="section">
            <div class="section-header scroll-reveal">
                <p class="section-label wipe">Pricing</p>
                <h2 class="section-title wipe">Simple, honest pricing.</h2>
                <p class="section-subtitle wipe">Pick the plan that fits. Start with a free trial.</p>
            </div>
            <div class="pricing-cards">
                <div class="pricing-card">
                    <div class="pricing-card-badge">Basic</div>
                    <div class="pricing-card-price">$3.99<span class="unit"> /mo</span></div>
                    <div class="pricing-card-period">7-day free trial</div>
                    <ul class="pricing-features">
                        <li>
                            <svg viewBox="0 0 14 14" fill="none" stroke="var(--accent)" stroke-width="1.5" width="14" height="14"><polyline points="2.5 7.5 5.5 10.5 11.5 4"/></svg>
                            Unlimited saved articles
                        </li>
                        <li>
                            <svg viewBox="0 0 14 14" fill="none" stroke="var(--accent)" stroke-width="1.5" width="14" height="14"><polyline points="2.5 7.5 5.5 10.5 11.5 4"/></svg>
                            Unlimited highlights
                        </li>
                        <li>
                            <svg viewBox="0 0 14 14" fill="none" stroke="var(--accent)" stroke-width="1.5" width="14" height="14"><polyline points="2.5 7.5 5.5 10.5 11.5 4"/></svg>
                            Beautiful reading experience
                        </li>
                        <li>
                            <svg viewBox="0 0 14 14" fill="none" stroke="var(--accent)" stroke-width="1.5" width="14" height="14"><polyline points="2.5 7.5 5.5 10.5 11.5 4"/></svg>
                            Full API access
                        </li>
                        <li class="is-off">
                            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>
                            Text-to-speech
                        </li>
                        <li class="is-off">
                            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>
                            Webhooks
                        </li>
                    </ul>
                    <div class="pricing-cta">
                        <a href="https://quickreads.app" class="btn-dot">Get Basic</a>
                    </div>
                </div>
                <div class="pricing-card pricing-card-featured">
                    <div class="pricing-toggle">
                        <button class="pricing-toggle-btn active" data-plan="monthly">Monthly</button>
                        <button class="pricing-toggle-btn" data-plan="yearly">Yearly</button>
                    </div>
                    <div class="pricing-swap">
                        <div data-pricing-pane="monthly">
                            <div class="pricing-card-badge">Pro</div>
                            <div class="pricing-card-price">$5.99<span class="unit"> /mo</span></div>
                            <div class="pricing-card-period">7-day free trial</div>
                        </div>
                        <div data-pricing-pane="yearly" style="display: none;">
                            <div class="pricing-card-badge">Pro <span class="pricing-save">Save 17%</span></div>
                            <div class="pricing-card-price">$59.99<span class="unit"> /yr</span></div>
                            <div class="pricing-card-period">$5.00/mo &middot; 7-day free trial</div>
                        </div>
                    </div>
                    <ul class="pricing-features">
                        <li>
                            <svg viewBox="0 0 14 14" fill="none" stroke="var(--accent)" stroke-width="1.5" width="14" height="14"><polyline points="2.5 7.5 5.5 10.5 11.5 4"/></svg>
                            Everything in Basic
                        </li>
                        <li>
                            <svg viewBox="0 0 14 14" fill="none" stroke="var(--accent)" stroke-width="1.5" width="14" height="14"><polyline points="2.5 7.5 5.5 10.5 11.5 4"/></svg>
                            Text-to-speech
                        </li>
                        <li>
                            <svg viewBox="0 0 14 14" fill="none" stroke="var(--accent)" stroke-width="1.5" width="14" height="14"><polyline points="2.5 7.5 5.5 10.5 11.5 4"/></svg>
                            Webhooks
                        </li>
                        <li>
                            <svg viewBox="0 0 14 14" fill="none" stroke="var(--accent)" stroke-width="1.5" width="14" height="14"><polyline points="2.5 7.5 5.5 10.5 11.5 4"/></svg>
                            All future features
                        </li>
                    </ul>
                    <div class="pricing-cta">
                        <a href="https://quickreads.app" class="btn-fill">Get Pro</a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Final CTA -->
        <section class="section">
            <div class="cta">
                <h2 class="section-title">Ready to get started?</h2>
                <p class="cta-copy">
                    Save your first article in seconds. No credit card required.
                </p>
                <div class="download-buttons">
                    <a href="https://quickreads.app" class="btn-fill">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                        Get Started Free
                    </a>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
        <div class="app-footer-container">
            <a href="../../" class="app-footer-brand">
                <img src="../../images/quick-reads-icon.svg" alt="Quick Reads">
                <span>Quick Reads</span>
            </a>
            <div class="app-footer-links">
                <a href="https://quickreads.app/docs">API Docs</a>
                <span class="app-footer-sep">|</span>
                <a href="https://quickreads.app/privacy">Privacy Policy</a>
                <span class="app-footer-sep">|</span>
                <span>&copy; <span id="current-year"></span> Birchtree Productions, LLC</span>
            </div>
        </div>
    </footer>

    <script src="../../app.js" defer></script>
</body>
</html>
```

- [ ] **Step 3: Run cache-bust and the isolation guard**

Run: `./cache-bust.sh`
Expected: lines cache-busting `styles.css`, `home.css`, `home.js`, `app.css`, `app.js`, then `Done.` (This stamps `app.css`/`app.js` refs in the Quick Reads page with `?v=<hash>`.)

Run: `python3 tools/check-isolation.py`
Expected: `PASS: page styles are isolated`

Run: `python3 tools/test-check-isolation.py`
Expected: `PASS: all 30 cases behaved as expected`

- [ ] **Step 4: Verify copy preservation and no em dashes**

Run:
```bash
python3 - <<'PY'
import pathlib, sys
html = pathlib.Path("apps/quick-reads/index.html").read_text()
required = [
    "Save articles.", "Read them later.", "Simple as that.",
    "A beautiful, distraction-free space for the articles that matter. Save from anywhere, highlight what resonates, and build your personal library.",
    "Get Started Free", "Beautiful reading experience.",
    "Articles are stripped down to just the words and images. Highlight passages and read free from distractions.",
    "Highlights, synced to Obsidian.",
    "Sync your highlights directly into Obsidian and connect them to your notes.",
    "A focused set of features designed for thoughtful reading.",
    "Reading Queue", "Highlights", "Full API", "Chrome Extension", "iOS App",
    "Obsidian Plugin", "Available Now", "TestFlight Beta",
    "Simple, honest pricing.", "Pick the plan that fits. Start with a free trial.",
    "Unlimited saved articles", "Text-to-speech", "Webhooks", "All future features",
    "Everything in Basic", "Save 17%", "$3.99", "$5.99", "$59.99",
    "Ready to get started?", "Save your first article in seconds. No credit card required.",
    "API Docs", "Privacy Policy",
]
missing = [s for s in required if s not in html]
if missing:
    print("MISSING COPY:", missing); sys.exit(1)
if "—" in html:
    print("EM DASH FOUND"); sys.exit(1)
if "styles.css" in html:
    print("styles.css still referenced"); sys.exit(1)
print("OK: all copy present, no em dash, styles.css dropped")
PY
```
Expected: `OK: all copy present, no em dash, styles.css dropped`

- [ ] **Step 5: Visual smoke test (headless)**

Render the page to a PNG at desktop width and confirm the layout is intact (nav pill, hero panel with icon, screenshot, feature cards, pricing, cta, footer). Use the project's established headless approach (full-page flatten; the animation endpoints, drift, shuffle, hover, and pricing toggle are verified by the user in a real browser, per the calm-redesign verification notes).

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars \
  --screenshot="/private/tmp/claude-501/-Users-matt-Apps-birchtree-productions/b064d0e9-4679-4347-b061-030e7df1d112/scratchpad/quick-reads.png" \
  --window-size=1280,3200 --allow-file-access-from-files \
  "file://$(pwd)/apps/quick-reads/index.html"
```
Expected: a PNG is written; open it and confirm the calm layout. (Fonts/Phosphor icons load from CDNs and may be absent offline; that is expected in headless and not a layout failure.)

- [ ] **Step 6: Commit**

```bash
git add apps/quick-reads/index.html cache-bust.sh
git commit -m "Rebuild Quick Reads page on the calm app-page system"
```

---

## Genericity acceptance check (do before calling the plan done)

Confirm that converting a second app would be pure content edits: swap the
`--app-accent` value on `<body>`, the icon/screenshot `src`s, the copy, and
choose which blocks (feature rows, feature grid, pricing, cta) appear. If any
second-app conversion would require a new CSS rule in `app.css` beyond a
genuinely new optional block, note the gap. No code change required for this
check, it is a read-through of `app.css` against the template.

---

## Self-Review

**Spec coverage:**
- Shared `app.css`/`app.js` under `.calm-app`: Tasks 2, 3. ✓
- One-line per-app theming: `<body class="calm-app" style="--app-accent: #8b5cf6;">` in Task 4; `--accent: var(--app-accent, ...)` in Task 2. ✓
- Drop `styles.css` + inline block: Task 4 head rewrite + Step 4 assertion. ✓
- Icon-stage hero, pop then rest (no heartbeat): Task 2 `app-icon-pop` keyframe, no loop. ✓ (Deviation from spec's anim-ready/icon-go approach: replaced with a pure-CSS keyframe so a JS failure cannot strand the icon invisible. Same visual, strictly safer. Noted here intentionally.)
- Motion inventory (wipes, shuffle, drift, cascade, button/icon feedback, pricing swap): Tasks 2 + 3. ✓
- No parallax band: confirmed, drift used instead. ✓
- Guard extended + tests: Task 1. ✓
- cache-bust extended: Task 4 Step 1. ✓
- Copy verbatim + no em dash: Task 4 Step 4. ✓
- Reduced-motion + fail-safe visibility: Task 2 (`is-armed` gating, reduced-motion blocks) + Task 3 (fail-safe classes). ✓

**Placeholder scan:** No TBD/TODO; every code step contains full content. ✓

**Type/name consistency:** Class names in the HTML (Task 4) match `app.css` selectors (Task 2) and `app.js` query selectors (Task 3): `.scroll-reveal`, `.section-label`, `[data-drift]`, `[data-plan]`, `[data-pricing-pane]`, `.pricing-swap`, `#current-year` all cross-check. Guard function names (`check_scoped_css_text`, `classify_asset_reference`) match between `check-isolation.py` and its test file. ✓
