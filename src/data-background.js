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
//     preset, and removing the attribute (or adding -skip) unbinds.
//   - Reconciles param attributes LIVE: changing, adding, or removing
//     data-background-intensity (etc.) on a bound host updates the injected
//     element. Dataset edits (el.dataset.backgroundIntensity = …) are attribute
//     edits, so they count too.
//   - Heals ownership: if a framework re-render removes or replaces the
//     injected <bg-wc> while the host is still annotated, it is re-injected.
//
// SECURITY (gl-wc-ff9s): only an explicit ALLOWLIST of params is forwarded
// (see BINDER_PARAM_ATTRS). Sanitizers commonly let data-* attributes through,
// so forwarding every data-background-* suffix into setAttribute would turn
// data-background-onclick="…" into a live handler on the injected element.
// Anything outside the allowlist is dropped with a one-time console warning.
//
// Param keys mirror bg-wc attributes (kebab-case): data-background-intensity,
// data-background-speed, data-background-color-{1,2,3,bg,fg} (→ --bg-wc-color-*),
// and likewise data-bg-intensity, data-bg-speed, data-bg-color-*.
//
// stopWatching() disconnects the MutationObserver AND cancels the queued
// DOMContentLoaded startup if called before it fires, so nothing binds on its
// own afterwards; bindDataBackgrounds(root) is the explicit (idempotent) path.

import BgWc from './bg-wc.js';

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
const INJECTED_SELECTOR = ':scope > bg-wc[data-bg-element]';

// --- Allowlist ----------------------------------------------------------------
// Attributes forwarded verbatim to the injected element: every bg-wc observed
// attribute except `preset` (that's the data-background value itself), plus
// the free-text `text` payload. Derived from the element so the two never drift.
const FORWARDED_ATTRS = Object.freeze([
  ...BgWc.observedAttributes.filter((a) => a !== 'preset'),
  'text',
]);
// Color overrides become --bg-wc-color-* custom properties, not attributes.
const COLOR_TAILS = Object.freeze(['color-1', 'color-2', 'color-3', 'color-bg', 'color-fg']);
// The complete set of supported data-<ns>-<tail> params (kebab-case tails).
export const BINDER_PARAM_ATTRS = Object.freeze([...FORWARDED_ATTRS, ...COLOR_TAILS]);
const FORWARDED_SET = new Set(FORWARDED_ATTRS);
const COLOR_SET = new Set(COLOR_TAILS);

function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = STYLE;
  (document.head || document.documentElement).appendChild(s);
}

// The two accepted spellings. `attr` is the preset attribute, `skipAttr` the
// opt-out. data-background is checked first, so an element carrying both
// spellings resolves to it.
const SPELLINGS = [
  { attr: 'data-background', skipAttr: 'data-background-skip' },
  { attr: 'data-bg', skipAttr: 'data-bg-skip' },
];
const HOST_SELECTOR = SPELLINGS.map((s) => `[${s.attr}]`).join(', ');
const HOST_ATTRS = SPELLINGS.flatMap((s) => [s.attr, s.skipAttr]);
const HOST_ATTR_SET = new Set(HOST_ATTRS);
// Every param attribute, in both spellings — the observer's explicit filter.
const PARAM_ATTRS = SPELLINGS.flatMap((s) => BINDER_PARAM_ATTRS.map((t) => `${s.attr}-${t}`));
const WATCHED_ATTRS = [...HOST_ATTRS, ...PARAM_ATTRS];

// Resolve the preset name (and which spelling supplied it) from the host.
function resolve(el) {
  if (!el.hasAttribute) return null;
  for (const sp of SPELLINGS) {
    if (el.hasAttribute(sp.attr) && !el.hasAttribute(sp.skipAttr)) {
      return { preset: el.getAttribute(sp.attr), attr: sp.attr, skipAttr: sp.skipAttr };
    }
  }
  return null;
}

const warned = new Set();
function warnRejected(name) {
  if (warned.has(name)) return;
  warned.add(name);
  console.warn(
    `bg-wc data-background: ignoring unsupported attribute "${name}" — ` +
      `only these params are forwarded: ${BINDER_PARAM_ATTRS.join(', ')}`
  );
}

