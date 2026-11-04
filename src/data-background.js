// Opt-in: bind <bg-wc> backgrounds to arbitrary elements via the
// data-background attribute — or its short twin, data-bg. Both spellings are
// first-class and equivalent; pick one per element.
//
//   <section data-background="dither" data-background-intensity="0.7">
//     <h1>Hero content stays in the light DOM.</h1>
//   </section>
//   <section data-bg="dither" data-bg-intensity="0.7">…</section>
//
// Importing this file:
//   - Defines <bg-wc> (so you don't also have to import bg-wc.js).
//   - Installs a stylesheet that makes annotated elements a positioning host
//     and pushes the injected <bg-wc> behind their content via z-index: -1.
//   - Scans the document on DOMContentLoaded and binds each annotated element.
//   - Watches the DOM for dynamically added annotated nodes AND for the
//     data-background / data-bg (and their -skip) attributes themselves: annotating
//     an existing element binds it, changing the value re-points the injected
//     preset, and removing the attribute (or adding -skip) unbinds. Param
//     attributes (data-background-intensity, …) are read once at bind time.
//
// Param keys mirror bg-wc attributes (kebab-case): data-background-intensity,
// data-background-speed, data-background-color-{1,2,3,bg,fg} (→ --bg-wc-color-*),
// and likewise data-bg-intensity, data-bg-speed, data-bg-color-*.

import './bg-wc.js';

const STYLE_ID = '__bg-wc-data-background-style';
// Injected defaults live in a cascade layer so any UNLAYERED author rule wins
// regardless of specificity — a host the page positions absolutely keeps that
// position; the binder's position:relative is only the fallback (gl-wc-aoi).
const STYLE = `
@layer bg-wc-binder {
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

// camelCase remainder → kebab-case (after stripping the namespace segment):
//   intensity → intensity ; pixelRatio → pixel-ratio ; color1 → color-1
function camelToKebab(tail) {
  const t = tail.charAt(0).toLowerCase() + tail.slice(1);
  return t.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

// The two accepted spellings. `attr` is the preset attribute, `ns` its
// dataset-key prefix (data-bg-intensity → dataset.bgIntensity), `skipKey` the
// dataset key of the opt-out attribute. data-background is checked first, so
// an element carrying both spellings resolves to it.
const SPELLINGS = [
  {
    attr: 'data-background',
    skipAttr: 'data-background-skip',
    ns: 'background',
    skipKey: 'backgroundSkip',
  },
  { attr: 'data-bg', skipAttr: 'data-bg-skip', ns: 'bg', skipKey: 'bgSkip' },
];
const HOST_SELECTOR = SPELLINGS.map((s) => `[${s.attr}]`).join(', ');
const WATCHED_ATTRS = SPELLINGS.flatMap((s) => [s.attr, s.skipAttr]);

// Resolve the preset name (and which spelling supplied it) from the host.
function resolve(el) {
  if (!el.hasAttribute) return null;
  for (const sp of SPELLINGS) {
    if (el.hasAttribute(sp.attr) && !el.hasAttribute(sp.skipAttr)) {
      return { preset: el.getAttribute(sp.attr), ns: sp.ns, skipKey: sp.skipKey };
    }
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

function unbindOne(el) {
  el.querySelector(':scope > bg-wc[data-bg-element]')?.remove();
  BOUND.delete(el);
}

// A watched attribute (data-background / data-bg / their -skip) changed on
// `el`: bind, unbind, or re-point the injected element to match the new state.
function reconcileOne(el) {
  const info = resolve(el);
  if (!info || !info.preset) {
    if (BOUND.has(el)) unbindOne(el);
    return;
  }
  if (!BOUND.has(el)) {
    bindOne(el);
    return;
  }
  const w = el.querySelector(':scope > bg-wc[data-bg-element]');
  if (w) w.setAttribute('preset', info.preset);
}

function scanAndBind(root) {
  if (!root) return;
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.matches?.(HOST_SELECTOR)) bindOne(root);
  root.querySelectorAll?.(HOST_SELECTOR).forEach(bindOne);
}

let observer = null;
function startObserver() {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes') reconcileOne(m.target);
      else for (const n of m.addedNodes) scanAndBind(n);
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: WATCHED_ATTRS,
  });
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
