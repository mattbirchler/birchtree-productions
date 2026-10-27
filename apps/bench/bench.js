/* Bench - page-local demo behavior. Loaded only by apps/bench/index.html,
   after app.js (which runs the stepped demos). */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // Running timers ("2m 03s") for sessions that are working.
    function initTimers() {
        var timers = all(document, '[data-timer]');
        if (!timers.length) { return; }

        function format(secs) {
            var m = Math.floor(secs / 60);
            var s = secs % 60;
            return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
        }

        var start = Date.now();
        window.setInterval(function () {
            var elapsed = Math.floor((Date.now() - start) / 1000);
            timers.forEach(function (el) {
                el.textContent = format(parseInt(el.getAttribute('data-timer'), 10) + elapsed);
            });
        }, 1000);
    }

    // Workspace tile: click a project in the sidebar to show its tabs.
    function initWorkspaces() {
        var tile = document.querySelector('[data-demo="workspaces"]');
        if (!tile) { return; }
        var buttons = all(tile, '[data-project]');
        var panes = all(tile, '[data-pane]');

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-project');
                buttons.forEach(function (b) {
                    var on = b === btn;
                    b.classList.toggle('is-selected', on);
                    b.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                panes.forEach(function (p) {
                    p.hidden = p.getAttribute('data-pane') !== id;
                });
            });
        });
    }

    // Phone tile: answer the permission prompt.
    function initPhone() {
        var tile = document.querySelector('[data-demo="phone"]');
        if (!tile) { return; }
        var perm = tile.querySelector('.bn-perm');
        var result = tile.querySelector('.bn-phone-result');
        var reset = tile.querySelector('[data-phone-reset]');
        var timer = null;

        function say(icon, text, cls) {
            result.className = 'bn-reply bn-phone-result ' + (cls || '');
            result.innerHTML = '';
            var i = document.createElement('i');
            i.className = 'ph ' + icon;
            result.appendChild(i);
            result.appendChild(document.createTextNode(text));
            result.hidden = false;
        }

        all(tile, '[data-perm]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                perm.hidden = true;
                reset.hidden = false;
                window.clearTimeout(timer);
                if (btn.getAttribute('data-perm') === 'allow') {
                    say('ph-asterisk', 'Running npm run build…');
                    timer = window.setTimeout(function () {
                        say('ph-check-circle', 'The build passed. The pricing page is ready to review.', 'is-allowed');
                    }, 1400);
                } else {
                    say('ph-asterisk', 'Okay, I won’t run the build. Want me to check anything else?');
                }
                reset.focus();
            });
        });

        reset.addEventListener('click', function () {
            window.clearTimeout(timer);
            result.hidden = true;
            perm.hidden = false;
            reset.hidden = true;
            tile.querySelector('.bn-allow').focus();
        });
    }

    initTimers();
    initWorkspaces();
    initPhone();
}());
