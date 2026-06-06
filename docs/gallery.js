// Test-site driver: groups presets into tabs and mounts only the active group.
// Within a group, each card mounts its <bg-wc> LAZILY — only when its stage is
// at/near the viewport — and unmounts (freeing the WebGL context) when scrolled
// away. A hard MAX_LIVE budget caps how many backgrounds run at once. Together
// this keeps the page well under the browser's ~16 live-WebGL-context limit, so
// large groups plus the persistent hero context
// no longer overflow and leave cards blank. Mounting happens in the
// IntersectionObserver callback — a frame after the outgoing group's teardown —
// which also removes the allocate-before-free spike during a group switch.

import 'vanilla-breeze';
import 'vanilla-breeze/css';
import '@profpowell/code-block';
import '../src/bg-wc.js';
import { listGroups } from '../src/presets/index.js';
import './prefer-dark.js';

// Theme + light/dark are owned by vanilla-breeze's <theme-picker> (accent color
// + Auto/Light/Dark + density), which persists the visitor's choice. bg-wc just
// reads the resulting --color-* tokens via shadow-DOM inheritance. We only nudge
// the first-load default to dark (where the presets look most vivid) — see below.
// `motion` below is a bg-wc-specific attribute, not VB theming.

const grid = document.getElementById('grid');
const tabsHost = document.getElementById('groupTabs');
const motionSel = document.getElementById('motionSelect');

const groups = listGroups();

// Most live WebGL backgrounds allowed at once. Headroom below the browser's
// ~16 live-WebGL-context limit for the persistent hero context and the brief
// overlap while an outgoing group's contexts are still being reclaimed. Only
// WebGL presets count toward this — Canvas2D cards hold no GPU context, so they
// always mount when visible (and never get starved by the budget).
const MAX_WEBGL = 8;
// Preload distance: a card within this margin of the viewport mounts early so
// it's already running by the time it scrolls fully into view.
const ROOT_MARGIN = '300px';

// Presets that take a `mode` attribute expose it as pills on the card so the
// variants are discoverable. The first option must match the preset's own
// default (so the initially-pressed pill is honest). An empty value clears the
// attribute (the preset's no-mode default).
const MODE_OPTIONS = {
  'fly-through': [
    { label: 'orbit', value: 'ring straight cube' },
    { label: 'fly', value: 'ring straight cube fly' },
    { label: 'tube', value: 'tube straight card' },
    { label: 'helix', value: 'hex helix sphere' },
  ],
  explode: [
    { label: 'radial', value: 'radial' },
    { label: 'cube', value: 'cube' },
  ],
  mosaic: [
    { label: 'isometric', value: 'isometric' },
    { label: 'flat', value: 'flat' },
    { label: 'sparse', value: 'sparse' },
    { label: 'stacked', value: 'stacked' },
  ],
  doodles: [
    { label: 'all', value: '' },
    { label: 'planner', value: 'planner' },
    { label: 'botanical', value: 'botanical' },
    { label: 'geometric', value: 'geometric' },
  ],
  girih: [
    { label: '8-fold', value: '8fold' },
    { label: '12-fold', value: '12fold' },
    { label: '6-fold', value: '6fold' },
  ],
  atomic: [
    { label: 'mixed', value: 'mixed' },
    { label: 'boomerangs', value: 'boomerangs' },
    { label: 'starbursts', value: 'starbursts' },
    { label: 'harlequin', value: 'harlequin' },
  ],
  'op-art': [
    { label: 'riley', value: 'riley' },
    { label: 'cafewall', value: 'cafewall' },
    { label: 'moire', value: 'moire' },
    { label: 'drift', value: 'drift' },
  ],
};

// Per-card state lives here so a card's <bg-wc> can be torn down and rebuilt
// (as it scrolls in and out) without losing the visitor's slider/mode choices.
const stateOf = new WeakMap(); // card → { name, stage, attrs, mode, el }
const visible = new Set(); // cards currently intersecting (incl. preload margin)
const liveCards = new Set(); // cards whose <bg-wc> is currently mounted

// Per-preset starting values for the card controls. Most presets look right at
// the shared defaults below; a few subtle overlay presets (e.g. paper-grain) are
// intentionally faint and read as blank at intensity 0.6, so the gallery
// showcases them stronger. This only changes the card's initial slider values —
// the preset's own attribute defaults are untouched.
const CARD_DEFAULTS = {
  'paper-grain': { intensity: 1 },
};
const BASE_DEFAULTS = { intensity: 0.6, speed: 1, density: 0.5 };

// Faint light-grain overlays are designed for darker pages and vanish on a white
// theme. Give their cards a fixed dark stage backdrop so the effect is visible
// whatever theme the visitor is on. (Gallery-only — the presets are unchanged.)
const DARK_STAGE = new Set(['paper-grain', 'grain']);

