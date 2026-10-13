/* TEMPORARY: heading font switcher for comparing options in the browser.
   Delete this file and its <script> tag once a font is chosen, and set the
   winner in pastry.css. MonoLisa is read from the fonts installed on this
   Mac, so it only shows up here, not for visitors. */
(function () {
    'use strict';

    var FONTS = [
        { key: 'atkinson', name: 'Atkinson Hyperlegible Next', family: "'Atkinson Hyperlegible Next'", weight: 700, tracking: '-0.03em' },
        { key: 'bricolage', name: 'Bricolage Grotesque', family: "'Bricolage Grotesque'", weight: 700, tracking: '-0.03em', google: 'Bricolage+Grotesque:opsz,wght@12..96,700' },
        { key: 'geist', name: 'Geist', family: "'Geist'", weight: 700, tracking: '-0.035em', google: 'Geist:wght@700' },
        { key: 'instrument', name: 'Instrument Sans', family: "'Instrument Sans'", weight: 700, tracking: '-0.03em', google: 'Instrument+Sans:wght@700' },
        { key: 'manrope', name: 'Manrope', family: "'Manrope'", weight: 800, tracking: '-0.035em', google: 'Manrope:wght@800' },
        { key: 'monolisa', name: 'MonoLisa (this Mac only)', family: "'MonoLisaText', 'MonoLisa Variable'", weight: 700, tracking: '-0.06em' },
        { key: 'fraunces', name: 'Fraunces (the old serif)', family: "'Fraunces'", weight: 600, tracking: '-0.02em', google: 'Fraunces:opsz,wght@9..144,600' }
    ];

    var STORAGE_KEY = 'pastry-font-preview';
    var loaded = {};

    function apply(key) {
        var font = FONTS.filter(function (f) { return f.key === key; })[0] || FONTS[0];
        if (font.google && !loaded[font.key]) {
            loaded[font.key] = true;
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=' + font.google + '&display=swap';
            document.head.appendChild(link);
        }
        var style = document.body.style;
        style.setProperty('--pz-display', font.family + ', var(--font-sans)');
        style.setProperty('--pz-display-weight', font.weight);
        style.setProperty('--pz-display-tracking', font.tracking);
        try { window.localStorage.setItem(STORAGE_KEY, font.key); } catch (e) { /* preview only */ }
        return font.key;
    }

    var saved = null;
    try { saved = window.localStorage.getItem(STORAGE_KEY); } catch (e) { /* preview only */ }

    var box = document.createElement('label');
    box.style.cssText = 'position:fixed;left:1rem;bottom:1rem;z-index:6000;display:flex;' +
        'flex-direction:column;gap:0.3rem;padding:0.7rem 0.9rem;border-radius:1rem;' +
        'background:#1d1d1f;color:#fff;font:600 0.75rem -apple-system,sans-serif;' +
        'box-shadow:0 10px 30px -10px rgba(0,0,0,0.5)';
    box.appendChild(document.createTextNode('Heading font (preview only)'));

    var select = document.createElement('select');
    select.style.cssText = 'font:inherit;font-size:0.85rem;padding:0.25rem;border-radius:0.4rem';
    FONTS.forEach(function (font) {
        var option = document.createElement('option');
        option.value = font.key;
        option.textContent = font.name;
        select.appendChild(option);
    });
    select.addEventListener('change', function () { apply(select.value); });
    box.appendChild(select);
    document.body.appendChild(box);

    select.value = apply(saved);
}());
