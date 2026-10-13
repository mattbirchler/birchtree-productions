/* Quick Reads - live feature demos.
   Loaded only by apps/quick-reads/index.html, after app.js. The stepped demos
   (data-steps) are run by app.js; this file holds the interactive ones. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // ---------- Hero: articles being saved into the queue ----------
    // A few more articles arrive at the top, one at a time, and the oldest
    // drops off the bottom. Once they are all in, the queue rests.

    var ARRIVALS = [
        { letter: 'P', color: '#7c3aed', title: 'The case for reading slowly', author: 'Noor Haddad', source: 'Paper Trail', mins: 8 },
        { letter: 'B', color: '#0f766e', title: 'Notes on building small software', author: 'Eli Brandt', source: 'Bench Notes', mins: 11 },
        { letter: 'T', color: '#b45309', title: 'In praise of the boring tool', author: 'Rosa Whitlock', source: 'The Toolshed', mins: 5 }
    ];

    function initHero() {
        var list = document.querySelector('[data-qr-queue]');
        if (!list || reduceMotion.matches) { return; }
        var next = 0;

        function buildRow(item) {
            var row = document.createElement('div');
            row.className = 'qr-item is-leaving';
            row.innerHTML =
                '<span class="qr-fav" style="--qr-fav: ' + item.color + '">' + item.letter + '</span>' +
                '<div class="qr-item-body">' +
                    '<div class="qr-item-title">' + item.title + '</div>' +
                    '<div class="qr-item-meta"><span>' + item.author + '</span> · ' +
                    '<span class="qr-src">' + item.source + '</span> · ' +
                    '<span data-qr-when data-qr-fresh>Just now</span></div>' +
                '</div>' +
                '<span class="qr-min">' + item.mins + ' min</span>';
            return row;
        }

        function arrive() {
            if (next >= ARRIVALS.length) { return; }
            var rows = all(list, '.qr-item:not(.is-leaving)');
            var last = rows[rows.length - 1];

            // The article that arrived last time is no longer the newest.
            all(list, '[data-qr-fresh]').forEach(function (el) {
                el.removeAttribute('data-qr-fresh');
                el.textContent = 'Moments ago';
            });
            rows.forEach(function (row) { row.classList.remove('is-selected'); });

            var row = buildRow(ARRIVALS[next++]);
            list.insertBefore(row, list.firstChild);
            void row.offsetWidth;   // reflow so the row animates open
            row.classList.remove('is-leaving');
            row.classList.add('is-selected');

            last.classList.add('is-leaving');
            window.setTimeout(function () {
                if (last.parentNode) { last.parentNode.removeChild(last); }
            }, 500);

            window.setTimeout(arrive, 6500);
        }

        window.setTimeout(arrive, 3000);
    }

    // ---------- Highlights ----------
    function initHighlights() {
        var count = document.querySelector('[data-qr-count]');
        if (!count) { return; }
        var passages = all(count.closest('.tile'), '.qr-para');

        function refresh() {
            var n = passages.filter(function (p) {
                return p.getAttribute('aria-pressed') === 'true';
            }).length;
            count.textContent = n + (n === 1 ? ' highlight' : ' highlights');
        }

        passages.forEach(function (passage) {
            passage.addEventListener('click', function () {
                var on = passage.getAttribute('aria-pressed') === 'true';
                passage.setAttribute('aria-pressed', on ? 'false' : 'true');
                refresh();
            });
        });
    }

    // ---------- Save from the browser ----------
    function initSave() {
        var btn = document.querySelector('[data-qr-save]');
        if (!btn) { return; }
        var tile = btn.closest('.tile');
        var status = tile.querySelector('[data-qr-save-status]');

        btn.addEventListener('click', function () {
            var saved = !tile.classList.contains('is-saved');
            tile.classList.toggle('is-saved', saved);
            btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
            status.textContent = saved
                ? 'Saved to your queue. Click again to undo.'
                : 'Click the Quick Reads button in the toolbar.';
        });
    }

    initHero();
    initHighlights();
    initSave();
}());