// Apply (or clear, when val is null) one allowlisted param on the injected element.
function applyParam(w, tail, val) {
  if (COLOR_SET.has(tail)) {
    if (val == null) w.style.removeProperty(`--bg-wc-${tail}`);
    else w.style.setProperty(`--bg-wc-${tail}`, val);
  } else if (FORWARDED_SET.has(tail)) {
    if (val == null) w.removeAttribute(tail);
    else w.setAttribute(tail, val);
  }
}

// Forward every data-<spelling>-<tail> param present on the host; reject the rest.
function applyAllParams(el, w, info) {
  const prefix = `${info.attr}-`;
  for (const { name, value } of Array.from(el.attributes)) {
    if (!name.startsWith(prefix) || name === info.skipAttr) continue;
    const tail = name.slice(prefix.length);
    if (!tail) continue;
    if (FORWARDED_SET.has(tail) || COLOR_SET.has(tail)) applyParam(w, tail, value);
    else warnRejected(name);
  }
}

function bindOne(el) {
  if (BOUND.has(el)) return;
  const info = resolve(el);
  if (!info || !info.preset) return;
  BOUND.add(el);

  // Adopt an injected element that is already there (manual re-bind after
  // stopWatching, a heal racing a rebind) instead of stacking a second one.
  let w = el.querySelector(INJECTED_SELECTOR);
  if (!w) {
    w = document.createElement('bg-wc');
    w.setAttribute('data-bg-element', '');
  }
  w.setAttribute('preset', info.preset);
  applyAllParams(el, w, info);
  if (w.parentNode !== el || el.firstChild !== w) el.insertBefore(w, el.firstChild);
}

function unbindOne(el) {
  el.querySelector(INJECTED_SELECTOR)?.remove();
  BOUND.delete(el);
}

// A host attribute (data-background / data-bg / their -skip) changed on `el`:
// bind, unbind, or re-point the injected element to match the new state.
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
  const w = el.querySelector(INJECTED_SELECTOR);
  if (w) w.setAttribute('preset', info.preset);
}

// A param attribute changed on a bound host: mirror it onto the injected element
// (only for the spelling that currently supplies the preset).
function reconcileParam(el, name) {
  if (!BOUND.has(el)) return;
  const info = resolve(el);
  if (!info) return;
  const prefix = `${info.attr}-`;
  if (!name.startsWith(prefix)) return;
  const w = el.querySelector(INJECTED_SELECTOR);
  if (!w) return;
  const tail = name.slice(prefix.length);
  if (FORWARDED_SET.has(tail) || COLOR_SET.has(tail)) applyParam(w, tail, el.getAttribute(name));
  else warnRejected(name);
}

// Our injected element left a host that is still bound and annotated (a
// framework re-render replaced the children): re-inject so ownership and the
// DOM agree again. Intentional removal goes through unbindOne, which clears
// BOUND first, so it never heals.
function healOne(host) {
  if (!host || host.nodeType !== 1 || !BOUND.has(host)) return;
  if (host.querySelector(INJECTED_SELECTOR)) return;
  BOUND.delete(host);
  bindOne(host);
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
      if (m.type === 'attributes') {
        if (HOST_ATTR_SET.has(m.attributeName)) reconcileOne(m.target);
        else reconcileParam(m.target, m.attributeName);
        continue;
      }
      for (const n of m.removedNodes) {
        if (n.nodeType === 1 && n.tagName === 'BG-WC' && n.hasAttribute('data-bg-element')) {
          healOne(m.target);
        }
      }
      for (const n of m.addedNodes) scanAndBind(n);
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

// Handle for the queued DOMContentLoaded startup, so stopWatching() can cancel
// it before it ever runs.
let startup = null;

export function stopWatching() {
  startup?.abort();
  startup = null;
  observer?.disconnect();
  observer = null;
}

if (typeof document !== 'undefined') {
  ensureStyle();
  if (document.readyState === 'loading') {
    startup = new AbortController();
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        startup = null;
        scanAndBind(document);
        startObserver();
      },
      { once: true, signal: startup.signal }
    );
  } else {
    scanAndBind(document);
    startObserver();
  }
}
