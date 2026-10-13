/* Pastry - live feature demos.
   Loaded only by apps/pastry/index.html, after app.js. Each demo is a tile
   whose data-step attribute advances on a timer; pastry.css does the rest. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // ---------- Stepped demos ----------
    // data-steps="900,700" means: rest at step 0, step 1 after 900ms, step 2
    // 700ms later. Children can follow along with data-step-text="a|b|c" and
    // data-count-from / data-count-to (tweened when step 1 starts).

    function tweenCount(el) {
        var from = parseFloat(el.getAttribute('data-count-from'));
        var to = parseFloat(el.getAttribute('data-count-to'));
        if (reduceMotion.matches) {
            el.textContent = to;
            return;
        }
        var start = null;
        var DURATION = 900;

        function frame(now) {
            if (start === null) { start = now; }
            var t = Math.min((now - start) / DURATION, 1);
            var eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(from + (to - from) * eased);
            if (t < 1) { window.requestAnimationFrame(frame); }
        }

        window.requestAnimationFrame(frame);
    }

    function setStep(tile, step) {
        tile.setAttribute('data-step', step);
        all(tile, '[data-step-text]').forEach(function (el) {
            var parts = el.getAttribute('data-step-text').split('|');
            el.textContent = parts[Math.min(step, parts.length - 1)];
        });
        all(tile, '[data-count-to]').forEach(function (el) {
            if (step === 0) {
                el.textContent = el.getAttribute('data-count-from');
            } else if (step === 1) {
                tweenCount(el);
            }
        });
    }

    function play(tile) {
        var delays = tile.getAttribute('data-steps').split(',').map(Number);
        (tile._pzTimers || []).forEach(window.clearTimeout);
        tile._pzTimers = [];

        if (reduceMotion.matches) {
            setStep(tile, 1);
            setStep(tile, delays.length);
            return;
        }

        setStep(tile, 0);
        var elapsed = 0;
        delays.forEach(function (delay, i) {
            elapsed += delay;
            tile._pzTimers.push(window.setTimeout(function () {
                setStep(tile, i + 1);
            }, elapsed));
        });
    }

    function initSteppedDemos() {
        var tiles = all(document, '[data-steps]');
        if (!tiles.length) { return; }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    play(entry.target);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.6 });

        tiles.forEach(function (tile) {
            io.observe(tile);
            all(tile, '[data-replay]').forEach(function (btn) {
                btn.addEventListener('click', function () { play(tile); });
            });
        });
    }

    // ---------- Hero: a secret counting down in real time ----------
    // The first row is in its last seconds. When it goes, a freshly copied
    // key arrives with the full five minutes, and really does count them.

    function formatCountdown(secs) {
        var m = Math.floor(secs / 60);
        var s = secs % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function initHero() {
        var list = document.querySelector('[data-hero-list]');
        if (!list) { return; }
        var count = document.querySelector('[data-hero-count]');
        var next = {
            icon: 'ph-key',
            title: 'sk_live_••••••••p7dc',
            app: 'Terminal',
            color: '#3a3a3c',
            secs: 300
        };

        function refresh() {
            var rows = all(list, '.pz-row:not(.is-leaving)');
            rows.forEach(function (row, i) {
                row.classList.toggle('is-selected', i === 0);
                row.querySelector('.pz-row-key').textContent = '⌘' + (i + 1);
            });
            if (count) { count.textContent = rows.length + ' items'; }
        }

        function buildRow(item) {
            var row = document.createElement('div');
            row.className = 'pz-row is-leaving';
            row.setAttribute('data-secs', item.secs);
            row.innerHTML =
                '<div class="pz-row-icon"><i class="ph ' + item.icon + '"></i></div>' +
                '<div class="pz-row-body">' +
                    '<div class="pz-row-title">' + item.title + '</div>' +
                    '<div class="pz-row-meta"><span class="pz-app" style="--pz-app: ' + item.color + '"></span>' +
                    item.app + ' <i class="ph ph-timer"></i> deletes in <span data-countdown>' +
                    formatCountdown(item.secs) + '</span></div>' +
                '</div>' +
                '<span class="pz-row-key"></span>';
            return row;
        }

        function arrive() {
            if (!next) { return; }
            var row = buildRow(next);
            next = null;
            list.insertBefore(row, list.querySelector('.pz-row'));
            void row.offsetWidth;   // reflow so the row animates open
            row.classList.remove('is-leaving');
            refresh();
        }

        function expire(row) {
            row.removeAttribute('data-secs');
            row.classList.add('is-leaving');
            refresh();
            window.setTimeout(function () {
                row.parentNode.removeChild(row);
                window.setTimeout(arrive, 2500);
            }, 500);
        }

        window.setInterval(function () {
            all(list, '[data-secs]').forEach(function (row) {
                var secs = parseInt(row.getAttribute('data-secs'), 10) - 1;
                if (secs <= 0) {
                    expire(row);
                    return;
                }
                row.setAttribute('data-secs', secs);
                row.querySelector('[data-countdown]').textContent = formatCountdown(secs);
            });
        }, 1000);
    }

    // ---------- Masked in the list, whole when pasted ----------
    function initPaste() {
        all(document, '[data-paste]').forEach(function (btn) {
            var target = document.getElementById(btn.getAttribute('aria-controls'));
            var value = btn.getAttribute('data-paste');
            btn.addEventListener('click', function () {
                var pasted = target.textContent !== '';
                target.textContent = pasted ? '' : value;
                btn.querySelector('span').textContent = pasted ? 'Paste' : 'Clear';
            });
        });
    }

    // ---------- Per-app rules ----------
    var RULES = [
        { key: 'keep', label: 'Keep' },
        { key: '1m', label: 'Delete after 1 minute' },
        { key: '1h', label: 'Delete after 1 hour' },
        { key: '1d', label: 'Delete after 1 day' },
        { key: 'never', label: 'Never save' }
    ];

    function initRules() {
        all(document, '[data-rule]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var current = btn.getAttribute('data-rule');
                var index = 0;
                RULES.forEach(function (rule, i) {
                    if (rule.key === current) { index = i; }
                });
                var rule = RULES[(index + 1) % RULES.length];
                btn.setAttribute('data-rule', rule.key);
                btn.textContent = rule.label;
            });
        });
    }

    // ---------- Search, including the text inside screenshots ----------
    function initSearch() {
        var input = document.querySelector('[data-search-input]');
        if (!input) { return; }
        var tile = input.closest('.pz-tile');
        var rows = all(tile, '[data-search]');
        var empty = tile.querySelector('.pz-empty');

        function highlight(row, query) {
            var el = row.querySelector('[data-ocr]');
            if (!el) { return; }
            var text = el.getAttribute('data-ocr');
            var at = query ? text.toLowerCase().indexOf(query) : -1;
            el.textContent = '';
            if (at === -1) {
                el.textContent = text;
                return;
            }
            var mark = document.createElement('mark');
            mark.textContent = text.substr(at, query.length);
            el.appendChild(document.createTextNode(text.substr(0, at)));
            el.appendChild(mark);
            el.appendChild(document.createTextNode(text.substr(at + query.length)));
        }

        function filter() {
            var query = input.value.trim().toLowerCase();
            var shown = 0;
            rows.forEach(function (row) {
                var match = row.getAttribute('data-search').toLowerCase().indexOf(query) !== -1;
                row.classList.toggle('is-dim', !match);
                if (match) { shown++; }
                highlight(row, query);
            });
            empty.hidden = shown > 0;
        }

        var touched = false;
        input.addEventListener('input', function () { touched = true; filter(); });
        input.addEventListener('focus', function () { touched = true; });

        // Type one query for the visitor, once, so the point lands unprompted.
        var io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) { return; }
            io.disconnect();
            if (touched) { return; }
            var word = input.getAttribute('data-autotype');
            if (reduceMotion.matches) {
                input.value = word;
                filter();
                return;
            }
            var i = 0;
            (function type() {
                if (touched || i >= word.length) { return; }
                i++;
                input.value = word.substr(0, i);
                filter();
                window.setTimeout(type, 140);
            }());
        }, { threshold: 0.6 });
        io.observe(tile);
    }

    // ---------- Collections ----------
    function initCollections() {
        var tabs = all(document, '[data-collection]');
        if (!tabs.length) { return; }
        var rows = all(tabs[0].closest('.pz-tile'), '[data-in]');

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var name = tab.getAttribute('data-collection');
                tabs.forEach(function (t) {
                    var active = t === tab;
                    t.classList.toggle('is-active', active);
                    t.setAttribute('aria-pressed', active);
                });
                rows.forEach(function (row) {
                    row.hidden = name !== 'all' && row.getAttribute('data-in') !== name;
                });
            });
        });
    }

    initSteppedDemos();
    initHero();
    initPaste();
    initRules();
    initSearch();
    initCollections();
}());
