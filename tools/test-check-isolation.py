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

# --- Comma splitter must respect parenthesis depth (functional pseudo-
# classes contain commas that are not selector-list separators) -----------
case(
    "functional_pseudo_is_comma_must_pass",
    "pass",
    """
    .calm :is(.a, .b) { color: red; }
    """,
)

case(
    "functional_pseudo_not_comma_must_pass",
    "pass",
    """
    .calm .thing:not(.hidden, .disabled) { color: red; }
    """,
)

case(
    "functional_pseudo_where_comma_must_pass",
    "pass",
    """
    .calm :where(.x, .y) .z { color: red; }
    """,
)

# --- Negated scope: .calm only appears inside :not(), which is inverted ---
case(
    "negated_scope_must_fail",
    "fail",
    """
    body:not(.calm) .leak { color: red; }
    """,
)

# --- .calm appears both inside and outside a :not() -> still scoped ------
case(
    "calm_inside_and_outside_not_must_pass",
    "pass",
    """
    .calm .a:not(.calm-child) { color: red; }
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

# --- @property registers a custom property; its body is descriptors, not
#     selectors, so it cannot leak and must pass ------------------------------
case(
    "property_at_rule_must_pass",
    "pass",
    """
    @property --explode {
        syntax: "<number>";
        inherits: false;
        initial-value: 1;
    }
    body.calm { color: red; }
    """,
)

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


if __name__ == "__main__":
    sys.exit(run())
