/* Quick Notes - live feature demos.
   Loaded only by apps/quick-notes/index.html, after app.js. The stepped
   demo (Lifetime Stats, data-steps) is run by app.js; this file holds the
   hero and the interactive ones. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    function pad(n) {
        return (n < 10 ? '0' : '') + n;
    }

    // The Recording screen shows 00:03, the list shows 0:03.
    function clock(secs) {
        return pad(Math.floor(secs / 60)) + ':' + pad(secs % 60);
    }

    function duration(secs) {
        return Math.floor(secs / 60) + ':' + pad(secs % 60);
    }

    // ---------- Hero: a three second note, recorded and filed ----------
    // The phone rests on the My Notes list. Every so often the Recording
    // screen comes up, counts three seconds, and hands back to the list,
    // where the top note (0:03 long) glows as it lands. With reduced motion
    // the phone simply stays on the list.

    function initHero() {
        var phone = document.querySelector('[data-qn-hero]');
        if (!phone || reduceMotion.matches) { return; }
        var time = phone.querySelector('[data-qn-time]');
        var first = phone.querySelector('.qn-row');
        var LENGTH = 3;

        function finish() {
            phone.classList.remove('is-recording');
            first.classList.remove('is-new');
            void first.offsetWidth;   // reflow so the glow can play again
            first.classList.add('is-new');
            window.setTimeout(record, 9000);
        }

        function record() {
            if (document.hidden) {
                window.setTimeout(record, 2000);
                return;
            }
            var secs = 0;
            time.textContent = clock(0);
            phone.classList.add('is-recording');
            var timer = window.setInterval(function () {
                secs++;
                time.textContent = clock(secs);
                if (secs >= LENGTH) {
                    window.clearInterval(timer);
                    window.setTimeout(finish, 900);
                }
            }, 1000);
        }

        window.setTimeout(record, 2200);
    }

    // ---------- Processed / Original ----------
    function initCleanup() {
        var tile = document.querySelector('[data-qn-demo="cleanup"]');
        if (!tile) { return; }
        var buttons = all(tile, '[data-qn-version]');
        var panes = all(tile, '[data-qn-pane]');
        var copy = tile.querySelector('[data-qn-copy]');
        var copied = tile.querySelector('[data-qn-copied]');
        var touched = false;
        var noteTimer = null;

        function show(version) {
            buttons.forEach(function (btn) {
                var active = btn.getAttribute('data-qn-version') === version;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', active);
            });
            panes.forEach(function (pane) {
                var active = pane.getAttribute('data-qn-pane') === version;
                pane.classList.toggle('is-active', active);
                pane.setAttribute('aria-hidden', !active);
            });
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                touched = true;
                show(btn.getAttribute('data-qn-version'));
            });
        });

        function announce(message) {
            copied.textContent = message;
            copied.classList.add('is-shown');
            window.clearTimeout(noteTimer);
            noteTimer = window.setTimeout(function () {
                copied.classList.remove('is-shown');
            }, 2200);
        }

        // The copy button really copies whichever version is showing.
        copy.addEventListener('click', function () {
            var pane = tile.querySelector('.qn-pane.is-active');
            var text = pane.innerText.trim();
            if (!navigator.clipboard || !navigator.clipboard.writeText) {
                announce('Copying needs a newer browser');
                return;
            }
            navigator.clipboard.writeText(text).then(function () {
                announce('Copied');
            }, function () {
                announce('Your browser blocked the copy');
            });
        });

        show('original');

        // Clean the note up for the visitor, once, so the point lands unprompted.
        var io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) { return; }
            io.disconnect();
            window.setTimeout(function () {
                if (!touched) { show('processed'); }
            }, reduceMotion.matches ? 0 : 1400);
        }, { threshold: 0.6 });
        io.observe(tile);
    }

    // ---------- Record a note ----------
    // Nothing is recorded: the timer is real, the note that lands is a sample.
    var SAMPLES = [
        { title: 'Chapter Two Opening', preview: 'I think chapter two should open at the train station' },
        { title: 'Newsletter Intro Idea', preview: 'Start with the question I get asked the most' },
        { title: 'Interview Follow-Ups', preview: 'Ask her about the first draft and what changed' }
    ];

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function stamp(date) {
        var hours = date.getHours();
        return MONTHS[date.getMonth()] + ' ' + date.getDate() + ' at ' +
            (hours % 12 || 12) + ':' + pad(date.getMinutes()) + (hours < 12 ? ' AM' : ' PM');
    }

    function initRecorder() {
        var tile = document.querySelector('[data-qn-demo="record"]');
        if (!tile) { return; }
        var card = tile.querySelector('.qn-recorder');
        var list = tile.querySelector('[data-qn-list]');
        var time = tile.querySelector('[data-qn-time]');
        var status = tile.querySelector('[data-qn-status]');
        var button = tile.querySelector('[data-qn-record]');
        var label = button.querySelector('span');
        var icon = button.querySelector('i');
        var LIMIT = 20;
        var timer = null;
        var secs = 0;
        var made = 0;
        var fresh = null;

        function buildRow(sample, length) {
            var row = document.createElement('div');
            row.className = 'qn-row is-entering';
            row.innerHTML =
                '<div class="qn-row-body">' +
                    '<div class="qn-row-title">' + sample.title + '</div>' +
                    '<div class="qn-row-preview">' + sample.preview + '</div>' +
                    '<div class="qn-row-meta">' + stamp(new Date()) + ' • ' + duration(length) + '</div>' +
                '</div>' +
                '<i class="ph ph-caret-right"></i>';
            return row;
        }

        function setRecording(on) {
            card.classList.toggle('is-recording', on);
            button.setAttribute('aria-pressed', on);
            label.textContent = on ? 'Stop' : 'Record';
            icon.className = on ? 'ph ph-stop' : 'ph ph-microphone';
        }

        function start() {
            secs = 0;
            time.textContent = clock(0);
            setRecording(true);
            status.textContent = 'Recording. Press Stop when you are done.';
            timer = window.setInterval(function () {
                secs++;
                time.textContent = clock(secs);
                if (secs >= LIMIT) { stop(); }
            }, 1000);
        }

        function stop() {
            window.clearInterval(timer);
            timer = null;
            setRecording(false);

            // Only the newest sample stays, so the card never outgrows itself.
            if (fresh) { list.removeChild(fresh); }
            fresh = buildRow(SAMPLES[made % SAMPLES.length], Math.max(secs, 1));
            made++;
            list.insertBefore(fresh, list.firstChild);
            void fresh.offsetWidth;   // reflow so the row animates open
            fresh.classList.remove('is-entering');
            fresh.classList.add('is-new');
            status.textContent = 'Saved a sample note. In the app, these are your words.';
        }

        button.addEventListener('click', function () {
            if (timer) { stop(); } else { start(); }
        });
    }

    initHero();
    initCleanup();
    initRecorder();
}());
