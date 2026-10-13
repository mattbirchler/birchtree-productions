/* nonogame - live feature demos.
   Loaded only by apps/nonogame/index.html, after app.js. The stepped demos
   (data-steps) are run by app.js; this file builds the boards and holds the
   interactive ones, including the playable practice puzzle in the hero. */
(function () {
    'use strict';

    if (!document.body || !document.body.classList.contains('calm-app')) {
        return;
    }

    function all(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // ---------- Puzzles ----------
    // Each is stored as its solution, and the clues are counted from that, so
    // a board can never disagree with its own numbers. All three have exactly
    // one solution and can be finished by line logic alone. `order` is the
    // order a line solver fills the squares in, used by the hint demo.
    var PUZZLES = {
        heart: {
            rows: ['01010', '11111', '11111', '01110', '00100']
        },
        mug: {
            rows: [
                '0010010000', '0001001000', '0010010000', '1111111000', '1111111110',
                '1111111001', '1111111001', '1111111110', '0111110000', '1111111111'
            ],
            order: [
                33, 34, 35, 36, 41, 42, 43, 44, 45, 46, 47, 48, 51, 52, 53, 54,
                55, 56, 61, 62, 63, 64, 65, 66, 71, 72, 73, 74, 75, 76, 77, 78,
                90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 30, 40, 31, 81, 2, 22,
                32, 82, 83, 84, 5, 25, 85, 50, 59, 60, 69, 70, 13, 16
            ]
        },
        house: {
            rows: [
                '0000110000', '0001111000', '0011111100', '0111111110', '1111111111',
                '0100000010', '0101101010', '0101100010', '0101100010', '0111111110'
            ]
        }
    };

    function clueFor(line) {
        var clue = [];
        var run = 0;
        line.forEach(function (on) {
            if (on) {
                run++;
            } else if (run) {
                clue.push(run);
                run = 0;
            }
        });
        if (run) { clue.push(run); }
        return clue.length ? clue : [0];
    }

    function el(tag, className) {
        var node = document.createElement(tag);
        if (className) { node.className = className; }
        return node;
    }

    function clueEl(clue, className) {
        var node = el('div', 'ng-clue ' + className);
        clue.forEach(function (n) {
            var span = el('span');
            span.textContent = n;
            node.appendChild(span);
        });
        return node;
    }

    // Builds a board inside `host`. Playable boards get a <button> per cell;
    // the others are plain decorative squares.
    function buildBoard(host, name, playable) {
        var rows = PUZZLES[name].rows;
        var n = rows.length;
        var board = {
            n: n,
            solution: [],
            cells: [],
            rowClues: [],
            colClues: [],
            rowNums: [],
            colNums: []
        };
        var r, c;

        for (r = 0; r < n; r++) {
            for (c = 0; c < n; c++) {
                board.solution.push(rows[r].charAt(c) === '1');
            }
        }

        var root = el('div', 'ng-board');
        root.style.setProperty('--ng-n', n);
        var cols = el('div', 'ng-cols');
        var rowsEl = el('div', 'ng-rows');
        var grid = el('div', 'ng-grid');

        for (c = 0; c < n; c++) {
            var colLine = [];
            for (r = 0; r < n; r++) { colLine.push(board.solution[r * n + c]); }
            board.colNums.push(clueFor(colLine));
            board.colClues.push(cols.appendChild(clueEl(board.colNums[c], 'ng-clue-col')));
        }

        for (r = 0; r < n; r++) {
            board.rowNums.push(clueFor(board.solution.slice(r * n, r * n + n)));
            board.rowClues.push(rowsEl.appendChild(clueEl(board.rowNums[r], 'ng-clue-row')));
            for (c = 0; c < n; c++) {
                var cell = el(playable ? 'button' : 'span', 'ng-cell');
                if (playable) { cell.type = 'button'; }
                if (c % 5 === 4 && c < n - 1) { cell.classList.add('ng-v5'); }
                if (r % 5 === 4 && r < n - 1) { cell.classList.add('ng-h5'); }
                cell.style.setProperty('--ng-i', r + c);
                board.cells.push(grid.appendChild(cell));
            }
        }

        root.appendChild(el('div'));
        root.appendChild(cols);
        root.appendChild(rowsEl);
        root.appendChild(grid);
        host.textContent = '';
        host.appendChild(root);
        board.grid = grid;
        return board;
    }

    function highlight(board, index) {
        var row = index === null ? -1 : Math.floor(index / board.n);
        var col = index === null ? -1 : index % board.n;
        board.rowClues.forEach(function (clue, i) { clue.classList.toggle('is-active', i === row); });
        board.colClues.forEach(function (clue, i) { clue.classList.toggle('is-active', i === col); });
    }

    // Restart a one-shot CSS animation class on a cell.
    function flash(cell, className) {
        cell.classList.remove(className);
        void cell.offsetWidth;
        cell.classList.add(className);
    }

    // ---------- Hero: the practice puzzle, playable ----------
    // Cell state: 0 empty, 1 filled, 2 crossed. Filling a square that is not
    // part of the picture bounces it back out, so a fill is always correct.
    var EMPTY = 0;
    var FILL = 1;
    var CROSS = 2;
    var STATE_NAMES = ['empty', 'filled', 'crossed'];

    function initPlay() {
        var host = document.querySelector('[data-ng-play]');
        if (!host) { return; }
        var wrap = host.closest('.ng-howto');
        var board = buildBoard(host, 'heart', true);
        var n = board.n;
        var state = board.cells.map(function () { return EMPTY; });
        var statusBox = wrap.querySelector('.ng-status');
        var statusText = wrap.querySelector('.ng-status-text');
        var playLink = wrap.querySelector('.ng-play-link');
        var undoBtn = wrap.querySelector('[data-ng-undo]');
        var redoBtn = wrap.querySelector('[data-ng-redo]');
        var modeBtns = all(wrap, '[data-ng-mode]');
        var startText = statusText.textContent;
        var mode = FILL;
        var history = [];
        var future = [];
        var stroke = null;      // { from, to, changes, seen } while a drag is in progress
        var mistakes = 0;
        var solved = false;

        board.grid.setAttribute('role', 'group');
        board.grid.setAttribute('aria-label', 'Practice puzzle, five by five. Arrow keys move between squares.');

        function describe(i) {
            var r = Math.floor(i / n);
            var c = i % n;
            return 'Row ' + (r + 1) + ', column ' + (c + 1) + ', ' + STATE_NAMES[state[i]] +
                '. Row clue ' + board.rowNums[r].join(' ') + ', column clue ' + board.colNums[c].join(' ');
        }

        function render(i) {
            var cell = board.cells[i];
            cell.classList.toggle('is-fill', state[i] === FILL);
            cell.classList.toggle('is-cross', state[i] === CROSS);
            cell.setAttribute('aria-pressed', state[i] === FILL);
            cell.setAttribute('aria-label', describe(i));
        }

        function lineDone(indexes) {
            return indexes.every(function (i) { return (state[i] === FILL) === board.solution[i]; });
        }

        function refresh() {
            var i, j, line;
            for (i = 0; i < n; i++) {
                line = [];
                for (j = 0; j < n; j++) { line.push(i * n + j); }
                board.rowClues[i].classList.toggle('is-done', lineDone(line));
                line = [];
                for (j = 0; j < n; j++) { line.push(j * n + i); }
                board.colClues[i].classList.toggle('is-done', lineDone(line));
            }
            undoBtn.disabled = solved || !history.length;
            redoBtn.disabled = solved || !future.length;

            var wasSolved = solved;
            solved = board.solution.every(function (on, k) { return (state[k] === FILL) === on; });
            if (solved && !wasSolved) { finish(); }
        }

        function say(text) {
            statusText.textContent = text;
        }

        function finish() {
            board.grid.classList.add('is-solved');
            statusBox.classList.add('is-solved');
            playLink.hidden = false;
            undoBtn.disabled = true;
            redoBtn.disabled = true;
            highlight(board, null);
            say(mistakes ? 'A heart. That is the whole game.' : 'A heart. That is the whole game, and you solved it clean.');
        }

        function set(i, value) {
            state[i] = value;
            render(i);
        }

        // Apply the current stroke to one cell. Returns nothing; records the
        // change so the whole drag undoes as one move.
        function touch(i) {
            if (solved || !stroke || state[i] !== stroke.from || stroke.seen[i]) { return; }
            stroke.seen[i] = true;
            if (stroke.to === FILL && !board.solution[i]) {
                mistakes++;
                flash(board.cells[i], 'is-wrong');
                say('Not that one. Wrong squares bounce back out.');
                return;
            }
            stroke.changes.push({ i: i, from: state[i], to: stroke.to });
            set(i, stroke.to);
            refresh();
        }

        function begin(i) {
            var target = mode === FILL ? FILL : CROSS;
            stroke = {
                from: state[i],
                to: state[i] === target ? EMPTY : target,
                changes: [],
                seen: {}
            };
            touch(i);
        }

        function end() {
            if (!stroke) { return; }
            if (stroke.changes.length) {
                history.push(stroke.changes);
                future = [];
            }
            stroke = null;
            refresh();
        }

        function focusCell(i) {
            board.cells.forEach(function (cell, k) { cell.tabIndex = k === i ? 0 : -1; });
        }

        function cellIndex(node) {
            var cell = node && node.closest ? node.closest('.ng-cell') : null;
            return cell ? board.cells.indexOf(cell) : -1;
        }

        // Pointer: press to start a stroke, drag to carry it across a run.
        board.grid.addEventListener('pointerdown', function (event) {
            var i = cellIndex(event.target);
            if (i === -1 || event.button > 0) { return; }
            focusCell(i);
            begin(i);
        });

        document.addEventListener('pointermove', function (event) {
            if (!stroke) { return; }
            var i = cellIndex(document.elementFromPoint(event.clientX, event.clientY));
            if (i !== -1) {
                highlight(board, i);
                touch(i);
            }
        });

        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);

        // Keyboard and assistive tech arrive as a click with no pointer.
        board.grid.addEventListener('click', function (event) {
            var i = cellIndex(event.target);
            if (i === -1 || event.detail !== 0) { return; }
            begin(i);
            end();
        });

        board.grid.addEventListener('keydown', function (event) {
            var i = cellIndex(event.target);
            var moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n };
            var step = moves[event.key];
            if (i === -1 || !step) { return; }
            event.preventDefault();
            var next = i + step;
            var sameRow = Math.floor(next / n) === Math.floor(i / n);
            if (next < 0 || next >= n * n || (Math.abs(step) === 1 && !sameRow)) { return; }
            focusCell(next);
            board.cells[next].focus();
        });

        // The crosshair: the clues for the square under the pointer or focus.
        board.grid.addEventListener('pointerover', function (event) {
            var i = cellIndex(event.target);
            if (i !== -1 && !solved) { highlight(board, i); }
        });
        board.grid.addEventListener('pointerleave', function () {
            if (!stroke) { highlight(board, null); }
        });
        board.grid.addEventListener('focusin', function (event) {
            var i = cellIndex(event.target);
            if (i !== -1 && !solved) { highlight(board, i); }
        });
        board.grid.addEventListener('focusout', function () { highlight(board, null); });

        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                mode = btn.getAttribute('data-ng-mode') === 'cross' ? CROSS : FILL;
                modeBtns.forEach(function (other) {
                    other.setAttribute('aria-pressed', other === btn);
                });
            });
        });

        function replay(from, to, backwards) {
            var changes = from.pop();
            if (!changes) { return; }
            changes.forEach(function (change) {
                set(change.i, backwards ? change.from : change.to);
            });
            to.push(changes);
            refresh();
        }

        undoBtn.addEventListener('click', function () { replay(history, future, true); });
        redoBtn.addEventListener('click', function () { replay(future, history, false); });

        wrap.querySelector('[data-ng-reset]').addEventListener('click', function () {
            history = [];
            future = [];
            mistakes = 0;
            solved = false;
            board.grid.classList.remove('is-solved');
            statusBox.classList.remove('is-solved');
            playLink.hidden = true;
            state.forEach(function (value, i) { set(i, EMPTY); });
            say(startText);
            refresh();
        });

        state.forEach(function (value, i) { render(i); });
        focusCell(0);
        refresh();
    }

    // ---------- Today's three: pick a size ----------
    function initSizes() {
        var buttons = all(document, '[data-ng-size]');
        if (!buttons.length) { return; }
        var caption = document.querySelector('[data-ng-size-caption]');

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                buttons.forEach(function (other) {
                    other.setAttribute('aria-pressed', other === btn);
                });
                caption.textContent = btn.getAttribute('data-ng-size');
            });
        });
    }

    // ---------- Hint: one square you could have worked out ----------
    // The board starts with the squares a solver finds first. Each hint is the
    // next square in the solver's order, so it always follows from the clues.
    var HINT_START = 42;
    var HINT_CROSSES = [80, 37, 57, 67, 87];

    function initHint() {
        var host = document.querySelector('[data-ng-hint-board]');
        if (!host) { return; }
        var tile = host.closest('.tile');
        var board = buildBoard(host, 'mug', false);
        var order = PUZZLES.mug.order;
        var hintBtn = tile.querySelector('[data-ng-hint]');
        var resetBtn = tile.querySelector('[data-ng-hint-reset]');
        var note = tile.querySelector('[data-ng-hint-note]');
        var startNote = note.textContent;
        var given = HINT_START;

        function reset() {
            given = HINT_START;
            board.cells.forEach(function (cell, i) {
                cell.classList.remove('is-hinted');
                cell.classList.toggle('is-fill', order.indexOf(i) !== -1 && order.indexOf(i) < HINT_START);
                cell.classList.toggle('is-cross', HINT_CROSSES.indexOf(i) !== -1);
            });
            highlight(board, null);
            hintBtn.disabled = false;
            note.textContent = startNote;
        }

        hintBtn.addEventListener('click', function () {
            if (given >= order.length) { return; }
            var i = order[given++];
            var left = order.length - given;
            board.cells[i].classList.add('is-fill');
            flash(board.cells[i], 'is-hinted');
            highlight(board, i);
            if (left) {
                note.textContent = 'Row ' + (Math.floor(i / board.n) + 1) + ', column ' + (i % board.n + 1) +
                    '. ' + left + (left === 1 ? ' square' : ' squares') + ' to go.';
            } else {
                note.textContent = 'That was the last one. A cup of coffee.';
                hintBtn.disabled = true;
                highlight(board, null);
            }
        });

        resetBtn.addEventListener('click', reset);
        reset();
    }

    // ---------- Day and night ----------
    // The real board follows the system theme. Here it starts on whatever this
    // device is using, and the two buttons stand in for the system setting.
    var THEME_FILLS = [
        24, 25, 32, 33, 34, 35, 36, 37, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        92, 93, 94, 95, 96, 97, 31, 51, 61, 13, 23, 63, 73, 83, 4, 14, 64, 74, 84
    ];
    var THEME_CROSSES = [0, 10, 20, 30, 50, 60, 70, 80, 90, 9, 19, 29, 39];

    function initTheme() {
        var host = document.querySelector('[data-ng-theme-board]');
        if (!host) { return; }
        var sheet = host.closest('.ng-paper');
        var buttons = all(host.closest('.tile'), '[data-ng-theme]');
        var board = buildBoard(host, 'house', false);

        THEME_FILLS.forEach(function (i) { board.cells[i].classList.add('is-fill'); });
        THEME_CROSSES.forEach(function (i) { board.cells[i].classList.add('is-cross'); });

        function apply(theme) {
            sheet.classList.toggle('is-dark', theme === 'dark');
            buttons.forEach(function (btn) {
                btn.setAttribute('aria-pressed', btn.getAttribute('data-ng-theme') === theme);
            });
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () { apply(btn.getAttribute('data-ng-theme')); });
        });

        apply(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    initPlay();
    initSizes();
    initHint();
    initTheme();
}());
