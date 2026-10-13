/* Best-o-Masto - live feature demos.
   Loaded only by apps/best-o-masto/index.html, after app.js. The stepped
   demos (data-steps) are run by app.js; this file holds the clickable ones.
   None of them animate on their own, so reduced motion needs no fallback
   here: every change is a direct response to a click. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // ---------- Your Top 8 ----------
    // Tap accounts in and out. Once eight are picked the rest lock.
    var LIMIT = 8;

    function initPicks() {
        var picks = all(document, '[data-bm-pick]');
        if (!picks.length) { return; }
        var count = document.querySelector('[data-bm-count]');

        function refresh() {
            var chosen = picks.filter(function (pick) {
                return pick.getAttribute('aria-pressed') === 'true';
            }).length;
            var full = chosen >= LIMIT;
            picks.forEach(function (pick) {
                var locked = full && pick.getAttribute('aria-pressed') !== 'true';
                pick.setAttribute('aria-disabled', locked);
            });
            if (count) {
                count.textContent = full
                    ? 'That is your Top 8.'
                    : chosen + ' of ' + LIMIT + ' picked';
            }
        }

        picks.forEach(function (pick) {
            pick.addEventListener('click', function () {
                if (pick.getAttribute('aria-disabled') === 'true') { return; }
                var on = pick.getAttribute('aria-pressed') === 'true';
                pick.setAttribute('aria-pressed', !on);
                refresh();
            });
        });

        refresh();
    }

    // ---------- Like and boost ----------
    function initActions() {
        all(document, '[data-bm-act]').forEach(function (btn) {
            var num = btn.querySelector('[data-bm-num]');
            var base = parseInt(num.textContent, 10);
            btn.addEventListener('click', function () {
                var on = btn.getAttribute('aria-pressed') !== 'true';
                btn.setAttribute('aria-pressed', on);
                num.textContent = base + (on ? 1 : 0);
            });
        });
    }

    // ---------- Theme colors and the link app ----------
    // Each group behaves like a set of radio buttons.
    function initChoices(selector, onPick) {
        var buttons = all(document, selector);
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                buttons.forEach(function (other) {
                    other.setAttribute('aria-pressed', other === btn);
                });
                if (onPick) { onPick(btn); }
            });
        });
    }

    function initThemes() {
        initChoices('[data-bm-theme]', function (btn) {
            var stage = btn.closest('.tile-stage');
            stage.style.setProperty('--bm-theme', btn.getAttribute('data-bm-theme'));
        });
        initChoices('[data-bm-open]');
    }

    initPicks();
    initActions();
    initThemes();
}());
