/* Yearly Run Goals - live feature demos.
   Loaded only by apps/yearly-run-goals/index.html, after app.js. The stepped
   demos (data-steps) are run by app.js; this file holds the interactive ones. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // Shared by every chip row: one pressed at a time.
    function press(chips, chosen) {
        chips.forEach(function (chip) {
            var active = chip === chosen;
            chip.classList.toggle('is-active', active);
            chip.setAttribute('aria-pressed', active);
        });
    }

    // ---------- Log a run, watch the projection move ----------
    // The sample year stands at 17.4 miles after 23 days. Logging today's
    // run lifts the total, the projected finish and the end of the line.

    var BASE = 17.4;
    var GOAL = 365;
    var LAST_YEAR = 9.6;
    var DAYS = 23;
    var LINE = 'M0,153 L12.6,148 25.2,140.5 37.8,128.5 50.4,128.5 63,121 75.6,121 ' +
        '88.2,113 100.9,105 113.5,105 126.1,91 138.7,81.5 151.3,76 163.9,71 277.4,71 290,';

    function initLog() {
        var tile = document.querySelector('[data-demo="log"]');
        if (!tile) { return; }
        var range = tile.querySelector('[data-log-range]');
        var out = tile.querySelector('[data-log-out]');
        var btn = tile.querySelector('[data-log-btn]');
        var status = tile.querySelector('[data-log-status]');
        var day = tile.querySelector('[data-log-day]');
        var dayMi = tile.querySelector('[data-log-day-mi]');
        var paceWrap = tile.querySelector('[data-log-pacewrap]');
        var paceIcon = paceWrap.querySelector('i');
        var line = tile.querySelector('.yr-chart-line');
        var area = tile.querySelector('.yr-chart-area');
        var logged = false;
        var shown = 0;      // miles currently drawn for today
        var frame = null;

        function draw(added) {
            var total = BASE + added;
            var pace = Math.round(total / DAYS * 365);
            var ahead = pace >= GOAL;
            var y = (158 - total * 5).toFixed(1);
            shown = added;
            tile.querySelector('[data-log-total]').textContent = Math.round(total);
            tile.querySelector('[data-log-pct]').textContent = Math.round(total / GOAL * 100) + '%';
            tile.querySelector('[data-log-pace]').textContent = pace + ' mi';
            tile.querySelector('[data-log-ahead]').textContent = (total - LAST_YEAR).toFixed(1);
            paceWrap.classList.toggle('is-ahead', ahead);
            paceIcon.className = 'ph ' + (ahead ? 'ph-arrow-up-right' : 'ph-arrow-down-right');
            line.setAttribute('d', LINE + y);
            area.setAttribute('d', LINE + y + ' 290,158 0,158 Z');
        }

        function tweenTo(target) {
            window.cancelAnimationFrame(frame);
            if (reduceMotion.matches) {
                draw(target);
                return;
            }
            var from = shown;
            var start = null;
            var DURATION = 700;

            function step(now) {
                if (start === null) { start = now; }
                var t = Math.min((now - start) / DURATION, 1);
                var eased = 1 - Math.pow(1 - t, 3);
                draw(from + (target - from) * eased);
                if (t < 1) { frame = window.requestAnimationFrame(step); }
            }

            frame = window.requestAnimationFrame(step);
        }

        function update(announce) {
            var miles = parseFloat(range.value);
            out.textContent = miles.toFixed(1) + ' mi';
            day.classList.toggle('is-run', logged);
            dayMi.textContent = logged ? miles.toFixed(1) : '';
            btn.classList.toggle('is-logged', logged);
            btn.querySelector('span').textContent = logged ? 'Undo' : 'Log Running';
            btn.querySelector('i').className = 'ph ' + (logged ? 'ph-arrow-counter-clockwise' : 'ph-plus-circle');
            tweenTo(logged ? miles : 0);
            if (announce) {
                var total = BASE + (logged ? miles : 0);
                status.textContent = (logged ? 'Logged ' + miles.toFixed(1) + ' miles. ' : 'Run removed. ') +
                    Math.round(total) + ' of ' + GOAL + ' miles, on pace for ' +
                    Math.round(total / DAYS * 365) + ' miles.';
            }
        }

        btn.addEventListener('click', function () {
            logged = !logged;
            update(true);
            if (logged && !reduceMotion.matches) {
                day.classList.add('is-pop');
                window.setTimeout(function () { day.classList.remove('is-pop'); }, 220);
            }
        });

        range.addEventListener('input', function () { update(false); });
        range.addEventListener('change', function () { if (logged) { update(true); } });
    }

    // ---------- Activity types ----------
    function initActivity() {
        var tile = document.querySelector('[data-demo="activity"]');
        if (!tile) { return; }
        var chips = all(tile, '[data-activity]');

        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var total = parseFloat(chip.getAttribute('data-total'));
                var goal = parseFloat(chip.getAttribute('data-goal'));
                press(chips, chip);
                tile.querySelector('[data-activity-total]').textContent = total;
                tile.querySelector('[data-activity-goal]').textContent = goal.toLocaleString('en-US');
                tile.querySelector('[data-activity-pct]').textContent = Math.round(total / goal * 100) + '%';
                tile.querySelector('[data-activity-meter]').style.transform = 'scaleX(' + (total / goal) + ')';
                tile.querySelector('[data-activity-name]').textContent = chip.getAttribute('data-activity');
            });
        });
    }

    // ---------- Insights ----------
    function initInsights() {
        var tile = document.querySelector('[data-demo="insights"]');
        if (!tile) { return; }
        var tabs = all(tile, '[data-insight]');
        var panels = all(tile, '[data-insight-panel]');

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var name = tab.getAttribute('data-insight');
                press(tabs, tab);
                panels.forEach(function (panel) {
                    panel.hidden = panel.getAttribute('data-insight-panel') !== name;
                });
            });
        });
    }

    // ---------- Exports ----------
    // The 12-month grid is built here rather than written out as 400 spans.
    // Weeks start on Monday, as they do in the app.

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var RUN_DAYS = [1, 2, 3, 4, 6, 8, 9, 11, 12, 13, 14];   // January, as in the hero

    function buildYear(grid) {
        var year = parseInt(grid.getAttribute('data-year'), 10);
        var html = '';
        MONTHS.forEach(function (name, m) {
            var offset = (new Date(year, m, 1).getDay() + 6) % 7;
            var count = new Date(year, m + 1, 0).getDate();
            var cells = '';
            var d;
            for (d = 0; d < offset; d++) { cells += '<span></span>'; }
            for (d = 1; d <= count; d++) {
                var run = m === 0 ? RUN_DAYS.indexOf(d) : -1;
                cells += run === -1 ? '<span>' + d + '</span>' :
                    '<span class="is-run" style="transition-delay: ' + (run * 60) + 'ms">' + d + '</span>';
            }
            html += '<div class="yr-mini"><p class="yr-mini-name">' + name + '</p>' +
                '<div class="yr-mini-days">' + cells + '</div></div>';
        });
        grid.innerHTML = html;
    }

    function initExport() {
        var tile = document.querySelector('[data-demo="export"]');
        if (!tile) { return; }
        var tabs = all(tile, '[data-export]');
        var panels = all(tile, '[data-export-panel]');
        var chart = document.querySelector('.yr-phone .yr-chart');

        buildYear(tile.querySelector('.yr-year'));
        if (chart) {
            tile.querySelector('.yr-poster-chart').appendChild(chart.cloneNode(true));
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var name = tab.getAttribute('data-export');
                press(tabs, tab);
                panels.forEach(function (panel) {
                    panel.hidden = panel.getAttribute('data-export-panel') !== name;
                });
            });
        });
    }

    initLog();
    initActivity();
    initInsights();
    initExport();
}());
