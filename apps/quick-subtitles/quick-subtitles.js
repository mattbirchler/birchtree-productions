/* Quick Subtitles - live feature demos.
   Loaded only by apps/quick-subtitles/index.html, after app.js. The stepped
   demo (data-steps) is run by app.js; this file holds the interactive ones. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // Run fn once, the first time el is mostly on screen.
    function onceVisible(el, fn) {
        var io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) { return; }
            io.disconnect();
            fn();
        }, { threshold: 0.5 });
        io.observe(el);
    }

    // ---------- Hero: a transcription running in real time ----------
    // The 38 minute episode from the stats screenshot took 30.3 seconds, so
    // the bar here takes 30.3 real seconds, rests on Complete, and starts
    // over. With reduced motion the markup's 65% state stays as it is.

    function initHero() {
        var win = document.querySelector('[data-hero]');
        if (!win || reduceMotion.matches) { return; }
        var TOTAL = 30.3;
        var REST = 7000;
        var title = win.querySelector('[data-hero-title]');
        var pct = win.querySelector('[data-hero-pct]');
        var bar = win.querySelector('[data-hero-bar]');
        var time = win.querySelector('[data-hero-time]');
        var start = Date.now();
        var done = false;
        var visible = true;

        function render(secs) {
            var ratio = Math.min(secs / TOTAL, 1);
            bar.style.transform = 'scaleX(' + ratio.toFixed(3) + ')';
            time.textContent = (ratio * TOTAL).toFixed(1) + ' sec';
            if (!done) { pct.textContent = Math.floor(ratio * 100) + '%'; }
        }

        function finish() {
            done = true;
            win.setAttribute('data-state', 'done');
            title.textContent = 'Complete!';
            pct.innerHTML = '<i class="ph ph-chart-bar"></i> Stats';
            render(TOTAL);
            window.setTimeout(restart, REST);
        }

        function restart() {
            done = false;
            start = Date.now();
            win.setAttribute('data-state', 'working');
            title.textContent = 'Transcribing';
            render(0);
        }

        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
        }).observe(win);

        restart();
        window.setInterval(function () {
            if (done) { return; }
            var secs = (Date.now() - start) / 1000;
            if (secs >= TOTAL) {
                finish();
            } else if (visible) {
                render(secs);
            }
        }, 100);
    }

    // ---------- Transcription stats popover ----------
    function initStats() {
        var btn = document.querySelector('[data-stats-toggle]');
        if (!btn) { return; }
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        var touched = false;

        function set(open) {
            panel.classList.toggle('is-closed', !open);
            btn.setAttribute('aria-expanded', open);
        }

        btn.addEventListener('click', function () {
            touched = true;
            set(btn.getAttribute('aria-expanded') !== 'true');
        });

        // Open it for the visitor, once, when the tile scrolls into view.
        if (reduceMotion.matches) { return; }
        set(false);
        onceVisible(panel.parentNode, function () {
            window.setTimeout(function () {
                if (!touched) { set(true); }
            }, 500);
        });
    }

    // ---------- Text or SRT export ----------
    var FORMAT_NOTES = {
        text: 'Clean text, ready to copy.',
        srt: 'Timed subtitles for any editor or platform.'
    };

    function initFormats() {
        var buttons = all(document, '[data-format]');
        if (!buttons.length) { return; }
        var tile = buttons[0].closest('.tile');
        var panes = all(tile, '[data-format-pane]');
        var note = tile.querySelector('[data-format-note]');

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var format = btn.getAttribute('data-format');
                buttons.forEach(function (b) {
                    b.setAttribute('aria-pressed', b === btn);
                });
                panes.forEach(function (pane) {
                    pane.setAttribute('aria-hidden', pane.getAttribute('data-format-pane') !== format);
                });
                note.textContent = FORMAT_NOTES[format];
            });
        });
    }

    // ---------- Benchmark ----------
    // Five runs whose average, best and worst are the ones in the app
    // screenshot (199.6, 206.1, 195.7 words/sec).
    var RUNS = [206.1, 203.9, 195.7, 195.9, 196.4];

    function initBenchmark() {
        var btn = document.querySelector('[data-bench-run]');
        if (!btn) { return; }
        var tile = btn.closest('.tile');
        var chart = tile.querySelector('.qs-chart');
        var dots = all(chart, 'circle');
        var note = tile.querySelector('[data-bench-note]');
        var label = btn.querySelector('span');
        var out = {
            avg: tile.querySelector('[data-bench="avg"]'),
            best: tile.querySelector('[data-bench="best"]'),
            worst: tile.querySelector('[data-bench="worst"]')
        };
        var timers = [];

        function show(count) {
            var done = RUNS.slice(0, count);
            chart.style.setProperty('--qs-runs', count);
            dots.forEach(function (dot, i) {
                dot.classList.toggle('is-off', i >= count);
            });
            if (!count) {
                out.avg.textContent = out.best.textContent = out.worst.textContent = '...';
                return;
            }
            var sum = done.reduce(function (a, b) { return a + b; }, 0);
            out.avg.textContent = (sum / count).toFixed(1);
            out.best.textContent = Math.max.apply(null, done).toFixed(1);
            out.worst.textContent = Math.min.apply(null, done).toFixed(1);
        }

        function run() {
            timers.forEach(window.clearTimeout);
            timers = [];
            if (reduceMotion.matches) {
                show(RUNS.length);
                return;
            }
            show(0);
            btn.disabled = true;
            label.textContent = 'Running';
            RUNS.forEach(function (value, i) {
                timers.push(window.setTimeout(function () {
                    show(i + 1);
                    note.textContent = 'Run ' + (i + 1) + ' of ' + RUNS.length;
                    if (i === RUNS.length - 1) {
                        btn.disabled = false;
                        label.textContent = 'Run again';
                        note.textContent = RUNS.length + ' runs complete';
                    }
                }, 700 * (i + 1)));
            });
        }

        btn.addEventListener('click', run);
        if (!reduceMotion.matches) {
            onceVisible(chart, run);
        }
    }

    initHero();
    initStats();
    initFormats();
    initBenchmark();
}());
