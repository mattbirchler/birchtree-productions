#!/usr/bin/env python3
"""Regression tests for tools/check-isolation.py.

Stdlib only. Runs the guard's importable logic against fixture CSS/HTML
strings (no filesystem home.css/index.html involved) and asserts pass/fail
for each case.

Run: python3 tools/test-check-isolation.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import importlib.util

_SPEC_PATH = pathlib.Path(__file__).resolve().parent / "check-isolation.py"
_spec = importlib.util.spec_from_file_location("check_isolation", _SPEC_PATH)
check_isolation = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_isolation)


def expect_fail(name, css):
    violations = check_isolation.check_home_css_text(css)
    ok = len(violations) > 0
    return ok, violations


def expect_pass(name, css):
    violations = check_isolation.check_home_css_text(css)
    ok = len(violations) == 0
    return ok, violations


CASES = []


def case(name, kind, css):
    CASES.append((name, kind, css))


# --- Critical 1: substring match lets .calmXtra through -------------------
case(
    "critical1_substring_class_must_fail",
    "fail",
    """
    .calmXtra { position: fixed; inset: 0; background: black; z-index: 9999; }
    """,
)

# --- Critical 2: blockless @charset glues onto the next selector ---------
case(
    "critical2_charset_statement_must_not_hide_leak",
    "fail",
    """
    @charset "UTF-8";
    .leak { position: fixed; inset: 0; background: red; }
    """,
)

# --- Critical 2 (same bug, @layer statement form) -------------------------
case(
    "critical2_blockless_layer_must_not_hide_leak",
    "fail",
    """
    @layer utilities;
    .leak2 { position: fixed; inset: 0; background: blue; }
    """,
)

# --- Important: quoted strings desync the brace counter ------------------
case(
    "string_literal_with_braces_must_not_desync",
    "pass",
    """
    body.calm .thing::before { content: "} foo {"; color: red; }
    """,
)

# String literal case paired with a real leak after it: the leak must still
# be caught (proves the parser resynced correctly rather than just not
# crashing).
case(
    "string_literal_then_real_leak_must_fail",
    "fail",
    """
    body.calm .thing::before { content: "} foo {"; color: red; }
    .leak3 { color: red; }
    """,
)

# --- Legitimately scoped stylesheet with nested @media/@keyframes --------
case(
    "scoped_with_media_and_keyframes_must_pass",
    "pass",
    """
    body.calm { background: #f7f7f7; }

    @media (max-width: 600px) {
        .calm .hero { padding: 1rem; }
    }

    @keyframes calm-fade {
        from { opacity: 0; }
        50% { opacity: 0.5; }
        to { opacity: 1; }
    }

    .calm .thing { animation: calm-fade 1s ease; }
    """,
)

# --- Plainly unscoped selector --------------------------------------------
case(
    "plain_unscoped_selector_must_fail",
    "fail",
    """
    .stage { color: red; }
    """,
)

# --- Multi-selector comma list, one part unscoped -------------------------
case(
    "comma_list_with_one_unscoped_part_must_fail",
    "fail",
    """
    .calm .a, .b { color: red; }
    """,
)

# --- Multi-selector comma list, all parts scoped --------------------------
case(
    "comma_list_all_scoped_must_pass",
    "pass",
    """
    .calm .a, .calm .b { color: red; }
    """,
)

# --- @import cannot be validated, so it must be flagged -------------------
case(
    "import_statement_must_fail",
    "fail",
    """
    @import url("other.css");
    body.calm { color: red; }
    """,
)

# --- @charset alone (no following leak) is genuinely harmless ------------
case(
    "charset_alone_must_pass",
    "pass",
    """
    @charset "UTF-8";
    body.calm { color: red; }
    """,
)

# --- Unknown block at-rule is rejected, not silently trusted --------------
case(
    "unknown_block_at_rule_must_fail",
    "fail",
    """
    @page :first { margin: 1in; .anything: here; }
    """,
)

# --- HTML asset reference: must be scoped to href=/src=, not substring ---
HTML_COMMENT_MENTION = """
<html><body>
<!-- see home.css for the source of truth -->
<p>We used to load home.css but not anymore.</p>
</body></html>
"""

HTML_REAL_REFERENCE = """
<html><head>
<link rel="stylesheet" href="home.css?v=1">
</head><body></body></html>
"""


def run():
    failures = []
    for name, kind, css in CASES:
        violations = check_isolation.check_home_css_text(css)
        got_fail = len(violations) > 0
        want_fail = kind == "fail"
        ok = got_fail == want_fail
        status = "ok" if ok else "FAILED"
        detail = f" violations={violations!r}" if not ok else ""
        print(f"[{status}] {name}{detail}")
        if not ok:
            failures.append(name)

    # HTML asset-reference tests (separate from the CSS scoping tests).
    html_cases = [
        ("html_comment_mention_must_not_count", HTML_COMMENT_MENTION, []),
        ("html_real_href_reference_must_count", HTML_REAL_REFERENCE, ["home.css"]),
    ]
    for name, html_text, expected in html_cases:
        found = check_isolation.check_asset_references(html_text)
        ok = found == expected
        status = "ok" if ok else "FAILED"
        detail = f" found={found!r} expected={expected!r}" if not ok else ""
        print(f"[{status}] {name}{detail}")
        if not ok:
            failures.append(name)

    print()
    if failures:
        print(f"FAIL: {len(failures)} case(s) failed: {', '.join(failures)}")
        return 1
    print(f"PASS: all {len(CASES) + len(html_cases)} cases behaved as expected")
    return 0


if __name__ == "__main__":
    sys.exit(run())
