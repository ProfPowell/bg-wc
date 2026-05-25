// Test-site driver: groups presets into tabs and mounts only the active
// group, so the page never holds more simultaneous WebGL contexts than the
// browser allows. Switching groups removes the old cards (each <gl-wc>'s
// disconnectedCallback frees its context) before mounting the new ones.

import 'vanilla-breeze';
import 'vanilla-breeze/css';
import '@profpowell/code-block';
import '../src/gl-wc.js';
import { listGroups } from '../src/presets/index.js';

// Theme + light/dark are driven entirely through vanilla-breeze's own model:
// data-theme selects the brand palette, data-mode selects light/dark/auto.
// vanilla-breeze observes those attributes and lazy-loads the matching theme
// CSS from window.__VB_THEME_BASE (set in the page <head>; served by the
// vb-themes plugin in vite.site.config.js). gl-wc then reads the resulting
// --color-* tokens via shadow-DOM inheritance.

const grid = document.getElementById('grid');
const tabsHost = document.getElementById('groupTabs');
const themeSel = document.getElementById('themeSelect');
const modeSel = document.getElementById('modeSelect');
const paletteSel = document.getElementById('paletteSelect');
const motionSel = document.getElementById('motionSelect');

const groups = listGroups();

function makeCard({ name, renderer }) {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-stage">
      <gl-wc preset="${name}" intensity="0.6" speed="1" density="0.5"></gl-wc>
    </div>
    <div class="card-meta">
      <h4>${name}</h4>
      <span class="badge ${renderer}">${renderer}</span>
    </div>
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
  const el = card.querySelector('gl-wc');
  // Inherit the current page-level palette / motion selections.
  if (paletteSel.value !== 'theme') el.setAttribute('palette', paletteSel.value);
  if (motionSel.value !== 'auto') el.setAttribute('motion', motionSel.value);
  for (const range of card.querySelectorAll('input[type=range]')) {
    const val = range.parentElement.querySelector('.val');
    range.addEventListener('input', () => {
      el.setAttribute(range.dataset.attr, range.value);
      val.textContent = parseFloat(range.value).toFixed(2);
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

// vanilla-breeze resets data-mode to the system default during its own init
// (which can run after this module), so assert the gallery's chosen default
// appearance from the controls, and re-assert once after load so dark wins.
// Switching themes/modes afterward just updates the attributes; VB's observer
// loads the theme CSS and applies the light/dark tokens.
function applyAppearance() {
  document.documentElement.dataset.theme = themeSel.value;
  document.documentElement.dataset.mode = modeSel.value;
}
applyAppearance();
window.addEventListener('load', applyAppearance);

themeSel.addEventListener('change', () => {
  document.documentElement.dataset.theme = themeSel.value;
});
modeSel.addEventListener('change', () => {
  document.documentElement.dataset.mode = modeSel.value;
});
paletteSel.addEventListener('change', () => {
  for (const el of document.querySelectorAll('gl-wc')) el.setAttribute('palette', paletteSel.value);
});
motionSel.addEventListener('change', () => {
  for (const el of document.querySelectorAll('gl-wc')) el.setAttribute('motion', motionSel.value);
});

// Log lifecycle events for inspection.
addEventListener('error', (e) => console.error('[gl-wc page error]', e.error));
grid.addEventListener('gl-wc:error', (e) => console.warn('[gl-wc:error]', e.detail), true);
