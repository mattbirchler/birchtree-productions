#!/usr/bin/env python3
"""Verify homepage styles cannot affect app sub-pages.

Two guarantees:
  1. Every rule in home.css is scoped under a whole `.calm` class token, so
     the file cannot leak styles even if some page loads it by accident.
  2. home.css and home.js are referenced (via href=/src=) only by index.html.

Run from anywhere: python3 tools/check-isolation.py

The parsing/checking logic below is importable (see tools/test-check-isolation.py)
so it can be exercised against fixture strings without touching the filesystem.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Whole-token match for the .calm class: a literal ".calm" not immediately
# followed by another word character or hyphen (which would make it a
# different class, e.g. ".calmXtra" or ".calm-extra").
CALM_TOKEN_RE = re.compile(r"\.calm\b(?![\w-])")

# Block at-rules whose body contains nested rules with real page selectors
# that still need to be scope-checked (e.g. `@media {...}` wrapping `.calm ...`).
BLOCK_RECURSE_AT_RULES = ("@media", "@supports", "@layer")

# Block at-rules whose body is declarations or keyframe stops (0%, from, to),
# never page selectors, so there is nothing to scope-check inside them.
BLOCK_OPAQUE_AT_RULES = ("@font-face", "@keyframes")

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


def check_selector(selector, violations):
    for part in selector.split(","):
        part = part.strip()
        if not part:
            continue
        if not CALM_TOKEN_RE.search(part):
            violations.append(f"unscoped selector: {part!r}")


def walk(css, violations):
    for unit in top_level_units(css):
        if unit[0] == "statement":
            text = unit[1]
            if not text.startswith("@"):
                continue  # stray semicolon; no selector, nothing to check
            name = text.split()[0]
            if name in STATEMENT_SAFE_AT_RULES:
                continue
            violations.append(f"unsupported at-rule: {text!r}")
            continue

        _, selector, body = unit
        if selector.startswith("@"):
            name = selector.split()[0]
            if name in BLOCK_RECURSE_AT_RULES:
                walk(body, violations)
            elif name in BLOCK_OPAQUE_AT_RULES:
                continue
            else:
                violations.append(f"unsupported at-rule: {selector!r}")
        else:
            check_selector(selector, violations)


def check_home_css_text(css_text):
    """Return a list of violation strings for the given CSS source."""
    violations = []
    walk(strip_comments(css_text), violations)
    return violations


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


def main():
    violations = []

    home_css = ROOT / "home.css"
    if not home_css.exists():
        print("FAIL: home.css does not exist")
        return 1
    violations.extend(check_home_css_text(home_css.read_text()))

    root_index = ROOT / "index.html"
    for html in sorted(ROOT.rglob("*.html")):
        if html == root_index:
            continue
        text = html.read_text()
        for asset in check_asset_references(text):
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
