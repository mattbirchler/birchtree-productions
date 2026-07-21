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
