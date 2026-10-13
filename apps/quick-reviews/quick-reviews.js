/* Quick Reviews - live feature demos.
   Loaded only by apps/quick-reviews/index.html, after app.js. The stepped
   demos (data-steps) are run by app.js; this file holds the interactive
   ones. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // Marks one button of a group as the pressed one.
    function choose(buttons, chosen) {
        buttons.forEach(function (btn) {
            var active = btn === chosen;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active);
        });
    }

    // ---------- Score bars ----------
    function initScores() {
        all(document, '[data-qv-scores]').forEach(function (bar) {
            var buttons = all(bar, 'button');
            buttons.forEach(function (btn) {
                btn.addEventListener('click', function () { choose(buttons, btn); });
            });
        });
    }

    // ---------- Style: layout, background, score colour, font ----------
    function initStyle() {
        var tile = document.querySelector('[data-demo="style"]');
        if (!tile) { return; }
        var card = tile.querySelector('.qv-card');
        var inner = tile.querySelector('.qv-card-in');
        var base = '#651519';
        var shade = 0;
        var MAX_SHADE = 2;

        function paint() {
            var color = base;
            if (shade < 0) {
                color = 'color-mix(in srgb, ' + base + ', #000 ' + (-shade * 22) + '%)';
            } else if (shade > 0) {
                color = 'color-mix(in srgb, ' + base + ', #fff ' + (shade * 14) + '%)';
            }
            inner.style.setProperty('--qv-bg', color);
            all(tile, '[data-qv-shade]').forEach(function (btn) {
                var step = parseInt(btn.getAttribute('data-qv-shade'), 10);
                btn.disabled = shade * step >= MAX_SHADE;
            });
        }

        function group(attr, apply) {
            var buttons = all(tile, '[' + attr + ']');
            buttons.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    choose(buttons, btn);
                    apply(btn.getAttribute(attr), btn);
                });
            });
        }

        group('data-qv-layout', function (value) {
            card.setAttribute('data-layout', value);
        });

        group('data-qv-font', function (value) {
            card.setAttribute('data-font', value);
        });

        group('data-qv-bg', function (value, btn) {
            base = value;
            shade = 0;
            inner.style.setProperty('--qv-ink', btn.getAttribute('data-qv-ink') || '#fff');
            paint();
        });

        group('data-qv-score', function (value) {
            inner.style.setProperty('--qv-score', value);
        });

        all(tile, '[data-qv-shade]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                shade += parseInt(btn.getAttribute('data-qv-shade'), 10);
                shade = Math.max(-MAX_SHADE, Math.min(MAX_SHADE, shade));
                paint();
            });
        });
    }

    // ---------- Alternate posters ----------
    function initPosters() {
        var tile = document.querySelector('[data-demo="posters"]');
        if (!tile) { return; }
        var poster = tile.querySelector('.qv-card .qv-poster');
        var picks = all(tile, '[data-qv-poster]');

        picks.forEach(function (pick) {
            pick.addEventListener('click', function () {
                choose(picks, pick);
                poster.className = 'qv-poster ' + pick.getAttribute('data-qv-poster');
            });
        });
    }

    // ---------- Media types ----------
    var MEDIA = {
        movies: {
            art: 'qv-art-marty', icon: 'ph-film-strip', bg: '#17252a', score: '#ffffff',
            title: 'Marty Supreme', meta: '2025 • Josh Safdie',
            text: 'One of those movies that I can admire for its craft.',
            pill: 'Liked It'
        },
        tv: {
            art: 'qv-art-tv', icon: 'ph-television-simple', bg: '#1f4a5e', score: '#b4fd8c',
            title: 'Severance', meta: '2022 • Dan Erickson',
            text: 'Can’t stop thinking about it.',
            pill: 'Loved It!'
        },
        games: {
            art: 'qv-art-game', icon: 'ph-game-controller', bg: '#3a1f4d', score: '#ffd66b',
            title: 'Hades II', meta: '2025 • Supergiant Games',
            text: 'One more run. Okay, one more.',
            pill: 'Loved It!'
        },
        books: {
            art: 'qv-art-book', icon: 'ph-book-open-text', bg: '#14294a', score: '#ffffff',
            title: 'Project Hail Mary', meta: '2021 • Andy Weir',
            text: 'Read it in two sittings.',
            pill: 'Liked It'
        },
        music: {
            art: 'qv-art-music', icon: 'ph-music-notes', bg: '#5b4a2c', score: '#fdd9cd',
            title: 'Rumours', meta: '1977 • Fleetwood Mac',
            text: 'No skips.',
            pill: 'Loved It!'
        }
    };

    function initMedia() {
        var tile = document.querySelector('[data-demo="media"]');
        if (!tile) { return; }
        var row = tile.querySelector('.qv-row');
        var chips = all(tile, '[data-qv-media]');

        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var item = MEDIA[chip.getAttribute('data-qv-media')];
                choose(chips, chip);
                row.style.setProperty('--qv-bg', item.bg);
                row.style.setProperty('--qv-score', item.score);
                row.querySelector('.qv-poster').className = 'qv-poster ' + item.art;
                row.querySelector('.qv-poster span').textContent = item.title;
                row.querySelector('.qv-row-kind').className = 'ph ' + item.icon + ' qv-row-kind';
                row.querySelector('.qv-row-title').textContent = item.title;
                row.querySelector('.qv-row-meta').textContent = item.meta;
                row.querySelector('.qv-row-text').textContent = item.text;
                row.querySelector('.qv-pill').textContent = item.pill;
            });
        });
    }

    // ---------- Copy review text ----------
    // Shows the copied text in a field. It never touches the real clipboard.
    function initCopy() {
        all(document, '[data-qv-copy]').forEach(function (btn) {
            var target = document.getElementById(btn.getAttribute('aria-controls'));
            var value = btn.getAttribute('data-qv-copy');
            btn.addEventListener('click', function () {
                var pasted = target.textContent !== '';
                target.textContent = pasted ? '' : value;
                btn.querySelector('span').textContent = pasted ? 'Copy review text' : 'Clear';
            });
        });
    }

    initScores();
    initStyle();
    initPosters();
    initMedia();
    initCopy();
}());
