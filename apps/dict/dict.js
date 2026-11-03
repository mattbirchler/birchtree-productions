/* Dict page: the dot-matrix spectrum and the small interactive demos. */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var ROWS = 5;

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // ---------- Spectrum ----------
    // Each .dc-meter gets a column-major grid of dots. Its mode comes from
    // data-modes (indexed by the nearest stepped demo's data-step), or "talk".

    var meters = all(document, '.dc-meter').map(function (el) {
        var cols = parseInt(el.getAttribute('data-cols'), 10) || 16;
        var dots = [];
        for (var c = 0; c < cols; c++) {
            var col = [];
            for (var r = 0; r < ROWS; r++) {
                var dot = document.createElement('i');
                col.push(dot);
            }
            // Grid flows by column, top to bottom, so append top row first.
            col.slice().reverse().forEach(function (d) { el.appendChild(d); });
            dots.push(col);   // col[0] is the bottom row
        }
        return {
            el: el,
            cols: cols,
            dots: dots,
            host: el.closest('[data-steps]'),
            modes: (el.getAttribute('data-modes') || '').split('|'),
            levels: new Array(cols).fill(0),
            visible: false
        };
    });

    function modeOf(m) {
        if (m.modes.length === 1 && m.modes[0] === '') { return 'talk'; }
        if (m.modes.length === 1) { return m.modes[0]; }
        var step = m.host ? parseInt(m.host.getAttribute('data-step'), 10) : 0;
        if (isNaN(step)) { step = 0; }
        return m.modes[Math.min(step, m.modes.length - 1)] || 'idle';
    }

    function target(mode, col, cols, t) {
        var x = col / (cols - 1);
        if (mode === 'idle') {
            return 1 + 0.9 * (0.5 + 0.5 * Math.sin(x * 7 - t * 1.6));
        }
        if (mode === 'process') {
            var head = (t * 0.9) % 1.3 - 0.15;
            return 1 + 1.6 * Math.max(0, 1 - Math.abs(x - head) * 7);
        }
        // talk: a voice-shaped envelope with a moving peak and some jitter
        var peak = 0.35 + 0.2 * Math.sin(t * 1.3);
        var env = Math.exp(-Math.pow((x - peak) / 0.22, 2));
        var syllable = 0.55 + 0.45 * Math.abs(Math.sin(t * 5.2 + col * 0.4));
        return 1 + (ROWS - 1) * env * syllable + Math.random() * 0.9;
    }

    function paint(m, mode, t, snap) {
        for (var c = 0; c < m.cols; c++) {
            var goal = target(mode, c, m.cols, t);
            m.levels[c] = snap ? goal : m.levels[c] + (goal - m.levels[c]) * 0.45;
            var lit = Math.max(1, Math.min(ROWS, Math.round(m.levels[c])));
            for (var r = 0; r < ROWS; r++) {
                var dot = m.dots[c][r];
                var on = r < lit;
                if (dot.classList.contains('on') !== on) { dot.classList.toggle('on', on); }
                var hi = r >= 3;
                if (dot.classList.contains('hi') !== hi) { dot.classList.toggle('hi', hi); }
            }
        }
    }

    if (meters.length) {
        if (reduceMotion.matches) {
            meters.forEach(function (m) { paint(m, 'talk', 0.6, true); });
        } else {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    meters.forEach(function (m) {
                        if (m.el === entry.target) { m.visible = entry.isIntersecting; }
                    });
                });
            });
            meters.forEach(function (m) {
                paint(m, 'idle', 0, true);
                io.observe(m.el);
            });

            var last = 0;
            var tick = function (now) {
                if (now - last > 85) {
                    last = now;
                    var t = now / 1000;
                    meters.forEach(function (m) {
                        if (m.visible) { paint(m, modeOf(m), t, false); }
                    });
                }
                window.requestAnimationFrame(tick);
            };
            window.requestAnimationFrame(tick);
        }
    }

    // ---------- Dictation styles ----------
    all(document, '[data-demo="styles"]').forEach(function (tile) {
        var tabs = all(tile, '[data-style]');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var style = tab.getAttribute('data-style');
                tabs.forEach(function (t) {
                    t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
                });
                all(tile, '[data-style-pane]').forEach(function (pane) {
                    pane.hidden = pane.getAttribute('data-style-pane') !== style;
                });
            });
        });
    });

    // ---------- Color schemes ----------
    all(document, '[data-demo="schemes"]').forEach(function (tile) {
        var hud = tile.querySelector('.dc-hud');
        var picks = all(tile, '[data-scheme-pick]');
        picks.forEach(function (btn) {
            btn.addEventListener('click', function () {
                hud.setAttribute('data-scheme', btn.getAttribute('data-scheme-pick'));
                picks.forEach(function (b) {
                    b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                });
            });
        });
    });

    // ---------- Hotkey ----------
    all(document, '[data-demo="hotkey"]').forEach(function (tile) {
        var name = tile.querySelector('.dc-key-name');
        var keys = all(tile, '[data-key-pick]');
        keys.forEach(function (btn) {
            btn.addEventListener('click', function () {
                name.textContent = btn.getAttribute('data-key-pick');
                keys.forEach(function (b) {
                    b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                });
            });
        });
    });
}());
