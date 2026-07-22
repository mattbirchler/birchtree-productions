#!/usr/bin/env python3
"""Verify homepage styles cannot affect app sub-pages.

Two guarantees:
  1. Every rule in home.css is scoped under a whole `.calm` class token, so
     the file cannot leak styles even if some page loads it by accident.
  2. home.css and home.js are referenced (via href=/src=) only by index.html.

Run from anywhere: python3 tools/check-isolation.py

The parsing/checking logic below is importable (see tools/test-check-isolation.py)
so it can be exercised against fixture strings without touching the filesystem.

Threat model: this guard catches accidental unscoped rules written by a human
or agent editing home.css - the ordinary way this file could leak styles onto
app sub-pages. It is not a defense against deliberately smuggled styles, and
does not try to be. Two gaps are known and accepted rather than fixed:
  - CSS escape sequences (e.g. ".calm\002d evil") are, per the CSS spec,
    distinct class tokens from ".calm", so they pass the raw-text check even
    though a browser may render them confusingly close to it.
  - A substring match inside an unrelated string literal, such as an
    attribute selector value (e.g. `[data-x=".calm"]`), passes, since the
    checker looks for the token in the selector text and does not parse
    attribute-value strings semantically.
Anyone relying on this script to stop intentional obfuscation is relying on
it for something it was never built to do.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

def scope_token_re(token):
    """Whole-token matcher for a scope class like "calm" or "calm-app": a
    literal ".<token>" not immediately followed by another word character or
    hyphen (which would make it a different class, e.g. ".calmXtra" or
    ".calm-app-extra"). Because of the trailing guard, ".calm" does not match
    ".calm-app" and ".calm-app" does not match ".calm", so checking each file
    against its own token gives cross-token isolation for free."""
    return re.compile(r"\." + re.escape(token) + r"\b(?![\w-])")

# Block at-rules whose body contains nested rules with real page selectors
# that still need to be scope-checked (e.g. `@media {...}` wrapping `.calm ...`).
BLOCK_RECURSE_AT_RULES = ("@media", "@supports", "@layer")

# Block at-rules whose body is declarations or keyframe stops (0%, from, to),
# never page selectors, so there is nothing to scope-check inside them.
# `@property` registers a custom property document-wide, but its body is
# descriptors (syntax/inherits/initial-value), not selectors, so it cannot
# apply styles to any element and cannot leak layout to a sub-page.
BLOCK_OPAQUE_AT_RULES = ("@font-face", "@keyframes", "@property")

# Statement (blockless, `;`-terminated) at-rules that carry no CSS rules at
# all, so they cannot leak anything regardless of what they say.
# `@import` is deliberately NOT here: it can pull in an entirely separate
# stylesheet whose contents this script cannot see or validate, so it is
# treated as a violation rather than silently trusted.
STATEMENT_SAFE_AT_RULES = ("@charset", "@layer")

# Attribute-scoped asset reference: only href="..."/src="..." values count,
# not incidental mentions of the filename elsewhere in the markup (e.g. in a
# comment or visible text).
ASSET_ATTR_RE = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']*)["\']', re.I)


def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def _skip_string(css, i):
    """Given css[i] is a quote character, return the index just past the
    matching closing quote, honoring backslash escapes."""
    quote = css[i]
    i += 1
    n = len(css)
    while i < n:
        ch = css[i]
        if ch == "\\":
            i += 2
            continue
        if ch == quote:
            return i + 1
        i += 1
    return i  # unterminated string; consume to end rather than loop forever


def top_level_units(css):
    """Yield ('rule', selector, body) or ('statement', text) for each unit
    at the current nesting level, skipping over quoted strings so that
    braces/semicolons inside CSS string literals never desync the scan."""
    depth = 0
    start = 0
    body_start = 0
    selector = ""
    i = 0
    n = len(css)
    while i < n:
        ch = css[i]
        if ch in ("'", '"'):
            i = _skip_string(css, i)
            continue
        if ch == "{":
            if depth == 0:
                selector = css[start:i].strip()
                body_start = i + 1
            depth += 1
            i += 1
            continue
        if ch == "}":
            depth -= 1
            i += 1
            if depth == 0:
                yield ("rule", selector, css[body_start:i - 1])
                start = i
            continue
        if ch == ";" and depth == 0:
            statement = css[start:i].strip()
            i += 1
            if statement:
                yield ("statement", statement)
            start = i
            continue
        i += 1


def split_selector_list(selector):
    """Split a selector list on commas, but only at parenthesis depth 0, so
    that functional pseudo-classes like :is(.a, .b) or :not(.a, .b) are not
    mistaken for separate top-level selectors."""
    parts = []
    depth = 0
    start = 0
    for i, ch in enumerate(selector):
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == "," and depth == 0:
            parts.append(selector[start:i])
            start = i + 1
    parts.append(selector[start:])
    return parts


def mask_not_content(selector):
    """Return `selector` with the argument of every :not(...) blanked out
    (parens included stay, contents become spaces), so a subsequent token
    search only sees text outside any negation. Handles nested parens inside
    the :not() argument correctly."""
    result = list(selector)
    n = len(selector)
    i = 0
    while i < n:
        if selector[i : i + 5].lower() == ":not(":
            paren_idx = i + 4  # index of the '('
            depth = 1
            j = paren_idx + 1
            while j < n and depth > 0:
                if selector[j] == "(":
                    depth += 1
                elif selector[j] == ")":
                    depth -= 1
                j += 1
            for k in range(paren_idx + 1, j - 1):
                result[k] = " "
            i = j
            continue
        i += 1
    return "".join(result)


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


def check_scoped_css_text(css_text, scope_token="calm"):
    """Return a list of violation strings for CSS that must be fully scoped
    under a whole `.<scope_token>` class."""
    violations = []
    walk(strip_comments(css_text), violations, scope_token_re(scope_token))
    return violations


def check_home_css_text(css_text):
    """Back-compat wrapper: home.css is scoped under `.calm`."""
    return check_scoped_css_text(css_text, "calm")


def check_asset_references(html_text, assets=("home.css", "home.js")):
    """Return the list of asset names actually referenced via href=/src=
    attributes in the given HTML source (not just mentioned anywhere)."""
    found = []
    for match in ASSET_ATTR_RE.finditer(html_text):
        value = match.group(1)
        for asset in assets:
            if asset in value:
                found.append(asset)
    return found


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


if __name__ == "__main__":
    sys.exit(main())
