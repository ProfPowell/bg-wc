// Opt-in: bind <bg-wc> backgrounds to arbitrary elements via the
// data-background attribute (canonical) or the deprecated data-bg alias.
//
//   <section data-background="dither" data-background-intensity="0.7">
//     <h1>Hero content stays in the light DOM.</h1>
//   </section>
//
// Importing this file:
//   - Defines <bg-wc> (so you don't also have to import bg-wc.js).
//   - Installs a stylesheet that makes annotated elements a positioning host
//     and pushes the injected <bg-wc> behind their content via z-index: -1.
//   - Scans the document on DOMContentLoaded and binds each annotated element.
//   - Watches the DOM for dynamically added annotated nodes.
//
// Param keys mirror bg-wc attributes (kebab-case): data-background-intensity,
// data-background-speed, data-background-color-{1,2,3,bg,fg} (→ --bg-wc-color-*).
// The legacy data-bg / data-bg-* forms still work and warn once.

import './bg-wc.js';

const STYLE_ID = '__bg-wc-data-background-style';
const STYLE = `
[data-background]:not([data-background-skip]),
[data-bg]:not([data-bg-skip]) {
  position: relative;
  isolation: isolate;
}
[data-background]:not([data-background-skip]) > bg-wc[data-bg-element],
[data-bg]:not([data-bg-skip]) > bg-wc[data-bg-element] {
  position: absolute;
  inset: 0;
  z-index: -1;
  display: block;
  pointer-events: none;
}
`;

const BOUND = new WeakSet();
let warnedLegacy = false;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = STYLE;
  (document.head || document.documentElement).appendChild(s);
}

// camelCase remainder → kebab-case (after stripping the namespace segment):
//   intensity → intensity ; pixelRatio → pixel-ratio ; color1 → color-1
function camelToKebab(tail) {
  const t = tail.charAt(0).toLowerCase() + tail.slice(1);
  return t.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

// Resolve the preset name + the dataset namespace ('background' or legacy 'bg').
function resolve(el) {
  if (el.hasAttribute?.('data-background') && !el.hasAttribute('data-background-skip')) {
    return {
      preset: el.getAttribute('data-background'),
      ns: 'background',
      skipKey: 'backgroundSkip',
    };
  }
  if (el.hasAttribute?.('data-bg') && !el.hasAttribute('data-bg-skip')) {
    if (!warnedLegacy) {
      warnedLegacy = true;
      console.warn(
        'data-bg is deprecated and will be removed in a future major. Use data-background instead.'
      );
    }
    return { preset: el.getAttribute('data-bg'), ns: 'bg', skipKey: 'bgSkip' };
  }
  return null;
}

function bindOne(el) {
  if (BOUND.has(el)) return;
  const info = resolve(el);
  if (!info || !info.preset) return;
  BOUND.add(el);

  const w = document.createElement('bg-wc');
  w.setAttribute('data-bg-element', '');
  w.setAttribute('preset', info.preset);

  // Map data-<ns>-* → attribute or --bg-wc-color-* CSS var.
  const nsKey = info.ns; // 'background' | 'bg'
  for (const key of Object.keys(el.dataset)) {
    if (key === nsKey || key === info.skipKey) continue;
    if (!key.startsWith(nsKey)) continue;
    const tail = key.slice(nsKey.length);
    if (!tail) continue;
    const kebab = camelToKebab(tail);
    const val = el.dataset[key];
    if (kebab.startsWith('color-')) {
      w.style.setProperty(`--bg-wc-${kebab}`, val);
    } else {
      w.setAttribute(kebab, val);
    }
  }

  el.insertBefore(w, el.firstChild);
}

function scanAndBind(root) {
  if (!root) return;
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.matches?.('[data-background], [data-bg]')) bindOne(root);
  root.querySelectorAll?.('[data-background], [data-bg]').forEach(bindOne);
}

let observer = null;
function startObserver() {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) scanAndBind(n);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function bindDataBackgrounds(root = document) {
  ensureStyle();
  scanAndBind(root);
}

export function stopWatching() {
  observer?.disconnect();
  observer = null;
}

if (typeof document !== 'undefined') {
  ensureStyle();
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        scanAndBind(document);
        startObserver();
      },
      { once: true }
    );
  } else {
    scanAndBind(document);
    startObserver();
  }
}
