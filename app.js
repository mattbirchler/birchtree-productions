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

    function initYear() {
        var el = document.getElementById('current-year');
        if (el) { el.textContent = new Date().getFullYear(); }
    }

    initReveal();
    initShuffle();
    initDrift();
    initPricingToggle();
    initYear();

    window.__calmAppReduceMotion = reduceMotion;
}());
