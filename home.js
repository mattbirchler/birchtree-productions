/* Birchtree Productions homepage behavior.
   Loaded only by index.html. */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function initStage() {
        var stage = document.getElementById('stage');
        if (!stage) { return; }

        // .stage-rings is nested inside .stage-center (not a sibling of
        // .stage), and .stage-center is the element actually centered on
        // the mark - on narrow widths .stage grows a second grid row for
        // .stage-copy, so .stage's own bounding box is no longer centered
        // on the rings. .stage-center's box is the correct reference on
        // every breakpoint.
        var stageCenter = stage.querySelector('.stage-center') || stage;

        var rings = Array.prototype.slice.call(
            stage.querySelectorAll('.stage-ring')
        );
        var icons = Array.prototype.slice.call(
            stage.querySelectorAll('.stage-icon')
        );
        if (!icons.length) { return; }

        var MAX_PULL = 20;      // px an icon can travel toward the cursor
        var FALLOFF = 260;      // px at which the pull reaches zero
        var DRAG_RATE = {       // deg of spin per px dragged, per ring
            outer: 0.06,
            mid: 0.11,
            inner: 0.18
        };
        var FRICTION = 0.94;    // momentum decay per frame
        var MIN_VELOCITY = 0.01;

        var spin = { outer: 0, mid: 0, inner: 0 };
        var velocity = 0;
        var pointer = null;
        var dragging = false;
        var activePointerId = null;
        var lastX = 0;
        var frame = null;
        var measureFrame = null;

        function ringRadiusPx(ring) {
            // --radius is authored in vmin (desktop) or vw (mobile), so
            // resolve it against a real element rather than trying to
            // parse the unit ourselves.
            var raw = getComputedStyle(ring).getPropertyValue('--radius').trim();
            var probe = document.createElement('div');
            probe.style.position = 'absolute';
            probe.style.visibility = 'hidden';
            probe.style.width = raw;
            stage.appendChild(probe);
            var px = probe.getBoundingClientRect().width;
            stage.removeChild(probe);
            return px;
        }

        function applySpin() {
            rings.forEach(function (ring) {
                var key = ring.getAttribute('data-ring');
                ring.style.setProperty('--spin', spin[key] + 'deg');
            });
        }

        function applyMagnetic() {
            if (!pointer) {
                icons.forEach(function (icon) {
                    icon.style.setProperty('--mx', '0px');
                    icon.style.setProperty('--my', '0px');
                });
                return;
            }

            var centerBox = stageCenter.getBoundingClientRect();
            var cx = centerBox.left + centerBox.width / 2;
            var cy = centerBox.top + centerBox.height / 2;

            // .stage clips overflow, so the final rendered position of an
            // icon (rest position plus magnetic offset) must stay inside
            // its visible box, inset by the icon's own half-size, or the
            // pull could push part of an icon past the clip edge - this
            // happens in practice for the outer ring in a narrow desktop
            // window, where the resting icon already sits only ~10-16px
            // from the edge.
            var stageBox = stage.getBoundingClientRect();

            icons.forEach(function (icon) {
                var ring = icon.parentNode;
                var key = ring.getAttribute('data-ring');
                var radius = parseFloat(ring.dataset.radiusPx) || 0;
                var angleDeg = parseFloat(
                    getComputedStyle(icon).getPropertyValue('--angle')
                ) || 0;
                var theta = (angleDeg + spin[key]) * Math.PI / 180;

                // Rest position computed analytically, so reading it back is
                // never contaminated by the offset we are about to apply.
                var restX = cx + Math.sin(theta) * radius;
                var restY = cy - Math.cos(theta) * radius;

                var dx = pointer.x - restX;
                var dy = pointer.y - restY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var strength = Math.max(0, 1 - dist / FALLOFF);
                var pull = strength * strength * MAX_PULL;

                if (dist < 0.5) {
                    icon.style.setProperty('--mx', '0px');
                    icon.style.setProperty('--my', '0px');
                    return;
                }

                var targetX = restX + (dx / dist) * pull;
                var targetY = restY + (dy / dist) * pull;

                // Clamp the target point (not just the offset) to the
                // visible stage, inset by half the icon's own size.
                var half = parseFloat(icon.dataset.halfPx) || 0;
                var minX = stageBox.left + half;
                var maxX = stageBox.right - half;
                var minY = stageBox.top + half;
                var maxY = stageBox.bottom - half;
                if (minX <= maxX) {
                    targetX = Math.min(Math.max(targetX, minX), maxX);
                }
                if (minY <= maxY) {
                    targetY = Math.min(Math.max(targetY, minY), maxY);
                }

                icon.style.setProperty('--mx', (targetX - restX).toFixed(2) + 'px');
                icon.style.setProperty('--my', (targetY - restY).toFixed(2) + 'px');
            });
        }

        function tick() {
            frame = null;

            if (!dragging && Math.abs(velocity) > MIN_VELOCITY) {
                Object.keys(spin).forEach(function (key) {
                    spin[key] += velocity * DRAG_RATE[key];
                });
                velocity *= FRICTION;
                applySpin();
                schedule();
            } else if (!dragging) {
                velocity = 0;
            }

            applyMagnetic();
        }

        function schedule() {
            if (frame === null) {
                frame = window.requestAnimationFrame(tick);
            }
        }

        function measure() {
            rings.forEach(function (ring) {
                ring.dataset.radiusPx = ringRadiusPx(ring);
            });
            icons.forEach(function (icon) {
                // width is a real CSS property (unlike --radius), so
                // getComputedStyle resolves it straight to pixels.
                icon.dataset.halfPx = parseFloat(getComputedStyle(icon).width) / 2 || 0;
            });
            schedule();
        }

        // resize fires continuously during a window drag-resize, and
        // measure() forces a synchronous layout per ring (append/measure/
        // remove) plus a getComputedStyle read per icon - coalesce bursts
        // into a single measure per animation frame rather than layout-
        // thrashing on every tick. A breakpoint change (vmin <-> vw ring
        // radii) is still picked up correctly since the deferred call still
        // runs after the resize settles.
        function scheduleMeasure() {
            if (measureFrame !== null) {
                window.cancelAnimationFrame(measureFrame);
            }
            measureFrame = window.requestAnimationFrame(function () {
                measureFrame = null;
                measure();
            });
        }

        // Magnetic hover is pointer-driven, so it only makes sense where a
        // hovering pointer exists.
        var canHover = window.matchMedia('(hover: hover)').matches;

        if (canHover && !reduceMotion.matches) {
            stage.addEventListener('pointermove', function (e) {
                if (e.pointerType !== 'mouse') { return; }
                pointer = { x: e.clientX, y: e.clientY };
                stage.classList.add('is-tracking');
                schedule();
            });

            stage.addEventListener('pointerleave', function () {
                pointer = null;
                stage.classList.remove('is-tracking');
                schedule();
            });
        }

        if (!reduceMotion.matches) {
            stage.style.cursor = 'grab';

            stage.addEventListener('pointerdown', function (e) {
                if (e.button !== 0) { return; }
                // Ignore a second simultaneous pointer rather than trying to
                // support real multi-touch gestures - a single drag stays
                // immune to an interleaved second pointer.
                if (dragging) { return; }
                dragging = true;
                activePointerId = e.pointerId;
                lastX = e.clientX;
                velocity = 0;
                stage.style.cursor = 'grabbing';
                try {
                    stage.setPointerCapture(e.pointerId);
                } catch (err) {
                    // A stale/inactive pointerId (or a touch-cancellation
                    // race) can throw NotFoundError here. dragging is
                    // already true and the pointerId is already recorded,
                    // so the drag still works - it just degrades to
                    // tracking only while the pointer stays over .stage,
                    // instead of continuing to track past its edges.
                }
            });

            stage.addEventListener('pointermove', function (e) {
                if (!dragging || e.pointerId !== activePointerId) { return; }
                var dx = e.clientX - lastX;
                lastX = e.clientX;
                velocity = dx;
                Object.keys(spin).forEach(function (key) {
                    spin[key] += dx * DRAG_RATE[key];
                });
                applySpin();
                schedule();
            });

            function endDrag(e) {
                if (!dragging) { return; }
                if (e && e.pointerId !== undefined &&
                    e.pointerId !== activePointerId) {
                    return;
                }
                dragging = false;
                activePointerId = null;
                stage.style.cursor = 'grab';
                if (e && e.pointerId !== undefined &&
                    stage.hasPointerCapture(e.pointerId)) {
                    stage.releasePointerCapture(e.pointerId);
                }
                schedule();
            }

            stage.addEventListener('pointerup', endDrag);
            stage.addEventListener('pointercancel', endDrag);
        }

        window.addEventListener('resize', scheduleMeasure);
        measure();
    }

    // Arm the reveal wipes. Until this runs, .wipe copy is plain visible text
    // (see the .is-armed note in home.css), so a script failure can never
    // leave the page with invisible headings.
    document.body.classList.add('is-armed');

    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            document.body.classList.add('is-loaded');
        });
    });

    // Second fail-safe: if an element somehow never receives .revealed (an
    // observer that does not fire, a browser quirk, a zero-area target),
    // reveal everything rather than leaving copy permanently clipped. A
    // missed animation is a far smaller failure than missing text.
    window.setTimeout(function () {
        document.body.classList.add('is-revealed-all');
    }, 3000);

    function initBand() {
        var band = document.querySelector('.band');
        if (!band || reduceMotion.matches) { return; }

        var cols = Array.prototype.slice.call(band.querySelectorAll('.band-col'));
        if (!cols.length) { return; }

        var frame = null;
        var visible = false;

        function update() {
            frame = null;
            if (!visible) { return; }

            var box = band.getBoundingClientRect();
            // -1 when the band sits just below the viewport, +1 just above.
            var progress = (window.innerHeight / 2 - (box.top + box.height / 2)) /
                           ((window.innerHeight + box.height) / 2);

            cols.forEach(function (col) {
                var speed = parseFloat(col.getAttribute('data-speed')) || 0;
                var shift = progress * speed * box.height;
                col.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
            });
        }

        function schedule() {
            if (frame === null) {
                frame = window.requestAnimationFrame(update);
            }
        }

        // Only run the scroll handler while the band is actually on screen.
        var io = new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible) { schedule(); }
        }, { rootMargin: '100px' });
        io.observe(band);

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        schedule();
    }

    function initShuffle() {
        // Deliberately scoped to section labels only. Do not widen this
        // selector: scrambling body copy fights Atkinson Hyperlegible Next,
        // which this site uses specifically for legibility.
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
                    // Each character settles slightly later than the one
                    // before it, so the word resolves left to right.
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
                    // Always restore the exact original string, so a dropped
                    // frame can never leave a stray glyph behind.
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

    initStage();
    initBand();
    initShuffle();

    window.__calmReduceMotion = reduceMotion;
}());
