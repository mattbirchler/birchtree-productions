/* Birchfeed - live feature demos.
   Loaded only by apps/birchfeed/index.html, after app.js. The stepped demos
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

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) { node.className = className; }
        if (text) { node.textContent = text; }
        return node;
    }

    // ---------- Hero: new articles arriving in the reader ----------
    // Every few seconds one article lands at the top of the list and the
    // unread counts tick up. With reduced motion the list simply rests.

    var ARRIVALS = [
        { key: 'tinkerer', feed: 'The Tinkerer', color: '#3b82c4',
          title: 'A tiny script that saved my afternoon',
          excerpt: 'Twelve lines, written in a hurry, that I now run every single day.' },
        { key: 'indie', feed: 'Indie Dispatch', color: '#d9912b',
          title: 'Three small apps worth your weekend',
          excerpt: 'None of them want an account, and all of them do one thing well.' },
        { key: 'slow', feed: 'Slow Web Weekly', color: '#2f7d5b',
          title: 'Blogs are still the best part of the web',
          excerpt: 'A reading list of personal sites that have been quietly publishing for years.' },
        { key: 'birchtree', feed: 'Birchtree', color: '#8839ef',
          title: 'The feeds I would never unsubscribe from',
          excerpt: 'A short list of writers who make the whole habit worth keeping.' }
    ];
    var HERO_ROWS = 7;
    var HERO_EVERY = 6000;

    function initHero() {
        var list = document.querySelector('[data-hero-list]');
        if (!list || reduceMotion.matches) { return; }
        var total = document.querySelector('[data-hero-count]');
        var next = 0;

        function bump(node) {
            if (!node) { return; }
            node.textContent = (parseInt(node.textContent, 10) || 0) + 1;
        }

        function buildArticle(item) {
            var row = el('div', 'bf-article is-new');
            var feed = el('div', 'bf-article-feed');
            var fav = el('span', 'bf-fav');
            fav.style.setProperty('--bf-fav', item.color);
            feed.appendChild(fav);
            feed.appendChild(document.createTextNode(item.feed));
            feed.appendChild(el('span', 'bf-article-time', 'now'));
            row.appendChild(feed);
            row.appendChild(el('div', 'bf-article-title', item.title));
            row.appendChild(el('div', 'bf-article-excerpt', item.excerpt));
            return row;
        }

        window.setInterval(function () {
            if (document.hidden) { return; }
            var item = ARRIVALS[next % ARRIVALS.length];
            next++;
            var row = buildArticle(item);
            list.insertBefore(row, list.firstChild);
            void row.offsetWidth;   // reflow so the row animates open
            row.classList.remove('is-new');
            bump(total);
            bump(document.querySelector('[data-hero-feed="' + item.key + '"]'));
            // Rows pushed below the fold are clipped; drop them.
            while (list.children.length > HERO_ROWS) {
                list.removeChild(list.lastChild);
            }
        }, HERO_EVERY);
    }

    // ---------- Which option to choose in each reader app ----------
    function initApps() {
        var buttons = all(document, '[data-app]');
        if (!buttons.length) { return; }
        var tile = buttons[0].closest('.tile');
        var name = tile.querySelector('[data-choice-app]');
        var lead = name.parentNode;
        var pills = tile.querySelector('[data-choice-pills]');
        var note = tile.querySelector('[data-choice-note]');
        var shot = tile.querySelector('[data-choice-shot]');

        function show(btn) {
            var builtIn = btn.hasAttribute('data-shot');
            var label = btn.getAttribute('data-app');
            buttons.forEach(function (b) {
                var active = b === btn;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-pressed', active);
            });

            // "Something Else?" reads better as a sentence without its name.
            lead.textContent = '';
            if (builtIn) {
                lead.appendChild(document.createTextNode('In the '));
                lead.appendChild(el('strong', '', label));
            } else if (label.indexOf('?') !== -1) {
                lead.appendChild(document.createTextNode('In '));
                lead.appendChild(el('strong', '', 'any other app'));
                lead.appendChild(document.createTextNode(', choose'));
            } else {
                lead.appendChild(document.createTextNode('In '));
                lead.appendChild(el('strong', '', label));
                lead.appendChild(document.createTextNode(', choose'));
            }

            pills.textContent = '';
            btn.getAttribute('data-choose').split('|').forEach(function (option, i) {
                if (i > 0) { pills.appendChild(el('span', 'bf-or', 'or')); }
                pills.appendChild(el('span', 'bf-pill', option));
            });
            note.textContent = btn.getAttribute('data-note');
            shot.hidden = !builtIn;
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () { show(btn); });
        });
    }

    // ---------- Daily roundup: pick the delivery time ----------
    var ROUNDUPS = {
        am: {
            time: '6:00 AM',
            subject: 'What happened overnight',
            items: [
                { title: 'The keynote has a date',
                  text: 'Invitations went out late last night. Two of your feeds already have guesses about what is coming.',
                  from: 'Pixel Notes · The Tinkerer' },
                { title: 'A quiet update worth installing',
                  text: 'A small release fixed the sync bug people had been grumbling about all week.',
                  from: 'Slow Web Weekly' }
            ]
        },
        pm: {
            time: '5:00 PM',
            subject: 'What happened while you were working',
            items: [
                { title: 'Everything from this morning\'s keynote',
                  text: 'Three of your feeds covered it live. The short version: one surprise, and a lot of what was expected.',
                  from: 'Pixel Notes · The Tinkerer · Slow Web Weekly' },
                { title: 'Three small apps worth your weekend',
                  text: 'A calmer read for the train home, picked from the quieter corner of your feeds.',
                  from: 'Indie Dispatch' }
            ]
        }
    };

    function initRoundup() {
        var buttons = all(document, '[data-roundup]');
        if (!buttons.length) { return; }
        var tile = buttons[0].closest('.tile');
        var subject = tile.querySelector('[data-roundup-subject]');
        var time = tile.querySelector('[data-roundup-time]');
        var body = tile.querySelector('[data-roundup-body]');

        function render(data) {
            subject.textContent = data.subject;
            time.textContent = data.time;
            all(body, '.bf-brief').forEach(function (node) {
                body.removeChild(node);
            });
            data.items.forEach(function (item) {
                var brief = el('div', 'bf-brief');
                brief.appendChild(el('strong', '', item.title));
                brief.appendChild(el('p', '', item.text));
                brief.appendChild(el('span', '', item.from));
                body.appendChild(brief);
            });
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.classList.contains('is-active')) { return; }
                buttons.forEach(function (b) {
                    var active = b === btn;
                    b.classList.toggle('is-active', active);
                    b.setAttribute('aria-pressed', active);
                });
                var data = ROUNDUPS[btn.getAttribute('data-roundup')];
                if (reduceMotion.matches) {
                    render(data);
                    return;
                }
                // Fade the email out, swap it, fade the new one in.
                body.classList.add('is-swapping');
                window.setTimeout(function () {
                    render(data);
                    body.classList.remove('is-swapping');
                }, 180);
            });
        });
    }

    // ---------- Automations: switch a rule off and its action stops ----------
    function initRules() {
        all(document, '[data-rule]').forEach(function (rule) {
            var box = rule.querySelector('input[type="checkbox"]');
            var chip = rule.querySelector('.bf-chip');
            var label = chip.querySelector('span');

            function sync() {
                rule.classList.toggle('is-off', !box.checked);
                label.textContent = chip.getAttribute(box.checked ? 'data-on' : 'data-off');
            }

            box.addEventListener('change', sync);
            sync();
        });
    }

    // ---------- Keys: revoke one app without touching the others ----------
    function initKeys() {
        var keys = all(document, '[data-key]');
        if (!keys.length) { return; }
        var tile = keys[0].closest('.tile');
        var status = tile.querySelector('[data-key-status]');
        var reset = tile.querySelector('[data-key-reset]');

        function refresh() {
            var live = keys.filter(function (key) {
                return !key.classList.contains('is-revoked');
            }).length;
            status.textContent = live + (live === 1 ? ' app connected' : ' apps connected');
            reset.hidden = live === keys.length;
        }

        function setRevoked(key, revoked) {
            var meta = key.querySelector('.bf-key-meta');
            var btn = key.querySelector('[data-revoke]');
            key.classList.toggle('is-revoked', revoked);
            meta.textContent = revoked ? 'Revoked' : meta.getAttribute('data-used');
            btn.disabled = revoked;
            btn.textContent = revoked ? 'Revoked' : 'Revoke';
        }

        keys.forEach(function (key) {
            key.querySelector('[data-revoke]').addEventListener('click', function () {
                setRevoked(key, true);
                refresh();
                reset.focus();
            });
        });

        reset.addEventListener('click', function () {
            keys.forEach(function (key) { setRevoked(key, false); });
            refresh();
            keys[0].querySelector('[data-revoke]').focus();
        });
    }

    initHero();
    initApps();
    initRoundup();
    initRules();
    initKeys();
}());
