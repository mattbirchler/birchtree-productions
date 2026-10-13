/* Weave - live feature demos.
   Loaded only by apps/weave/index.html, after app.js. Every demo here is
   interactive; with no JS (or with reduced motion) each one rests in the
   static state written into the HTML. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var RING = 56.5;   // circumference of the counter ring (r = 9)

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // Run fn once, the first time el is mostly in view.
    function onceVisible(el, fn) {
        var io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) { return; }
            io.disconnect();
            fn();
        }, { threshold: 0.5 });
        io.observe(el);
    }

    // ---------- Character counter ----------
    // Remaining count plus a ring that goes gray, accent, orange, red.
    function setCounter(el, used, limit) {
        var ratio = limit ? used / limit : 0;
        var level = 'low';
        if (ratio > 1) { level = 'over'; }
        else if (ratio >= 0.9) { level = 'high'; }
        else if (ratio >= 0.5) { level = 'mid'; }
        el.setAttribute('data-level', level);
        el.querySelector('[data-num]').textContent = limit ? limit - used : '';
        el.querySelector('.wv-ring-fill').style.strokeDashoffset =
            (RING * (1 - Math.min(ratio, 1))).toFixed(1);
    }

    // ---------- Hero: a post being written ----------
    function initHero() {
        var text = document.querySelector('[data-hero-type]');
        var counter = document.querySelector('[data-hero-count]');
        if (!text || !counter) { return; }
        var full = text.textContent;
        var LIMIT = 300;

        setCounter(counter, full.length, LIMIT);
        if (reduceMotion.matches) { return; }

        var i = 0;
        text.textContent = '';
        setCounter(counter, 0, LIMIT);
        window.setTimeout(function type() {
            i++;
            text.textContent = full.substr(0, i);
            setCounter(counter, i, LIMIT);
            if (i < full.length) { window.setTimeout(type, 55); }
        }, 900);
    }

    // ---------- Platform picker and the tightest limit ----------
    function initPlatforms() {
        var tile = document.querySelector('[data-demo="platforms"]');
        if (!tile) { return; }
        var buttons = all(tile, '[data-limit]');
        var counter = tile.querySelector('.wv-count');
        var dot = counter.querySelector('.wv-dot');
        var note = tile.querySelector('.wv-limit');
        var used = tile.querySelector('.wv-draft-text').textContent.trim().length;

        function refresh() {
            var tight = null;
            buttons.forEach(function (btn) {
                if (btn.getAttribute('aria-pressed') !== 'true') { return; }
                var limit = parseInt(btn.getAttribute('data-limit'), 10);
                if (!tight || limit < tight.limit) {
                    tight = {
                        limit: limit,
                        name: btn.getAttribute('data-name'),
                        color: btn.style.getPropertyValue('--wv-plat')
                    };
                }
            });

            note.classList.remove('is-over');
            if (!tight) {
                setCounter(counter, 0, 0);
                dot.style.removeProperty('--wv-plat');
                note.textContent = 'Pick at least one platform.';
                return;
            }
            setCounter(counter, used, tight.limit);
            dot.style.setProperty('--wv-plat', tight.color);
            if (used > tight.limit) {
                note.classList.add('is-over');
                note.textContent = (used - tight.limit) + ' characters over the limit for ' + tight.name + '.';
            } else {
                note.textContent = 'Tightest limit: ' + tight.name + ', ' + tight.limit + ' characters.';
            }
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var on = btn.getAttribute('aria-pressed') === 'true';
                btn.setAttribute('aria-pressed', on ? 'false' : 'true');
                refresh();
            });
        });
        refresh();
    }

    // ---------- Thread composer ----------
    // Three newlines in a post split it: what follows becomes the next post.
    function initThread() {
        var tile = document.querySelector('[data-demo="thread"]');
        if (!tile) { return; }
        var list = tile.querySelector('[data-thread]');
        var keys = all(tile, '.wv-keys kbd');
        var replay = tile.querySelector('[data-wv-replay]');
        var LIMIT = 300;
        var MAX_POSTS = 4;
        var SCRIPT = [
            { type: 'Here’s your first post.' },
            { split: true },
            { type: 'And here’s the second.' }
        ];
        var touched = false;
        var timer = null;

        function posts() {
            return all(list, '.wv-post');
        }

        function fit(input) {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        }

        function renumber() {
            var items = posts();
            items.forEach(function (post, i) {
                var n = i + 1;
                var input = post.querySelector('.wv-input');
                post.querySelector('.wv-num').textContent = n;
                post.querySelector('.wv-post-label').textContent = 'Post ' + n;
                input.setAttribute('aria-label', 'Post ' + n);
                var remove = post.querySelector('.wv-remove');
                remove.setAttribute('aria-label', 'Remove post ' + n);
                remove.hidden = items.length === 1;
                setCounter(post.querySelector('.wv-count'), input.value.length, LIMIT);
                fit(input);
            });
        }

        function buildPost(text) {
            var post = document.createElement('div');
            post.className = 'wv-post';
            post.innerHTML =
                '<span class="wv-num" aria-hidden="true"></span>' +
                '<div class="wv-post-card">' +
                    '<div class="wv-post-head">' +
                        '<span class="wv-post-label"></span>' +
                        '<button type="button" class="wv-remove"><i class="ph ph-x" aria-hidden="true"></i></button>' +
                    '</div>' +
                    '<textarea class="wv-input" rows="1" spellcheck="false"></textarea>' +
                    '<div class="wv-post-foot">' +
                        '<span class="wv-media" aria-hidden="true"><i class="ph ph-image"></i> Add Media</span>' +
                        '<span class="wv-count" data-level="low" aria-hidden="true">' +
                            '<span class="wv-dot" style="--wv-plat: #0085ff"></span><span data-num></span>' +
                            '<svg class="wv-ring" viewBox="0 0 24 24"><circle class="wv-ring-track" cx="12" cy="12" r="9"/><circle class="wv-ring-fill" cx="12" cy="12" r="9"/></svg>' +
                        '</span>' +
                    '</div>' +
                '</div>';
            var input = post.querySelector('.wv-input');
            input.value = text;

            input.addEventListener('input', function () {
                stop();
                handle(input, true);
            });
            input.addEventListener('focus', stop);
            post.querySelector('.wv-remove').addEventListener('click', function () {
                stop();
                var items = posts();
                var at = items.indexOf(post);
                list.removeChild(post);
                renumber();
                var next = posts()[Math.max(at - 1, 0)];
                if (next) { next.querySelector('.wv-input').focus(); }
            });
            return post;
        }

        // Split on a triple newline, then refresh numbers and counters.
        function handle(input, focus) {
            var value = input.value;
            var at = value.indexOf('\n\n\n');
            if (at !== -1 && posts().length < MAX_POSTS) {
                var post = buildPost(value.substr(at + 3).replace(/^\n+/, ''));
                input.value = value.substr(0, at);
                list.insertBefore(post, input.closest('.wv-post').nextSibling);
                var next = post.querySelector('.wv-input');
                if (focus) {
                    next.focus();
                    next.setSelectionRange(0, 0);
                }
                // Pasted text can hold more than one break.
                handle(next, false);
                return;
            }
            renumber();
        }

        function reset(texts) {
            list.textContent = '';
            texts.forEach(function (text) {
                list.appendChild(buildPost(text));
            });
            renumber();
        }

        function stop() {
            touched = true;
            window.clearTimeout(timer);
            keys.forEach(function (key) { key.classList.remove('is-hit'); });
        }

        // Type the sample thread for the visitor, pressing Return three
        // times in the middle so the split is seen happening.
        function play() {
            window.clearTimeout(timer);
            touched = false;
            reset(['']);
            var step = 0;
            var i = 0;

            function last() {
                var items = posts();
                return items[items.length - 1].querySelector('.wv-input');
            }

            (function tick() {
                if (touched || step >= SCRIPT.length) { return; }
                var part = SCRIPT[step];
                var input = last();
                var delay = 60;
                if (part.split) {
                    if (i < 3) {
                        keys[i].classList.add('is-hit');
                        input.value += '\n';
                        i++;
                        delay = 320;
                    }
                    if (i === 3) {
                        handle(input, false);
                        step++;
                        i = 0;
                        delay = 500;
                    }
                } else {
                    i++;
                    input.value = part.type.substr(0, i);
                    handle(input, false);
                    if (i >= part.type.length) {
                        step++;
                        i = 0;
                        delay = 450;
                        keys.forEach(function (key) { key.classList.remove('is-hit'); });
                    }
                }
                timer = window.setTimeout(tick, delay);
            }());
        }

        // Take over the static markup, keeping the text it shipped with.
        reset(all(list, '.wv-input').map(function (input) { return input.value; }));
        window.addEventListener('resize', renumber);

        if (replay) { replay.addEventListener('click', play); }
        onceVisible(tile, function () {
            if (!touched && !reduceMotion.matches) { play(); }
        });
    }

    // ---------- Natural language scheduling ----------
    // A small stand-in for the on-device parser: enough to understand the
    // phrases the page quotes and their close relatives.
    var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    var WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

    function parseTime(text, date) {
        if (/\bnoon\b/.test(text)) { date.setHours(12, 0, 0, 0); return true; }
        if (/\bmidnight\b/.test(text)) { date.setHours(0, 0, 0, 0); return true; }
        var m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) ||
                text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/) ||
                text.match(/\b(\d{1,2}):(\d{2})\b/);
        if (!m) { return false; }
        var hour = parseInt(m[1], 10);
        var mins = m[2] ? parseInt(m[2], 10) : 0;
        if (hour > 23 || mins > 59) { return false; }
        if (m[3] === 'pm' && hour < 12) { hour += 12; }
        if (m[3] === 'am' && hour === 12) { hour = 0; }
        date.setHours(hour, mins, 0, 0);
        return true;
    }

    function parseWhen(raw) {
        var text = raw.toLowerCase().trim();
        var now = new Date();
        var date = new Date(now.getTime());
        var m = text.match(/\bin\s+(\d+|an?|one|two|three|four|five|six)\s*(minute|min|hour|hr|day|week)s?\b/);
        if (m) {
            var n = WORDS[m[1]] || parseInt(m[1], 10);
            var unit = m[2];
            var ms = unit === 'week' ? 6048e5 : unit === 'day' ? 864e5 :
                     (unit === 'hour' || unit === 'hr') ? 36e5 : 6e4;
            return new Date(now.getTime() + n * ms);
        }

        var hasDay = false;
        if (/\btomorrow\b/.test(text)) {
            date.setDate(date.getDate() + 1);
            hasDay = true;
        } else if (/\b(today|tonight)\b/.test(text)) {
            hasDay = true;
        } else {
            DAYS.forEach(function (name, index) {
                if (hasDay || text.indexOf(name) === -1) { return; }
                var ahead = (index - now.getDay() + 7) % 7 || 7;
                date.setDate(date.getDate() + ahead);
                hasDay = true;
            });
        }

        var hasTime = parseTime(text, date);
        if (!hasDay && !hasTime) { return null; }
        // A bare time that has already passed today means tomorrow.
        if (!hasDay && date <= now) { date.setDate(date.getDate() + 1); }
        return date;
    }

    function formatWhen(date) {
        var hour = date.getHours();
        var mins = date.getMinutes();
        return (date.getMonth() + 1) + '/' + date.getDate() + '/' +
            String(date.getFullYear()).substr(2) + ', ' +
            (hour % 12 || 12) + ':' + (mins < 10 ? '0' : '') + mins +
            (hour < 12 ? ' AM' : ' PM');
    }

    function initSchedule() {
        var tile = document.querySelector('[data-demo="schedule"]');
        if (!tile) { return; }
        var input = tile.querySelector('[data-when-input]');
        var out = tile.querySelector('.wv-go');
        var label = out.querySelector('span');
        var touched = false;
        var timer = null;

        function update() {
            var value = input.value.trim();
            var date = value ? parseWhen(value) : null;
            out.classList.toggle('is-idle', !date);
            if (date) {
                label.textContent = 'Schedule for ' + formatWhen(date);
            } else {
                label.textContent = value ? 'Try one of the examples' : 'Type a time';
            }
        }

        function type(phrase) {
            window.clearTimeout(timer);
            if (reduceMotion.matches) {
                input.value = phrase;
                update();
                return;
            }
            var i = 0;
            (function tick() {
                i++;
                input.value = phrase.substr(0, i);
                update();
                if (i < phrase.length) { timer = window.setTimeout(tick, 60); }
            }());
        }

        input.addEventListener('input', function () {
            touched = true;
            window.clearTimeout(timer);
            update();
        });
        input.addEventListener('focus', function () { touched = true; });

        all(tile, '[data-phrase]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                touched = true;
                type(btn.getAttribute('data-phrase'));
            });
        });

        // Type one phrase for the visitor, once, so the point lands unprompted.
        onceVisible(tile, function () {
            if (!touched) { type(input.getAttribute('data-autotype')); }
        });
    }

    // ---------- Queue and date picker ----------
    function initPicker() {
        var tile = document.querySelector('[data-demo="picker"]');
        if (!tile) { return; }
        var queue = tile.querySelector('.wv-queue');
        var days = all(tile, '[data-day]');
        var label = tile.querySelector('.wv-go span');
        var icon = tile.querySelector('.wv-go i');

        function pick(day) {
            days.forEach(function (btn) {
                btn.setAttribute('aria-pressed', btn === day ? 'true' : 'false');
            });
            queue.setAttribute('aria-pressed', day ? 'false' : 'true');
            icon.className = day ? 'ph ph-clock' : 'ph ph-check';
            label.textContent = day ?
                'Schedule for 2/' + day.getAttribute('data-day') + '/26, 8:48 AM' :
                'Added to your queue';
        }

        days.forEach(function (btn) {
            btn.addEventListener('click', function () { pick(btn); });
        });
        queue.addEventListener('click', function () {
            // Tapping the queue row again goes back to the picked date.
            pick(queue.getAttribute('aria-pressed') === 'true' ? days[0] : null);
        });
    }

    // ---------- Native feel: appearance and the publish sheet ----------
    function initNative() {
        var tile = document.querySelector('[data-demo="native"]');
        if (!tile) { return; }
        var phone = tile.querySelector('.wv-phone');
        var modes = all(tile, '[data-mode]');
        var open = tile.querySelector('[data-sheet-open]');
        var close = tile.querySelector('[data-sheet-close]');

        modes.forEach(function (btn) {
            btn.addEventListener('click', function () {
                phone.classList.toggle('is-dark', btn.getAttribute('data-mode') === 'dark');
                modes.forEach(function (other) {
                    other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
                });
            });
        });

        function sheet(show) {
            phone.classList.toggle('is-sheet', show);
            open.setAttribute('aria-expanded', show ? 'true' : 'false');
            (show ? close : open).focus({ preventScroll: true });
        }

        open.addEventListener('click', function () { sheet(true); });
        close.addEventListener('click', function () { sheet(false); });
    }

    initHero();
    initPlatforms();
    initThread();
    initSchedule();
    initPicker();
    initNative();
}());
