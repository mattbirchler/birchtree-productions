/* Birchtree Productions homepage behavior.
   Loaded only by index.html. */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Feature modules are registered here in later tasks.

    window.__calmReduceMotion = reduceMotion;
}());