function makeCard({ name, renderer }) {
  const def = { ...BASE_DEFAULTS, ...CARD_DEFAULTS[name] };
  const modes = MODE_OPTIONS[name];
  const modesHtml = modes
    ? `<div class="card-modes" role="group" aria-label="${name} mode">${modes
        .map(
          (m, i) =>
            `<button type="button" class="mode-pill" data-mode="${m.value}" aria-pressed="${i === 0}">${m.label}</button>`
        )
        .join('')}</div>`
    : '';
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-stage"></div>
    <div class="card-meta">
      <h4>${name}</h4>
      <span class="badge ${renderer}">${renderer}</span>
    </div>
    ${modesHtml}
    <div class="card-controls">
      <label><span>intensity</span>
        <input type="range" min="0" max="1" step="0.05" value="${def.intensity}" data-attr="intensity">
        <span class="val">${def.intensity.toFixed(2)}</span>
      </label>
      <label><span>speed</span>
        <input type="range" min="0" max="3" step="0.1" value="${def.speed}" data-attr="speed">
        <span class="val">${def.speed.toFixed(1)}</span>
      </label>
      <label><span>density</span>
        <input type="range" min="0" max="1" step="0.05" value="${def.density}" data-attr="density">
        <span class="val">${def.density.toFixed(2)}</span>
      </label>
    </div>
  `;
  if (DARK_STAGE.has(name)) card.querySelector('.card-stage').classList.add('stage-dark');
  const state = {
    name,
    renderer,
    stage: card.querySelector('.card-stage'),
    attrs: { intensity: String(def.intensity), speed: String(def.speed), density: String(def.density) },
    mode: modes ? modes[0].value : null,
    el: null,
  };
  stateOf.set(card, state);

  // Controls update the persisted state and the live element (if mounted).
  for (const range of card.querySelectorAll('input[type=range]')) {
    const val = range.parentElement.querySelector('.val');
    range.addEventListener('input', () => {
      state.attrs[range.dataset.attr] = range.value;
      if (state.el) state.el.setAttribute(range.dataset.attr, range.value);
      val.textContent = parseFloat(range.value).toFixed(2);
    });
  }
  const pills = card.querySelectorAll('.mode-pill');
  for (const pill of pills) {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.setAttribute('aria-pressed', String(p === pill)));
      state.mode = pill.dataset.mode;
      if (state.el) {
        if (state.mode) state.el.setAttribute('mode', state.mode);
        else state.el.removeAttribute('mode');
      }
    });
  }
  return card;
}

function mountCard(card) {
  const state = stateOf.get(card);
  if (!state || state.el) return;
  const el = document.createElement('bg-wc');
  el.setAttribute('preset', state.name);
  for (const [k, v] of Object.entries(state.attrs)) el.setAttribute(k, v);
  if (state.mode) el.setAttribute('mode', state.mode);
  if (motionSel.value !== 'auto') el.setAttribute('motion', motionSel.value);
  state.stage.appendChild(el);
  state.el = el;
  liveCards.add(card);
}

function unmountCard(card) {
  const state = stateOf.get(card);
  if (!state || !state.el) return;
  state.el.remove(); // disconnectedCallback → loseContext frees the GPU context
  state.el = null;
  liveCards.delete(card);
}

// Distance from a card to the viewport: 0 if it's on screen, otherwise the gap
// to the nearest edge. On-screen cards therefore all rank ahead of cards that
// are only inside the preload margin.
function viewportDistance(card) {
  const vh = window.innerHeight || 1;
  const r = card.getBoundingClientRect();
  if (r.bottom < 0) return -r.bottom;
  if (r.top > vh) return r.top - vh;
  return 0;
}

// Reconcile the live set. Visible Canvas2D cards always mount (no GPU context to
// budget). Visible WebGL cards mount nearest-the-viewport first, up to
// MAX_WEBGL — so whatever a visitor scrolls to wins the budget over cards that
// are only marginally on-screen, and the page never holds too many shaders.
// Unwanted live cards are unmounted first (freeing contexts) before new ones
// mount, so we never transiently exceed the budget.
function reconcile() {
  const vis = [...grid.querySelectorAll('.card')].filter((c) => visible.has(c));
  const desiredSet = new Set();
  const webgl = [];
  for (const card of vis) {
    if (stateOf.get(card).renderer === 'webgl') webgl.push(card);
    else desiredSet.add(card); // Canvas2D / CSS3D — cheap, always show when visible
  }
  webgl.sort((a, b) => viewportDistance(a) - viewportDistance(b));
  for (const card of webgl.slice(0, MAX_WEBGL)) desiredSet.add(card);
  for (const card of [...liveCards]) if (!desiredSet.has(card)) unmountCard(card);
  for (const card of desiredSet) mountCard(card);
}

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target);
      else visible.delete(e.target);
    }
    reconcile();
  },
  { root: null, rootMargin: ROOT_MARGIN, threshold: 0 }
);

function renderGroup(id) {
  for (const btn of tabsHost.querySelectorAll('.group-tab')) {
    btn.classList.toggle('active', btn.dataset.group === id);
    btn.setAttribute('aria-selected', btn.dataset.group === id ? 'true' : 'false');
  }
  // Tear down the outgoing group: stop observing, free every live context, and
  // drop the cards. The new group's cards mount later (async IO callback), so
  // old contexts are released before new ones allocate.
  io.disconnect();
  for (const card of [...liveCards]) unmountCard(card);
  visible.clear();
  grid.replaceChildren();

  const group = groups.find((g) => g.id === id);
  if (!group) return;
  const frag = document.createDocumentFragment();
  const cards = group.presets.map((p) => makeCard(p));
  for (const card of cards) frag.appendChild(card);
  grid.appendChild(frag);
  for (const card of cards) io.observe(card);
}

// Build the group tabs.
for (const g of groups) {
  const btn = document.createElement('button');
  btn.className = 'group-tab';
  btn.type = 'button';
  btn.dataset.group = g.id;
  btn.setAttribute('role', 'tab');
  btn.innerHTML = `${g.label} <span class="count">${g.presets.length}</span>`;
  btn.addEventListener('click', () => renderGroup(g.id));
  tabsHost.appendChild(btn);
}

renderGroup(groups[0].id);
motionSel.addEventListener('change', () => {
  // Hero + every live card. Unmounted cards pick it up via state on next mount.
  for (const el of document.querySelectorAll('bg-wc')) el.setAttribute('motion', motionSel.value);
});

// Log lifecycle events for inspection.
addEventListener('error', (e) => console.error('[bg-wc page error]', e.error));
grid.addEventListener('bg-wc:error', (e) => console.warn('[bg-wc:error]', e.detail), true);
