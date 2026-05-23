// Test-site driver: builds preset cards, wires per-card sliders, and the
// page-level theme / palette / motion selectors.

import '../src/gl-wc.js';
import { listPresets } from '../src/presets/index.js';

const grid = document.getElementById('grid');
const themeSel = document.getElementById('themeSelect');
const paletteSel = document.getElementById('paletteSelect');
const motionSel = document.getElementById('motionSelect');

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
  for (const range of card.querySelectorAll('input[type=range]')) {
    const val = range.parentElement.querySelector('.val');
    range.addEventListener('input', () => {
      el.setAttribute(range.dataset.attr, range.value);
      val.textContent = parseFloat(range.value).toFixed(2);
    });
  }
  return card;
}

for (const p of listPresets()) {
  grid.appendChild(makeCard(p));
}

themeSel.addEventListener('change', () => {
  document.documentElement.dataset.theme = themeSel.value;
});

paletteSel.addEventListener('change', () => {
  for (const el of document.querySelectorAll('gl-wc')) {
    el.setAttribute('palette', paletteSel.value);
  }
});

motionSel.addEventListener('change', () => {
  for (const el of document.querySelectorAll('gl-wc')) {
    el.setAttribute('motion', motionSel.value);
  }
});

// Log lifecycle events to the console for inspection.
addEventListener('error', (e) => console.error('[gl-wc page error]', e.error));
for (const el of document.querySelectorAll('gl-wc')) {
  el.addEventListener('gl-wc:ready', (e) => console.debug('[gl-wc:ready]', e.detail));
  el.addEventListener('gl-wc:error', (e) => console.warn('[gl-wc:error]', e.detail));
}
