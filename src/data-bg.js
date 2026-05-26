// Opt-in: bind <gl-wc> backgrounds to arbitrary elements via data-bg-* attributes.
//
//   <section data-bg="dither" data-bg-intensity="0.7" data-bg-speed="0.5">
//     <h1>Hero content stays in the light DOM.</h1>
//   </section>
//
// Importing this file:
//   - Defines the <gl-wc> element (so you don't also have to import gl-wc.js).
//   - Installs a stylesheet that makes [data-bg] elements a positioning host
//     and pushes the injected <gl-wc> behind their content via z-index: -1.
//   - Scans the document for [data-bg] on DOMContentLoaded and binds each.
//   - Watches the DOM for dynamically added [data-bg] nodes.
//
// All data-bg-* keys mirror gl-wc attributes (kebab-case), with the special
// data-bg-color-{1,2,3,bg,fg} keys mapping to --gl-wc-color-* overrides.
//
// Namespace `data-bg-*` is deliberately distinct from Vanilla Breeze's
// `data-effect`, so the two can coexist on the same element.

import './gl-wc.js';

const STYLE_ID = '__gl-wc-data-bg-style';
const STYLE = `
[data-bg]:not([data-bg-skip]) {
  position: relative;
  isolation: isolate;
}
[data-bg]:not([data-bg-skip]) > gl-wc[data-bg-element] {
  position: absolute;
  inset: 0;
  z-index: -1;
  display: block;
  pointer-events: none;
}
`;

const BOUND = new WeakSet();

function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = STYLE;
  (document.head || document.documentElement).appendChild(s);
}

// Convert camelCase remainder after "bg" → kebab-case.
//   bgIntensity   → intensity
//   bgPixelRatio  → pixel-ratio
//   bgColor1      → color-1
function dataKeyToAttr(camelTail) {
  const t = camelTail.charAt(0).toLowerCase() + camelTail.slice(1);
  return t.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

function bindOne(el) {
  if (BOUND.has(el)) return;
  if (!el.hasAttribute || !el.hasAttribute('data-bg')) return;
  if (el.hasAttribute('data-bg-skip')) return;
  const preset = el.getAttribute('data-bg');
  if (!preset) return;
  BOUND.add(el);

  const w = document.createElement('gl-wc');
  w.setAttribute('data-bg-element', '');
  w.setAttribute('preset', preset);

  // Map data-bg-* → attribute or --gl-wc-color-* CSS var.
  for (const key of Object.keys(el.dataset)) {
    if (key === 'bg' || key === 'bgSkip') continue;
    if (!key.startsWith('bg')) continue;
    const tail = key.slice(2);
    if (!tail) continue;
    const kebab = dataKeyToAttr(tail);
    const val = el.dataset[key];
    if (kebab.startsWith('color-')) {
      w.style.setProperty(`--gl-wc-${kebab}`, val);
    } else {
      w.setAttribute(kebab, val);
    }
  }

  el.insertBefore(w, el.firstChild);
}

function scanAndBind(root) {
  if (!root) return;
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.matches?.('[data-bg]')) bindOne(root);
  root.querySelectorAll?.('[data-bg]').forEach(bindOne);
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
