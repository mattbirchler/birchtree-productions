/* Birchtree Productions homepage behavior.
   Loaded only by index.html. The page is fully readable without this file:
   reveals are armed by the `js` class set in <head>, and every revealed
   element falls back to visible if the observer never fires. */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Footer year
    var year = document.getElementById('current-year');
    if (year) { year.textContent = new Date().getFullYear(); }

    // Nav picks up a shadow once the page scrolls under it
    var nav = document.querySelector('.navbar');
    function onScroll() {
        if (nav) { nav.classList.toggle('scrolled', window.scrollY > 24); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Scroll reveals. Tiles in the same row get a small stagger.
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (reduceMotion || !('IntersectionObserver' in window)) {
        items.forEach(function (el) { el.classList.add('in-view'); });
    } else {
        var fired = false;
        var observer = new IntersectionObserver(function (entries) {
            fired = true;
            var batch = entries.filter(function (e) { return e.isIntersecting; });
            batch.forEach(function (entry, n) {
                entry.target.style.setProperty('--delay', (Math.min(n, 3) * 70) + 'ms');
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
        items.forEach(function (el) { observer.observe(el); });

        // Fail-safe: if the observer never reports at all, show everything.
        window.setTimeout(function () {
            if (fired) { return; }
            items.forEach(function (el) { el.classList.add('in-view'); });
        }, 4000);
    }

    // Return to the same spot after visiting an app page
    try {
        var saved = sessionStorage.getItem('homeScrollPosition');
        if (saved) {
            window.scrollTo(0, parseInt(saved, 10));
            sessionStorage.removeItem('homeScrollPosition');
        }
        document.querySelectorAll('a[href^="apps/"]').forEach(function (link) {
            link.addEventListener('click', function () {
                sessionStorage.setItem('homeScrollPosition', window.scrollY);
            });
        });
    } catch (e) { /* storage unavailable */ }

    root.classList.add('home-ready');
})();
