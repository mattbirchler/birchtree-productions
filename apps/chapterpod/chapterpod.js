/* Chapterize - live feature demos.
   Loaded only by apps/chapterpod/index.html, after app.js. The stepped demos
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

    // 4173 -> "1:09:33", 102 -> "1:42"
    function formatTime(secs) {
        var h = Math.floor(secs / 3600);
        var m = Math.floor((secs % 3600) / 60);
        var s = secs % 60;
        var tail = (s < 10 ? '0' : '') + s;
        if (h > 0) {
            return h + ':' + (m < 10 ? '0' : '') + m + ':' + tail;
        }
        return m + ':' + tail;
    }

    // Run a callback once, the first time an element is mostly on screen.
    function onceVisible(el, callback) {
        var io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) { return; }
            io.disconnect();
            callback();
        }, { threshold: 0.6 });
        io.observe(el);
    }

    // ---------- Hero: the episode playing in real time ----------
    // One second per second, so the clock ticks and the bar barely creeps.
    // With reduced motion the window stays paused where the markup left it.

    function initHero() {
        var win = document.querySelector('[data-hero-player]');
        if (!win || reduceMotion.matches) { return; }
        var clock = win.querySelector('[data-clock]');
        var fill = win.querySelector('[data-fill]');
        var time = parseInt(win.getAttribute('data-time'), 10);
        var total = parseInt(win.getAttribute('data-total'), 10);

        win.classList.add('is-playing');
        var timer = window.setInterval(function () {
            time++;
            if (time >= total) {
                time = total;
                window.clearInterval(timer);
                win.classList.remove('is-playing');
            }
            clock.textContent = formatTime(time);
            fill.style.transform = 'scaleX(' + (time / total).toFixed(4) + ')';
        }, 1000);
    }

    // ---------- Mark chapters as you listen ----------
    // The episode runs fast enough to watch. Pressing + drops a chapter at
    // the playhead, named from the episode's real chapter list.

    var MARK_START = 102;     // 1:42, where the last existing chapter begins
    var MARK_TOTAL = 5772;    // 1:36:12
    var MARK_SPEED = 6;       // episode seconds per 100ms tick
    var MARK_TITLES = [
        'Liquid plastic. You\'re going to love it',
        'Our tech white whales',
        'The Browser Podcast goes main topic'
    ];

    function initMark() {
        var playBtn = document.querySelector('[data-mark-play]');
        if (!playBtn) { return; }
        var tile = playBtn.closest('.tile');
        var addBtn = tile.querySelector('[data-mark-add]');
        var resetBtn = tile.querySelector('[data-mark-reset]');
        var clock = tile.querySelector('[data-mark-clock]');
        var fill = tile.querySelector('[data-mark-fill]');
        var list = tile.querySelector('[data-mark-list]');
        var hint = tile.querySelector('[data-mark-hint]');
        var restHint = hint.textContent;

        var time = MARK_START;
        var added = 0;
        var timer = null;
        var autoTimers = [];
        var touched = false;

        function render() {
            clock.textContent = formatTime(time);
            fill.style.transform = 'scaleX(' + (time / MARK_TOTAL).toFixed(4) + ')';
        }

        function pause() {
            window.clearInterval(timer);
            timer = null;
            playBtn.classList.remove('is-playing');
            playBtn.setAttribute('aria-pressed', 'false');
        }

        function play() {
            if (timer || time >= MARK_TOTAL) { return; }
            playBtn.classList.add('is-playing');
            playBtn.setAttribute('aria-pressed', 'true');
            timer = window.setInterval(function () {
                time = Math.min(time + MARK_SPEED, MARK_TOTAL);
                render();
                if (time >= MARK_TOTAL) { pause(); }
            }, 100);
        }

        function addChapter() {
            if (added >= MARK_TITLES.length) { return; }
            var row = document.createElement('div');
            row.className = 'cp-row is-new is-entering';
            row.innerHTML =
                '<span class="cp-thumb"><i class="ph ph-image"></i></span>' +
                '<span class="cp-tri"></span>' +
                '<span class="cp-time"></span>' +
                '<span class="cp-title"></span>';
            row.querySelector('.cp-time').textContent = formatTime(time);
            row.querySelector('.cp-title').textContent = MARK_TITLES[added];
            list.appendChild(row);
            void row.offsetWidth;   // reflow so the row animates in
            row.classList.remove('is-entering');
            added++;
            if (added >= MARK_TITLES.length) {
                addBtn.disabled = true;
                hint.textContent = 'That\'s the list full. Reset to go again.';
            }
        }

        function stopAuto() {
            touched = true;
            autoTimers.forEach(window.clearTimeout);
            autoTimers = [];
        }

        playBtn.addEventListener('click', function () {
            stopAuto();
            if (timer) { pause(); } else { play(); }
        });

        addBtn.addEventListener('click', function () {
            stopAuto();
            addChapter();
        });

        resetBtn.addEventListener('click', function () {
            stopAuto();
            pause();
            all(list, '.is-new').forEach(function (row) {
                row.parentNode.removeChild(row);
            });
            time = MARK_START;
            added = 0;
            addBtn.disabled = false;
            hint.textContent = restHint;
            render();
        });

        // Show the idea once, unprompted: play, mark one chapter, pause.
        onceVisible(tile, function () {
            if (touched || reduceMotion.matches) { return; }
            play();
            autoTimers.push(window.setTimeout(addChapter, 1800));
            autoTimers.push(window.setTimeout(pause, 4200));
        });
    }

    // ---------- Titles, images, links ----------
    // Each row's image and link are toggles; the titles are real inputs.
    function initDetails() {
        var tile = document.querySelector('[data-demo="details"]');
        if (!tile) { return; }
        var touched = false;

        function setDetail(btn, on) {
            btn.setAttribute('aria-pressed', on);
            btn.classList.toggle('is-set', on);
        }

        all(tile, '[data-detail]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                touched = true;
                setDetail(btn, btn.getAttribute('aria-pressed') !== 'true');
            });
        });

        all(tile, 'input').forEach(function (input) {
            input.addEventListener('focus', function () { touched = true; });
        });

        // Fill in one image and one link, once, so the visitor sees what a
        // click does.
        onceVisible(tile, function () {
            if (touched) { return; }
            var image = all(tile, '[data-detail="image"]')[0];
            var link = all(tile, '[data-detail="link"]')[1];
            if (reduceMotion.matches) {
                setDetail(image, true);
                setDetail(link, true);
                return;
            }
            window.setTimeout(function () {
                if (!touched) { setDetail(image, true); }
            }, 600);
            window.setTimeout(function () {
                if (!touched) { setDetail(link, true); }
            }, 1300);
        });
    }

    // ---------- Import chapters as text ----------
    // One chapter per line: a timestamp, an optional dash, then the title.
    var LINE = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*(?:[-\u2013\u2014]\s*)?(\S.*)$/;

    function initImport() {
        var input = document.querySelector('[data-import-text]');
        if (!input) { return; }
        var tile = input.closest('.tile');
        var list = tile.querySelector('[data-import-list]');
        var count = tile.querySelector('[data-import-count]');

        function parse() {
            var found = 0;
            list.textContent = '';
            input.value.split('\n').forEach(function (line) {
                var match = LINE.exec(line);
                if (!match) { return; }
                var item = document.createElement('li');
                var time = document.createElement('span');
                var title = document.createElement('span');
                time.className = 'cp-time';
                time.textContent = match[1];
                title.className = 'cp-title';
                title.textContent = match[2].trim();
                item.appendChild(time);
                item.appendChild(title);
                list.appendChild(item);
                found++;
            });
            if (!found) {
                var empty = document.createElement('li');
                empty.className = 'cp-preview-empty';
                empty.textContent = 'Try a line like 0:00 - Intro';
                list.appendChild(empty);
            }
            count.textContent = found + (found === 1 ? ' chapter' : ' chapters');
        }

        var touched = false;
        input.addEventListener('input', function () { touched = true; parse(); });
        input.addEventListener('focus', function () { touched = true; });

        // Type one more chapter for the visitor, once, so the preview moves.
        onceVisible(tile, function () {
            if (touched) { return; }
            var base = input.value + '\n';
            var line = input.getAttribute('data-autotype');
            if (reduceMotion.matches) {
                input.value = base + line;
                parse();
                return;
            }
            var i = 0;
            (function type() {
                if (touched || i >= line.length) { return; }
                i++;
                input.value = base + line.substr(0, i);
                parse();
                window.setTimeout(type, 45);
            }());
        });
    }

    // ---------- File formats ----------
    // Picking a format renames the file going in, then replays the stepped
    // conversion that app.js runs for this tile.
    function initFormats() {
        var buttons = all(document, '[data-format]');
        if (!buttons.length) { return; }
        var tile = buttons[0].closest('.tile');
        var ext = tile.querySelector('[data-format-ext]');
        var replay = tile.querySelector('[data-replay]');

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                buttons.forEach(function (b) {
                    b.setAttribute('aria-pressed', b === btn);
                });
                ext.textContent = btn.getAttribute('data-format');
                replay.click();
            });
        });
    }

    initHero();
    initMark();
    initDetails();
    initImport();
    initFormats();
}());
