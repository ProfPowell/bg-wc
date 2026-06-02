// Test-site driver: groups presets into tabs and mounts only the active
// group, so the page never holds more simultaneous WebGL contexts than the
// browser allows. Switching groups removes the old cards (each <bg-wc>'s
// disconnectedCallback frees its context) before mounting the new ones.

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
};

function makeCard({ name, renderer }) {
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
    <div class="card-stage">
      <bg-wc preset="${name}" intensity="0.6" speed="1" density="0.5"></bg-wc>
    </div>
    <div class="card-meta">
      <h4>${name}</h4>
      <span class="badge ${renderer}">${renderer}</span>
    </div>
    ${modesHtml}
    <div class="card-controls">
      <label><span>intensity</span>
        <input type="range" min="0" max="1" step="0.05" value="0.6" data-attr="intensity">
        <span class="val">0.60</span>
      </label>
      <label><span>speed</span>
        <input type="range" min="0" max="3" step="0.1" value="1" data-attr="speed">
        <span class="val">1.0</span>
      </label>
      <label><span>density</span>
        <input type="range" min="0" max="1" step="0.05" value="0.5" data-attr="density">
        <span class="val">0.50</span>
      </label>
    </div>
  `;
  const el = card.querySelector('bg-wc');
  // Inherit the current page-level motion selection.
  if (motionSel.value !== 'auto') el.setAttribute('motion', motionSel.value);
  for (const range of card.querySelectorAll('input[type=range]')) {
    const val = range.parentElement.querySelector('.val');
    range.addEventListener('input', () => {
      el.setAttribute(range.dataset.attr, range.value);
      val.textContent = parseFloat(range.value).toFixed(2);
    });
  }
  const pills = card.querySelectorAll('.mode-pill');
  for (const pill of pills) {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.setAttribute('aria-pressed', String(p === pill)));
      const v = pill.dataset.mode;
      if (v) el.setAttribute('mode', v);
      else el.removeAttribute('mode');
    });
  }
  return card;
}

function renderGroup(id) {
  for (const btn of tabsHost.querySelectorAll('.group-tab')) {
    btn.classList.toggle('active', btn.dataset.group === id);
    btn.setAttribute('aria-selected', btn.dataset.group === id ? 'true' : 'false');
  }
  // Removing the old cards first frees their WebGL contexts synchronously
  // (disconnectedCallback → loseContext) before the new group allocates.
  grid.replaceChildren();
  const group = groups.find((g) => g.id === id);
  if (!group) return;
  const frag = document.createDocumentFragment();
  for (const p of group.presets) frag.appendChild(makeCard(p));
  grid.appendChild(frag);
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
  for (const el of document.querySelectorAll('bg-wc')) el.setAttribute('motion', motionSel.value);
});

// Log lifecycle events for inspection.
addEventListener('error', (e) => console.error('[bg-wc page error]', e.error));
grid.addEventListener('bg-wc:error', (e) => console.warn('[bg-wc:error]', e.detail), true);
