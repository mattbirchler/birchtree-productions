/* Birchtree Productions - app sub-page behavior.
   Loaded by app sub-pages under apps/ (never by index.html). */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Arm reveal wipes and the card cascade. Until this runs, wipe copy is
    // plain visible text and cards sit at full opacity, so a script failure
    // can never leave content hidden.
    document.body.classList.add('is-armed');

    // Reveal hero copy on load (double rAF so the clip transition has a frame
    // to arm before it animates open).
    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            document.body.classList.add('is-loaded');
        });
    });

    // Fail-safe: if any element never receives .revealed (observer that never
    // fires, a browser quirk), reveal everything rather than leaving copy
    // clipped. A missed animation is a far smaller failure than missing text.
    window.setTimeout(function () {
        document.body.classList.add('is-revealed-all');
    }, 3000);

    function initReveal() {
        var targets = Array.prototype.slice.call(
            document.querySelectorAll('.scroll-reveal')
        );
        if (!targets.length) { return; }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.1 });

        targets.forEach(function (el) { io.observe(el); });
    }

    function initShuffle() {
        // Scoped to section labels only. Do not widen this: scrambling body
        // copy fights Atkinson Hyperlegible Next, chosen for legibility.
        var labels = Array.prototype.slice.call(
            document.querySelectorAll('.section-label')
        );
        if (!labels.length || reduceMotion.matches) { return; }

        var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+=@';
        var DURATION = 600;   // ms for the whole word to settle
        var SETTLE = 0.55;    // fraction of DURATION each char stays scrambled

        function randomGlyph() {
            return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
        }

        function shuffle(el) {
            if (el.dataset.shuffled === 'true') { return; }
            el.dataset.shuffled = 'true';

            var text = el.textContent;
            var start = null;

            function step(now) {
                if (start === null) { start = now; }
                var elapsed = now - start;
                var out = '';
                var settled = 0;

                for (var i = 0; i < text.length; i++) {
                    var ch = text.charAt(i);
                    if (ch === ' ') {
                        out += ' ';
                        settled++;
                        continue;
                    }
                    var charStart = (i / text.length) * DURATION * SETTLE;
                    if (elapsed >= charStart + DURATION * (1 - SETTLE)) {
                        out += ch;
                        settled++;
                    } else {
                        out += randomGlyph();
                    }
                }

                el.textContent = out;

                if (settled < text.length) {
                    window.requestAnimationFrame(step);
                } else {
                    el.textContent = text;
                }
            }

            window.requestAnimationFrame(step);
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    shuffle(entry.target);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        labels.forEach(function (label) { io.observe(label); });
    }

    function initDrift() {
        // Gentle scroll-linked float on feature screenshots: the parallax
        // band's DNA, applied per-image at a fraction of the amplitude.
        var items = Array.prototype.slice.call(
            document.querySelectorAll('[data-drift]')
        );
        if (!items.length || reduceMotion.matches) { return; }

        var MAX_SHIFT = 20;   // px cap so drift never collides with neighbors
        var frame = null;

        function update() {
            frame = null;
            var vh = window.innerHeight;
            items.forEach(function (el) {
                var box = el.getBoundingClientRect();
                if (box.bottom < 0 || box.top > vh) { return; }
                var factor = parseFloat(el.getAttribute('data-drift')) || 0;
                // -1 when just below the viewport, +1 just above.
                var progress = (vh / 2 - (box.top + box.height / 2)) /
                               ((vh + box.height) / 2);
                var shift = progress * factor * box.height;
                if (shift > MAX_SHIFT) { shift = MAX_SHIFT; }
                if (shift < -MAX_SHIFT) { shift = -MAX_SHIFT; }
                el.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
            });
        }

        function schedule() {
            if (frame === null) {
                frame = window.requestAnimationFrame(update);
            }
        }

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        schedule();
    }

    function initPricingToggle() {
        var buttons = Array.prototype.slice.call(
            document.querySelectorAll('[data-plan]')
        );
        if (!buttons.length) { return; }

        var swap = document.querySelector('.pricing-swap');
        var panes = Array.prototype.slice.call(
            document.querySelectorAll('[data-pricing-pane]')
        );

        function show(plan) {
            panes.forEach(function (p) {
                p.style.display =
                    p.getAttribute('data-pricing-pane') === plan ? '' : 'none';
            });
            buttons.forEach(function (b) {
                b.classList.toggle('active',
                    b.getAttribute('data-plan') === plan);
            });
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var plan = btn.getAttribute('data-plan');
                if (reduceMotion.matches || !swap) {
                    show(plan);
                    return;
                }
                swap.classList.add('swapping');
                window.setTimeout(function () {
                    show(plan);
                    void swap.offsetWidth;   // reflow so the fade-back animates
                    swap.classList.remove('swapping');
                }, 150);
            });
        });
    }

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

    function initYear() {
        var el = document.getElementById('current-year');
        if (el) { el.textContent = new Date().getFullYear(); }
    }

    initReveal();
    initShuffle();
    initDrift();
    initPricingToggle();
    initSteppedDemos();
    initYear();

    window.__calmAppReduceMotion = reduceMotion;
}());
